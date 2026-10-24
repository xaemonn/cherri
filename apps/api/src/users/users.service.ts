import { BadRequestException, Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import {
  addDays,
  diffDays,
  fromUTCDate,
  toUTCDate,
  type FamilyCondition,
  type HealthBackground,
  type HealthBackgroundInput,
  type ISODate,
  type OnboardingInput,
  type UpdateProfileInput,
} from '@cherri/shared';
import { AuditService } from '../common/audit.service';
import { CryptoService } from '../common/crypto.service';
import { PrismaService } from '../common/prisma.service';
import { HealthDataService } from '../tracking/health-data.service';
import { PeriodsService } from '../tracking/periods.service';
import { toPublicUser, type PublicUser } from './user.mapper';

type MotherhoodDates = Pick<UpdateProfileInput, 'dueDate' | 'deliveryDate'>;

const toDateField = (value: ISODate | null | undefined) => (value === undefined ? undefined : value === null ? null : toUTCDate(value));

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
    private readonly data: HealthDataService,
    private readonly periods: PeriodsService,
  ) {}

  async me(userId: string): Promise<PublicUser> {
    return toPublicUser(await this.data.getUser(userId));
  }

  async update(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
    const user = await this.data.getUser(userId);
    const { dueDate, deliveryDate, ...profile } = input;
    this.assertMotherhoodDates(this.data.today({ timezone: profile.timezone ?? user.timezone }), { dueDate, deliveryDate });
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { ...profile, dueDate: toDateField(dueDate), deliveryDate: toDateField(deliveryDate) },
    });
    return toPublicUser(updated);
  }

  async onboard(userId: string, input: OnboardingInput): Promise<PublicUser> {
    const user = await this.data.getUser(userId);
    const { consent: _consent, lastPeriodStart, dueDate, deliveryDate, ...profile } = input;
    const today = this.data.today({ timezone: profile.timezone ?? user.timezone });

    if (lastPeriodStart && (lastPeriodStart > today || diffDays(today, lastPeriodStart) > 365)) {
      throw new BadRequestException({ code: 'INVALID_LAST_PERIOD', message: 'Last period date should be within the past year.' });
    }
    this.assertMotherhoodDates(today, { dueDate, deliveryDate });

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.user.update({
        where: { id: userId },
        data: {
          ...profile,
          dueDate: toDateField(dueDate),
          deliveryDate: toDateField(deliveryDate),
          consentAt: new Date(),
          onboardedAt: user.onboardedAt ?? new Date(),
        },
      });
      if (lastPeriodStart) {
        await this.periods.markStart(userId, lastPeriodStart, tx);
        // If that period is clearly over, close it with her typical length.
        const periodLength = profile.avgPeriodLength ?? user.avgPeriodLength;
        const end = addDays(lastPeriodStart, periodLength - 1);
        if (end < today) {
          await tx.period.updateMany({
            where: { userId, startDate: toUTCDate(lastPeriodStart), endDate: null },
            data: { endDate: toUTCDate(end) },
          });
        }
      }
      return saved;
    });
    return toPublicUser(updated);
  }

  async background(userId: string): Promise<HealthBackground> {
    return this.toBackground(await this.data.getUser(userId));
  }

  async updateBackground(userId: string, input: HealthBackgroundInput): Promise<HealthBackground> {
    await this.data.getUser(userId);
    const { allergies, surgeries, ...rest } = input;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        ...(allergies !== undefined && { allergies: this.crypto.encryptNullable(allergies || null) }),
        ...(surgeries !== undefined && { surgeries: this.crypto.encryptNullable(surgeries || null) }),
      },
    });
    return this.toBackground(updated);
  }

  /** Everything we hold about her, decrypted, as one JSON document (DPDP Act right to access). */
  async exportData(userId: string, ip?: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        periods: { orderBy: { startDate: 'asc' } },
        logs: { include: { symptoms: true }, orderBy: { date: 'asc' } },
        labReports: { include: { results: true }, orderBy: { takenAt: 'asc' } },
        screenings: { orderBy: { createdAt: 'asc' } },
        chatSessions: { include: { messages: { orderBy: { createdAt: 'asc' } } } },
        shareLinks: { select: { id: true, createdAt: true, expiresAt: true, revokedAt: true, viewCount: true } },
        medications: { orderBy: { createdAt: 'asc' } },
        story: true,
        trustedContacts: { orderBy: { createdAt: 'asc' } },
        mindChecks: { orderBy: { createdAt: 'asc' } },
      },
    });
    await this.audit.record('DATA_EXPORTED', { userId, ip });

    return {
      exportedAt: new Date().toISOString(),
      profile: toPublicUser(user),
      background: this.toBackground(user),
      periods: user.periods.map((p) => ({ startDate: fromUTCDate(p.startDate), endDate: p.endDate ? fromUTCDate(p.endDate) : null })),
      logs: user.logs.map(({ id: _id, userId: _u, notes, date, symptoms, ...log }) => ({
        ...log,
        date: fromUTCDate(date),
        notes: this.crypto.decryptNullable(notes),
        symptoms: symptoms.map(({ code, severity, bodyRegion }) => ({ code, severity, bodyRegion })),
      })),
      labReports: user.labReports.map((r) => ({
        takenAt: fromUTCDate(r.takenAt),
        labName: r.labName,
        results: r.results.map(({ name, code, value, unit, refLow, refHigh, flag }) => ({ name, code, value, unit, refLow, refHigh, flag })),
      })),
      screenings: user.screenings.map(({ type, band, score, maxScore, answers, createdAt }) => ({ type, band, score, maxScore, answers, createdAt })),
      medications: user.medications.map((m) => ({
        name: this.crypto.decrypt(m.name),
        dose: this.crypto.decryptNullable(m.dose),
        schedule: this.crypto.decryptNullable(m.schedule),
        reason: this.crypto.decryptNullable(m.reason),
        startedOn: m.startedOn ? fromUTCDate(m.startedOn) : null,
        active: m.active,
      })),
      story: user.story ? { text: this.crypto.decrypt(user.story.text), structured: this.crypto.decryptJson(user.story.structured), updatedAt: user.story.updatedAt } : null,
      mindChecks: user.mindChecks.map((m) => ({ type: m.type, score: m.score, band: m.band, answers: this.crypto.decryptJson(m.answers), at: m.createdAt })),
      trustedContacts: user.trustedContacts.map((c) => ({
        name: this.crypto.decrypt(c.name),
        phone: this.crypto.decrypt(c.phone),
        relation: this.crypto.decryptNullable(c.relation),
      })),
      chats: user.chatSessions.map((s) => ({
        title: s.title,
        messages: s.messages.map((m) => ({ role: m.role, content: this.crypto.decrypt(m.content), at: m.createdAt })),
      })),
      shareLinks: user.shareLinks,
    };
  }

  /** Permanent erasure. Cascades remove every health record; the audit trail keeps no identifier. */
  async deleteAccount(userId: string, ip?: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.auditLog.deleteMany({ where: { userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
    await this.audit.record('ACCOUNT_DELETED', { ip });
  }

  private toBackground(user: User): HealthBackground {
    return {
      menarcheAge: user.menarcheAge,
      familyHistory: user.familyHistory as FamilyCondition[],
      allergies: this.crypto.decryptNullable(user.allergies),
      surgeries: this.crypto.decryptNullable(user.surgeries),
    };
  }

  /** A due date belongs to a current pregnancy (up to 3 weeks overdue); a birth date is in the past two years. */
  private assertMotherhoodDates(today: ISODate, { dueDate, deliveryDate }: MotherhoodDates): void {
    if (dueDate && (dueDate < addDays(today, -21) || dueDate > addDays(today, 300))) {
      throw new BadRequestException({ code: 'INVALID_DUE_DATE', message: 'Your due date should be within the next 10 months.' });
    }
    if (deliveryDate && (deliveryDate > today || deliveryDate < addDays(today, -730))) {
      throw new BadRequestException({ code: 'INVALID_DELIVERY_DATE', message: 'The birth date should be within the past two years.' });
    }
  }
}
