import { BadRequestException, Injectable } from '@nestjs/common';
import type { MindCheck } from '@prisma/client';
import {
  MIND_CHECK_TYPES,
  MIND_CHECKS,
  missingMindAnswers,
  scoreMindCheck,
  type DoctorReport,
  type MindCheckRecord,
  type MindChecksResponse,
  type MindCheckType,
} from '@cherri/shared';
import { CryptoService } from '../common/crypto.service';
import { PrismaService } from '../common/prisma.service';

/** PHQ-9 and GAD-7 check-ins. Scored on the server with the shared rules, so a client can't change the result. */
@Injectable()
export class MindService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async list(userId: string): Promise<MindChecksResponse> {
    const rows = await this.prisma.mindCheck.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 });
    const history = rows.map((row) => this.toRecord(row));
    const latest = Object.fromEntries(MIND_CHECK_TYPES.map((type) => [type, history.find((r) => r.type === type) ?? null])) as MindChecksResponse['latest'];
    return { latest, history };
  }

  async submit(userId: string, type: MindCheckType, answers: Record<string, number>): Promise<MindCheckRecord> {
    const missing = missingMindAnswers(type, answers);
    if (missing.length > 0) {
      throw new BadRequestException({ code: 'INCOMPLETE_CHECK', message: 'Please answer every question.', details: { missing } });
    }
    const known = new Set(MIND_CHECKS[type].questions.map((q) => q.id));
    const clean = Object.fromEntries(Object.entries(answers).filter(([id]) => known.has(id)));
    const result = scoreMindCheck(type, clean);
    // Not written to the audit log: even "she took a depression check" is health information.
    const row = await this.prisma.mindCheck.create({
      data: { userId, type, answers: this.crypto.encryptJson(clean), score: result.score, band: result.band, selfHarm: result.selfHarm },
    });
    return this.toRecord(row);
  }

  async forReport(userId: string): Promise<NonNullable<DoctorReport['mindChecks']>> {
    const { latest } = await this.list(userId);
    return MIND_CHECK_TYPES.flatMap((type) => {
      const record = latest[type];
      return record
        ? [{ type, title: MIND_CHECKS[type].title, score: record.score, maxScore: record.maxScore, label: record.label, date: record.createdAt.slice(0, 10), selfHarm: record.selfHarm }]
        : [];
    });
  }

  private toRecord(row: MindCheck): MindCheckRecord {
    const type = row.type as MindCheckType;
    return { id: row.id, createdAt: row.createdAt.toISOString(), ...scoreMindCheck(type, this.crypto.decryptJson<Record<string, number>>(row.answers)) };
  }
}
