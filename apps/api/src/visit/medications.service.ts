import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Medication } from '@prisma/client';
import {
  fromUTCDate,
  toUTCDate,
  type MedicationDto,
  type MedicationInput,
  type MedicationUpdate,
  type ReportMedication,
} from '@cherri/shared';
import { CryptoService } from '../common/crypto.service';
import { PrismaService } from '../common/prisma.service';

const MAX_MEDICATIONS = 30;

/** Her medicines and supplements. Names and doses are encrypted: they can reveal a diagnosis. */
@Injectable()
export class MedicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async list(userId: string): Promise<MedicationDto[]> {
    const rows = await this.prisma.medication.findMany({ where: { userId }, orderBy: [{ active: 'desc' }, { createdAt: 'asc' }] });
    return rows.map((row) => this.toDto(row));
  }

  async create(userId: string, input: MedicationInput): Promise<MedicationDto> {
    if ((await this.prisma.medication.count({ where: { userId } })) >= MAX_MEDICATIONS) {
      throw new BadRequestException({ code: 'TOO_MANY_MEDICATIONS', message: `You can list up to ${MAX_MEDICATIONS} medicines.` });
    }
    const row = await this.prisma.medication.create({ data: { userId, ...this.toData(input), name: this.crypto.encrypt(input.name) } });
    return this.toDto(row);
  }

  async update(userId: string, id: string, input: MedicationUpdate): Promise<MedicationDto> {
    await this.findOwned(userId, id);
    const row = await this.prisma.medication.update({
      where: { id },
      data: { ...this.toData(input), ...(input.name !== undefined && { name: this.crypto.encrypt(input.name) }) },
    });
    return this.toDto(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    await this.prisma.medication.delete({ where: { id } });
  }

  /** What she takes now, for the doctor report. */
  async forReport(userId: string): Promise<ReportMedication[]> {
    const active = (await this.list(userId)).filter((m) => m.active);
    return active.map(({ name, dose, schedule, reason, startedOn }) => ({ name, dose, schedule, reason, since: startedOn }));
  }

  private toData(input: MedicationUpdate) {
    const text = (value: string | null | undefined) => (value === undefined ? undefined : this.crypto.encryptNullable(value || null));
    return {
      dose: text(input.dose),
      schedule: text(input.schedule),
      reason: text(input.reason),
      startedOn: input.startedOn === undefined ? undefined : input.startedOn ? toUTCDate(input.startedOn) : null,
      active: input.active,
    };
  }

  private async findOwned(userId: string, id: string): Promise<Medication> {
    const row = await this.prisma.medication.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException({ code: 'MEDICATION_NOT_FOUND', message: 'Medicine not found.' });
    return row;
  }

  private toDto(row: Medication): MedicationDto {
    return {
      id: row.id,
      name: this.crypto.decrypt(row.name),
      dose: this.crypto.decryptNullable(row.dose),
      schedule: this.crypto.decryptNullable(row.schedule),
      reason: this.crypto.decryptNullable(row.reason),
      startedOn: row.startedOn ? fromUTCDate(row.startedOn) : null,
      active: row.active,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
