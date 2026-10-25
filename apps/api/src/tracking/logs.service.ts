import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type DailyLog, type SymptomEntry } from '@prisma/client';
import {
  addDays,
  fromUTCDate,
  isEmptyPbac,
  type PbacEntry,
  toUTCDate,
  type ISODate,
  type LogDraft,
  type LogDto,
  type LogSource,
  type UpsertLogInput,
} from '@cherri/shared';
import { CryptoService } from '../common/crypto.service';
import { PrismaService } from '../common/prisma.service';
import { HealthDataService } from './health-data.service';
import { PeriodsService } from './periods.service';

export type { LogDto };

const MAX_BACKFILL_DAYS = 730;

@Injectable()
export class LogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly data: HealthDataService,
    private readonly periods: PeriodsService,
  ) {}

  async list(userId: string, from?: ISODate, to?: ISODate): Promise<LogDto[]> {
    const rows = await this.prisma.dailyLog.findMany({
      where: { userId, date: { gte: from ? toUTCDate(from) : undefined, lte: to ? toUTCDate(to) : undefined } },
      include: { symptoms: true },
      orderBy: { date: 'desc' },
      take: 400,
    });
    return rows.map((row) => this.toDto(row));
  }

  async get(userId: string, date: ISODate): Promise<LogDto | null> {
    const row = await this.prisma.dailyLog.findUnique({
      where: { userId_date: { userId, date: toUTCDate(date) } },
      include: { symptoms: true },
    });
    return row ? this.toDto(row) : null;
  }

  async upsert(userId: string, date: ISODate, input: UpsertLogInput): Promise<LogDto> {
    await this.assertLoggableDate(userId, date);
    const { symptoms, notes, pbac, ...fields } = input;
    const data = {
      ...fields,
      ...(notes !== undefined && { notes: this.crypto.encryptNullable(notes) }),
      // Prisma needs DbNull to clear a JSON column; an empty chart is stored as no chart.
      ...(pbac !== undefined && { pbac: pbac === null || isEmptyPbac(pbac) ? Prisma.DbNull : pbac }),
    };

    const row = await this.prisma.$transaction(async (tx) => {
      const log = await tx.dailyLog.upsert({
        where: { userId_date: { userId, date: toUTCDate(date) } },
        create: { userId, date: toUTCDate(date), ...data },
        update: data,
      });
      if (symptoms) {
        // Keep the strongest severity if the same symptom is sent twice.
        const unique = new Map(symptoms.map((s) => [s.code, s]));
        for (const s of symptoms) if (s.severity > unique.get(s.code)!.severity) unique.set(s.code, s);
        await tx.symptomEntry.deleteMany({ where: { logId: log.id } });
        await tx.symptomEntry.createMany({
          data: [...unique.values()].map((s) => ({ logId: log.id, code: s.code, severity: s.severity, bodyRegion: s.bodyRegion })),
        });
      }
      if (fields.flow !== undefined) await this.periods.syncFromFlow(tx, userId, date, fields.flow);
      return tx.dailyLog.findUniqueOrThrow({ where: { id: log.id }, include: { symptoms: true } });
    });
    return this.toDto(row);
  }

  /** Merge an AI- or voice-parsed draft into the day's log without wiping what's already there. */
  async applyDraft(userId: string, date: ISODate, draft: LogDraft, source: LogSource): Promise<LogDto> {
    const existing = await this.get(userId, date);
    const symptoms = new Map((existing?.symptoms ?? []).map((s) => [s.code, { code: s.code, severity: s.severity }]));
    for (const s of draft.symptoms) {
      symptoms.set(s.code, { code: s.code, severity: Math.max(s.severity, symptoms.get(s.code)?.severity ?? 0) });
    }
    const notes = [existing?.notes, draft.notes].filter(Boolean).join('\n').slice(0, 2000) || undefined;

    const patch: UpsertLogInput = {
      source,
      symptoms: [...symptoms.values()] as UpsertLogInput['symptoms'],
      ...(draft.flow && { flow: draft.flow }),
      ...(draft.painLevel !== null && { painLevel: Math.max(draft.painLevel, existing?.painLevel ?? 0) }),
      ...(draft.mood !== null && { mood: draft.mood }),
      ...(draft.energy !== null && { energy: draft.energy }),
      ...(draft.sleepHours !== null && { sleepHours: draft.sleepHours }),
      ...(draft.systolic != null && draft.diastolic != null && { systolic: draft.systolic, diastolic: draft.diastolic }),
      ...(draft.weightKg != null && { weightKg: draft.weightKg }),
      ...(notes && { notes }),
    };
    const log = await this.upsert(userId, date, patch);
    if (draft.periodStarted && !draft.flow) await this.periods.markStart(userId, date);
    return log;
  }

  async remove(userId: string, date: ISODate): Promise<void> {
    const { count } = await this.prisma.dailyLog.deleteMany({ where: { userId, date: toUTCDate(date) } });
    if (count === 0) throw new NotFoundException({ code: 'LOG_NOT_FOUND', message: 'Nothing logged for that day.' });
  }

  private async assertLoggableDate(userId: string, date: ISODate): Promise<void> {
    const today = this.data.today(await this.data.getUser(userId));
    if (date > today) throw new BadRequestException({ code: 'FUTURE_DATE', message: 'You can’t log a day that hasn’t happened yet.' });
    if (date < addDays(today, -MAX_BACKFILL_DAYS)) {
      throw new BadRequestException({ code: 'DATE_TOO_OLD', message: 'Logs can go back up to 2 years.' });
    }
  }

  private toDto(row: DailyLog & { symptoms: SymptomEntry[] }): LogDto {
    return {
      date: fromUTCDate(row.date),
      flow: row.flow,
      mood: row.mood,
      energy: row.energy,
      stress: row.stress,
      sleepHours: row.sleepHours,
      painLevel: row.painLevel,
      bbt: row.bbt,
      lhPositive: row.lhPositive,
      systolic: row.systolic,
      diastolic: row.diastolic,
      weightKg: row.weightKg,
      pbac: (row.pbac as PbacEntry | null) ?? null,
      notes: this.crypto.decryptNullable(row.notes),
      source: row.source,
      symptoms: row.symptoms.map((s) => ({ code: s.code, severity: s.severity, bodyRegion: s.bodyRegion })),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
