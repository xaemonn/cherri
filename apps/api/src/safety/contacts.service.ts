import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { TrustedContact } from '@prisma/client';
import type { TrustedContactDto, TrustedContactInput } from '@cherri/shared';
import { CryptoService } from '../common/crypto.service';
import { PrismaService } from '../common/prisma.service';

const MAX_CONTACTS = 5;

/**
 * The people her SOS message goes to. The app never sends anything itself: the SOS screen
 * opens her own SMS or WhatsApp with the message ready, so nothing leaves without her tap.
 */
@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async list(userId: string): Promise<TrustedContactDto[]> {
    const rows = await this.prisma.trustedContact.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    return rows.map((row) => this.toDto(row));
  }

  async create(userId: string, input: TrustedContactInput): Promise<TrustedContactDto> {
    if ((await this.prisma.trustedContact.count({ where: { userId } })) >= MAX_CONTACTS) {
      throw new BadRequestException({ code: 'TOO_MANY_CONTACTS', message: `You can add up to ${MAX_CONTACTS} trusted contacts.` });
    }
    const row = await this.prisma.trustedContact.create({
      data: {
        userId,
        name: this.crypto.encrypt(input.name),
        phone: this.crypto.encrypt(input.phone.replace(/[\s()-]/g, '')),
        relation: this.crypto.encryptNullable(input.relation || null),
      },
    });
    return this.toDto(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.trustedContact.deleteMany({ where: { id, userId } });
    if (count === 0) throw new NotFoundException({ code: 'CONTACT_NOT_FOUND', message: 'Contact not found.' });
  }

  private toDto(row: TrustedContact): TrustedContactDto {
    return {
      id: row.id,
      name: this.crypto.decrypt(row.name),
      phone: this.crypto.decrypt(row.phone),
      relation: this.crypto.decryptNullable(row.relation),
    };
  }
}
