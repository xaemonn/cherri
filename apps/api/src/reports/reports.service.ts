import { GoneException, Inject, Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import {
  addDays,
  FAMILY_CONDITION_LABELS,
  fromUTCDate,
  toFhirBundle,
  toUTCDate,
  type CreateReportInput,
  type FamilyCondition,
  type FhirBundle,
  type ReportBackground,
  type ShareAccessItem,
  type ShareCreated,
  type ShareListItem,
  type ShareView,
} from '@cherri/shared';
import QRCode from 'qrcode';
import { AuditService } from '../common/audit.service';
import { CryptoService } from '../common/crypto.service';
import { phoneReachableUrl } from '../common/network';
import { PrismaService } from '../common/prisma.service';
import { ENV, type Env } from '../config/env';
import { InsightsService, type HealthSnapshot } from '../insights/insights.service';
import { MindService } from '../screenings/mind.service';
import { ScreeningsService } from '../screenings/screenings.service';
import { MedicationsService } from '../visit/medications.service';
import { StoryService } from '../visit/story.service';
import { buildDoctorReport, type DoctorReport } from './report-builder';

@Injectable()
export class ReportsService implements OnModuleInit {
  private readonly logger = new Logger(ReportsService.name);
  private shareBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
    private readonly insights: InsightsService,
    private readonly screenings: ScreeningsService,
    private readonly mind: MindService,
    private readonly medications: MedicationsService,
    private readonly stories: StoryService,
    @Inject(ENV) private readonly env: Env,
  ) {
    this.shareBaseUrl = env.WEB_URL.replace(/\/$/, '');
  }

  /** In local dev a localhost QR is useless on a phone, so share links point at the laptop's Wi-Fi address. */
  async onModuleInit(): Promise<void> {
    if (this.env.NODE_ENV !== 'development') return;
    this.shareBaseUrl = await phoneReachableUrl(this.shareBaseUrl);
    this.logger.log(`Share links and QR codes use ${this.shareBaseUrl}`);
  }

  async preview(userId: string, options: Pick<CreateReportInput, 'rangeDays' | 'includeNotes'>): Promise<DoctorReport> {
    const [snap, screenings, story, medications, mindChecks] = await Promise.all([
      this.insights.snapshot(userId),
      this.screenings.latestByType(userId),
      this.stories.forReport(userId),
      this.medications.forReport(userId),
      this.mind.forReport(userId),
    ]);
    const [notes, moodShifts] = await Promise.all([
      options.includeNotes ? this.recentNotes(userId, addDays(snap.today, -options.rangeDays + 1)) : Promise.resolve([]),
      this.insights.moodShifts(snap),
    ]);
    return buildDoctorReport(snap, screenings, {
      rangeDays: options.rangeDays,
      notes,
      story,
      medications,
      background: this.background(snap),
      moodShifts,
      mindChecks,
    });
  }

  /** The same report as an HL7 FHIR R4 bundle, for hospital systems and ABDM-style health lockers. */
  async fhir(userId: string, rangeDays: number): Promise<FhirBundle> {
    return toFhirBundle(await this.preview(userId, { rangeDays, includeNotes: false }));
  }

  /**
   * Freezes the report as it is right now and returns a one-off link plus QR code.
   * Only a hash of the token is stored, so a database leak can't be used to open reports.
   */
  async createShare(userId: string, input: CreateReportInput, ip?: string): Promise<ShareCreated> {
    const report = await this.preview(userId, input);
    const token = CryptoService.randomToken(24);
    const expiresAt = new Date(Date.now() + input.expiresInHours * 3_600_000);
    const link = await this.prisma.shareLink.create({
      data: {
        userId,
        tokenHash: CryptoService.sha256(token),
        snapshot: this.crypto.encryptJson(report),
        expiresAt,
        maxViews: input.maxViews,
      },
    });
    const url = `${this.shareBaseUrl}/share/${token}`;
    await this.audit.record('SHARE_CREATED', { userId, ip, meta: { shareId: link.id, expiresInHours: input.expiresInHours } });
    return {
      id: link.id,
      url,
      token,
      expiresAt: expiresAt.toISOString(),
      maxViews: link.maxViews,
      qrCode: await QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: '#2B1B12', light: '#FFFFFF' } }),
      report,
    };
  }

  async list(userId: string): Promise<ShareListItem[]> {
    const links = await this.prisma.shareLink.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
    const now = new Date();
    return links.map((l) => ({
      id: l.id,
      createdAt: l.createdAt.toISOString(),
      expiresAt: l.expiresAt.toISOString(),
      revokedAt: l.revokedAt?.toISOString() ?? null,
      viewCount: l.viewCount,
      maxViews: l.maxViews,
      lastViewedAt: l.lastViewedAt?.toISOString() ?? null,
      active: !l.revokedAt && l.expiresAt > now && (l.maxViews === null || l.viewCount < l.maxViews),
    }));
  }

  async accesses(userId: string, id: string): Promise<ShareAccessItem[]> {
    await this.findOwned(userId, id);
    const rows = await this.prisma.shareAccess.findMany({ where: { shareLinkId: id }, orderBy: { viewedAt: 'desc' } });
    return rows.map((a) => ({ viewedAt: a.viewedAt.toISOString(), userAgent: a.userAgent }));
  }

  async revoke(userId: string, id: string, ip?: string): Promise<void> {
    await this.findOwned(userId, id);
    await this.prisma.shareLink.update({ where: { id }, data: { revokedAt: new Date() } });
    await this.audit.record('SHARE_REVOKED', { userId, ip, meta: { shareId: id } });
  }

  /** Public: what a doctor sees after scanning the QR code. Every view is logged for the patient. */
  async view(token: string, meta: { ip?: string; userAgent?: string }): Promise<ShareView> {
    const link = await this.prisma.shareLink.findUnique({ where: { tokenHash: CryptoService.sha256(token) } });
    if (!link) throw new NotFoundException({ code: 'SHARE_NOT_FOUND', message: 'This report link is not valid.' });

    const gone = (message: string) => new GoneException({ code: 'SHARE_EXPIRED', message });
    if (link.revokedAt) throw gone('The patient has turned off this link.');
    if (link.expiresAt <= new Date()) throw gone('This report link has expired. Ask the patient for a new one.');

    // Conditional increment keeps the view limit exact under concurrent requests.
    const { count } = await this.prisma.shareLink.updateMany({
      where: { id: link.id, ...(link.maxViews !== null && { viewCount: { lt: link.maxViews } }) },
      data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
    });
    if (count === 0) throw gone('This report link has reached its view limit.');

    await this.prisma.shareAccess.create({
      data: { shareLinkId: link.id, ipHash: this.crypto.hashIp(meta.ip), userAgent: meta.userAgent?.slice(0, 200) },
    });
    await this.audit.record('SHARE_VIEWED', { userId: link.userId, ip: meta.ip, meta: { shareId: link.id } });

    return {
      report: this.crypto.decryptJson<DoctorReport>(link.snapshot),
      expiresAt: link.expiresAt.toISOString(),
      viewsRemaining: link.maxViews === null ? null : link.maxViews - link.viewCount - 1,
    };
  }

  private async findOwned(userId: string, id: string) {
    const link = await this.prisma.shareLink.findFirst({ where: { id, userId } });
    if (!link) throw new NotFoundException({ code: 'SHARE_NOT_FOUND', message: 'Report link not found.' });
    return link;
  }

  private background(snap: HealthSnapshot): ReportBackground | null {
    const { menarcheAge, familyHistory, allergies, surgeries } = snap.user;
    if (menarcheAge == null && familyHistory.length === 0 && !allergies && !surgeries) return null;
    return {
      menarcheAge,
      familyHistory: familyHistory.map((code) => FAMILY_CONDITION_LABELS[code as FamilyCondition] ?? code),
      allergies: this.crypto.decryptNullable(allergies),
      surgeries: this.crypto.decryptNullable(surgeries),
    };
  }

  private async recentNotes(userId: string, from: string) {
    const rows = await this.prisma.dailyLog.findMany({
      where: { userId, date: { gte: toUTCDate(from) }, notes: { not: null } },
      orderBy: { date: 'desc' },
      take: 20,
      select: { date: true, notes: true },
    });
    return rows.map((r) => ({ date: fromUTCDate(r.date), text: this.crypto.decrypt(r.notes!) }));
  }
}
