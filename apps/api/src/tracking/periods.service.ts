import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  addDays,
  BLEEDING_FLOWS,
  diffDays,
  fromUTCDate,
  toUTCDate,
  type CreatePeriodInput,
  type FlowLevel,
  type ISODate,
  type PeriodDto,
  type UpdatePeriodInput,
} from '@cherri/shared';
import { PrismaService } from '../common/prisma.service';

type Tx = Prisma.TransactionClient;

const toDto = (p: { id: string; startDate: Date; endDate: Date | null }): PeriodDto => ({
  id: p.id,
  startDate: fromUTCDate(p.startDate),
  endDate: p.endDate ? fromUTCDate(p.endDate) : null,
});

/** Periods closer together than this are treated as one period plus spotting. */
const MIN_GAP_DAYS = 15;

@Injectable()
export class PeriodsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<PeriodDto[]> {
    const rows = await this.prisma.period.findMany({ where: { userId }, orderBy: { startDate: 'desc' } });
    return rows.map(toDto);
  }

  async create(userId: string, input: CreatePeriodInput): Promise<PeriodDto> {
    await this.assertNoNeighbour(userId, input.startDate);
    const row = await this.prisma.period.create({
      data: { userId, startDate: toUTCDate(input.startDate), endDate: input.endDate ? toUTCDate(input.endDate) : null },
    });
    return toDto(row);
  }

  async update(userId: string, id: string, input: UpdatePeriodInput): Promise<PeriodDto> {
    const existing = await this.findOwned(userId, id);
    const startDate = input.startDate ?? fromUTCDate(existing.startDate);
    const endDate = input.endDate === undefined ? (existing.endDate ? fromUTCDate(existing.endDate) : null) : input.endDate;
    if (endDate && endDate < startDate) {
      throw new ConflictException({ code: 'INVALID_RANGE', message: 'A period can’t end before it starts.' });
    }
    if (input.startDate) await this.assertNoNeighbour(userId, startDate, id);
    const row = await this.prisma.period.update({
      where: { id },
      data: { startDate: toUTCDate(startDate), endDate: endDate ? toUTCDate(endDate) : null },
    });
    return toDto(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    await this.prisma.period.delete({ where: { id } });
  }

  /** Mark a period start (from onboarding or "my period started" in chat). Idempotent. */
  async markStart(userId: string, date: ISODate, tx: Tx = this.prisma): Promise<void> {
    await this.syncFromFlow(tx, userId, date, 'MEDIUM');
  }

  /**
   * Keep periods in step with logged flow, so users never have to manage
   * periods by hand: bleeding starts or extends a period, a dry day ends an open one.
   */
  async syncFromFlow(tx: Tx, userId: string, date: ISODate, flow: FlowLevel | null): Promise<void> {
    const nearby = await tx.period.findMany({
      where: { userId, startDate: { gte: toUTCDate(addDays(date, -MIN_GAP_DAYS)), lte: toUTCDate(addDays(date, 3)) } },
      orderBy: { startDate: 'asc' },
    });
    const before = nearby.filter((p) => fromUTCDate(p.startDate) <= date).at(-1);
    const after = nearby.find((p) => fromUTCDate(p.startDate) > date);

    if (flow && BLEEDING_FLOWS.includes(flow)) {
      if (before) {
        const end = before.endDate ? fromUTCDate(before.endDate) : null;
        if (end && date > end && diffDays(date, end) <= 2) {
          await tx.period.update({ where: { id: before.id }, data: { endDate: toUTCDate(date) } });
        }
        // Bleeding well after the period ended is spotting/intermenstrual: red flags pick it up.
        return;
      }
      if (after) {
        await tx.period.update({ where: { id: after.id }, data: { startDate: toUTCDate(date) } });
        return;
      }
      await tx.period.create({ data: { userId, startDate: toUTCDate(date) } });
      return;
    }

    if (before && !before.endDate && date > fromUTCDate(before.startDate)) {
      const lastBleed = await tx.dailyLog.findFirst({
        where: { userId, date: { gte: before.startDate, lt: toUTCDate(date) }, flow: { in: [...BLEEDING_FLOWS] } },
        orderBy: { date: 'desc' },
      });
      await tx.period.update({ where: { id: before.id }, data: { endDate: lastBleed?.date ?? before.startDate } });
    }
  }

  private async findOwned(userId: string, id: string) {
    const period = await this.prisma.period.findFirst({ where: { id, userId } });
    if (!period) throw new NotFoundException({ code: 'PERIOD_NOT_FOUND', message: 'Period not found.' });
    return period;
  }

  private async assertNoNeighbour(userId: string, startDate: ISODate, excludeId?: string): Promise<void> {
    const clash = await this.prisma.period.findFirst({
      where: {
        userId,
        id: excludeId ? { not: excludeId } : undefined,
        startDate: { gt: toUTCDate(addDays(startDate, -MIN_GAP_DAYS)), lt: toUTCDate(addDays(startDate, MIN_GAP_DAYS)) },
      },
    });
    if (clash) {
      throw new ConflictException({
        code: 'PERIOD_TOO_CLOSE',
        message: `You already logged a period starting ${fromUTCDate(clash.startDate)}. Edit that one instead.`,
      });
    }
  }
}
