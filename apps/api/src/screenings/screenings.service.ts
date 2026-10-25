import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma, Screening } from '@prisma/client';
import {
  latestLabsByCode,
  missingAnswers,
  SCREENINGS,
  SCREENING_TYPES,
  scoreScreening,
  type ScreeningAnswers,
  type ScreeningDetail,
  type ScreeningOverviewItem,
  type ScreeningRecord,
  type ScreeningResult,
  type ScreeningType,
} from '@cherri/shared';
import { PrismaService } from '../common/prisma.service';
import { InsightsService } from '../insights/insights.service';
import { HealthDataService } from '../tracking/health-data.service';
import { prefillScreening } from './prefill';

export type { ScreeningRecord };

const toRecord = (s: Screening): ScreeningRecord => ({
  id: s.id,
  type: s.type,
  band: s.band,
  createdAt: s.createdAt.toISOString(),
  result: s.result as unknown as ScreeningResult,
});

@Injectable()
export class ScreeningsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly insights: InsightsService,
    private readonly data: HealthDataService,
  ) {}

  async overview(userId: string): Promise<ScreeningOverviewItem[]> {
    const latest = await this.latestByType(userId);
    return SCREENING_TYPES.map((type) => {
      const { questions: _q, ...def } = SCREENINGS[type];
      return { ...def, questionCount: SCREENINGS[type].questions.length, latest: latest.get(type) ?? null };
    });
  }

  async detail(userId: string, type: ScreeningType): Promise<ScreeningDetail> {
    const [snap, latest] = await Promise.all([this.insights.snapshot(userId), this.latestByType(userId)]);
    return { ...SCREENINGS[type], prefill: prefillScreening(type, snap), latest: latest.get(type) ?? null };
  }

  async submit(userId: string, type: ScreeningType, answers: ScreeningAnswers): Promise<ScreeningRecord> {
    const missing = missingAnswers(type, answers);
    if (missing.length > 0) {
      throw new BadRequestException({ code: 'INCOMPLETE_SCREENING', message: 'Please answer every question.', details: { missing } });
    }
    const known = new Set(SCREENINGS[type].questions.map((q) => q.id));
    const clean = Object.fromEntries(Object.entries(answers).filter(([id]) => known.has(id)));

    const labs = latestLabsByCode(await this.data.labs(userId));
    const result = scoreScreening(type, clean, { labs });
    const saved = await this.prisma.screening.create({
      data: {
        userId,
        type,
        answers: clean,
        score: result.score,
        maxScore: result.maxScore,
        band: result.band,
        result: result as unknown as Prisma.InputJsonValue,
      },
    });
    return toRecord(saved);
  }

  async history(userId: string): Promise<ScreeningRecord[]> {
    const rows = await this.prisma.screening.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
    return rows.map(toRecord);
  }

  async latestByType(userId: string): Promise<Map<ScreeningType, ScreeningRecord>> {
    const rows = await this.prisma.screening.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      distinct: ['type'],
    });
    return new Map(rows.map((r) => [r.type, toRecord(r)]));
  }
}
