import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Reminder } from '@prisma/client';
import { addDays, fromUTCDate, toUTCDate, type ISODate, type ReminderDto, type ReminderInput } from '@cherri/shared';
import { PrismaService } from '../common/prisma.service';
import { HealthDataService } from '../tracking/health-data.service';

const TITLES: Record<ReminderDto['kind'], string> = {
  PREGNANCY_TEST: 'Take a home pregnancy test',
};

/** Gentle follow-ups (for now: the 21-day pregnancy test after emergency contraception). */
@Injectable()
export class RemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly data: HealthDataService,
  ) {}

  async list(userId: string): Promise<ReminderDto[]> {
    const today = this.data.today(await this.data.getUser(userId));
    const rows = await this.prisma.reminder.findMany({ where: { userId, dismissedAt: null }, orderBy: { dueOn: 'asc' } });
    return rows.map((r) => this.toDto(r, today));
  }

  async create(userId: string, input: ReminderInput): Promise<ReminderDto> {
    const today = this.data.today(await this.data.getUser(userId));
    if (input.dueOn < addDays(today, -1) || input.dueOn > addDays(today, 60)) {
      throw new BadRequestException({ code: 'INVALID_REMINDER_DATE', message: 'Pick a date within the next two months.' });
    }
    // One open pregnancy-test reminder at a time: a newer accident moves the date.
    await this.prisma.reminder.updateMany({ where: { userId, kind: input.kind, dismissedAt: null }, data: { dismissedAt: new Date() } });
    const row = await this.prisma.reminder.create({ data: { userId, kind: input.kind, dueOn: toUTCDate(input.dueOn) } });
    return this.toDto(row, today);
  }

  async dismiss(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.reminder.updateMany({ where: { id, userId, dismissedAt: null }, data: { dismissedAt: new Date() } });
    if (!count) throw new NotFoundException({ code: 'REMINDER_NOT_FOUND', message: 'Reminder not found.' });
  }

  private toDto(r: Reminder, today: ISODate): ReminderDto {
    const kind = r.kind as ReminderDto['kind'];
    const dueOn = fromUTCDate(r.dueOn);
    return { id: r.id, kind, title: TITLES[kind] ?? 'Reminder', dueOn, due: dueOn <= today };
  }
}
