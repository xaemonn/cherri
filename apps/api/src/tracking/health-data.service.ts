import { Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';
import {
  addDays,
  BLEEDING_FLOWS,
  fromUTCDate,
  todayIn,
  toUTCDate,
  type ISODate,
  type LabRecord,
  type LogRecord,
  type PbacEntry,
  type PeriodRecord,
} from '@cherri/shared';
import { PrismaService } from '../common/prisma.service';

/** Loads a user's health data from the database in the shapes the shared insight engines use. */
@Injectable()
export class HealthDataService {
  constructor(private readonly prisma: PrismaService) {}

  async getUser(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Account not found.' });
    return user;
  }

  today(user: Pick<User, 'timezone'>): ISODate {
    return todayIn(user.timezone);
  }

  async periods(userId: string): Promise<Array<PeriodRecord & { id: string }>> {
    const rows = await this.prisma.period.findMany({ where: { userId }, orderBy: { startDate: 'asc' } });
    return rows.map((p) => ({ id: p.id, startDate: fromUTCDate(p.startDate), endDate: p.endDate ? fromUTCDate(p.endDate) : null }));
  }

  async logs(userId: string, from?: ISODate, to?: ISODate): Promise<LogRecord[]> {
    const rows = await this.prisma.dailyLog.findMany({
      where: { userId, date: { gte: from ? toUTCDate(from) : undefined, lte: to ? toUTCDate(to) : undefined } },
      include: { symptoms: { select: { code: true, severity: true } } },
      orderBy: { date: 'asc' },
    });
    return rows.map((l) => ({
      date: fromUTCDate(l.date),
      flow: l.flow,
      mood: l.mood,
      energy: l.energy,
      sleepHours: l.sleepHours,
      painLevel: l.painLevel,
      systolic: l.systolic,
      diastolic: l.diastolic,
      weightKg: l.weightKg,
      pbac: (l.pbac as PbacEntry | null) ?? null,
      symptoms: l.symptoms,
    }));
  }

  async labs(userId: string): Promise<LabRecord[]> {
    const rows = await this.prisma.labResult.findMany({ where: { userId }, orderBy: { takenAt: 'asc' } });
    return rows.map((r) => ({ code: r.code, name: r.name, value: r.value, unit: r.unit, flag: r.flag, takenAt: fromUTCDate(r.takenAt) }));
  }

  /**
   * Periods logged without an end date get one inferred from the last bleeding day,
   * once they are clearly over, so "period length" stats stay meaningful.
   */
  resolvePeriodEnds(periods: readonly PeriodRecord[], logs: readonly LogRecord[], today: ISODate): PeriodRecord[] {
    return periods.map((p) => {
      if (p.endDate || addDays(p.startDate, 10) > today) return p;
      const lastBleed = logs
        .filter((l) => l.date >= p.startDate && l.date <= addDays(p.startDate, 14) && l.flow && BLEEDING_FLOWS.includes(l.flow))
        .at(-1);
      return lastBleed ? { ...p, endDate: lastBleed.date } : p;
    });
  }
}
