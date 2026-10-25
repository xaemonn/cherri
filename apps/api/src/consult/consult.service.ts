import { ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import type { ConsultMessage, Consultation, DoctorProfile, User } from '@prisma/client';
import {
  clinicalSnapshotFromReport,
  clinicalTags,
  detectConsultEmergency,
  IN_PERSON_ADVICE,
  type ClinicalSnapshot,
  type ConsultationDetail,
  type ConsultationSummary,
  type ConsultCategory,
  type ConsultMessageDto,
  type ConsultStatus,
  type CreateConsultInput,
  type DoctorInboxItem,
  type DoctorProfileDto,
} from '@cherri/shared';
import { CryptoService } from '../common/crypto.service';
import { PrismaService } from '../common/prisma.service';
import { InsightsService } from '../insights/insights.service';
import { ReportsService } from '../reports/reports.service';
import { ageOf } from '../users/user.mapper';

type ConsultWithRelations = Consultation & {
  messages: ConsultMessage[];
  doctor: (User & { doctorProfile: DoctorProfile | null }) | null;
};

const SNAPSHOT_DAYS = 90;

/** Raised instead of queueing a message that describes an emergency; the client shows the red alert. */
function emergencyError(text: string): HttpException | null {
  const emergency = detectConsultEmergency(text);
  if (!emergency) return null;
  return new HttpException(
    { code: 'EMERGENCY_SYMPTOMS', message: emergency.message, details: { emergency } },
    HttpStatus.UNPROCESSABLE_ENTITY,
  );
}

@Injectable()
export class ConsultService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly reports: ReportsService,
    private readonly insights: InsightsService,
  ) {}

  /** The snapshot she will be asked to share: last 90 days, built from her own records. */
  async snapshot(userId: string): Promise<{ snapshot: ClinicalSnapshot; flagCodes: string[] }> {
    const [report, snap] = await Promise.all([
      this.reports.preview(userId, { rangeDays: SNAPSHOT_DAYS, includeNotes: false }),
      this.insights.snapshot(userId),
    ]);
    return { snapshot: clinicalSnapshotFromReport(report), flagCodes: snap.redFlags.map((f) => f.code) };
  }

  async create(userId: string, input: CreateConsultInput): Promise<ConsultationDetail> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.role !== 'PATIENT') throw new ForbiddenException({ code: 'PATIENTS_ONLY', message: 'Only patients can start a consultation.' });
    const emergency = emergencyError(input.message);
    if (emergency) throw emergency;

    const { snapshot, flagCodes } = await this.snapshot(userId);
    const consultation = await this.prisma.consultation.create({
      data: {
        patientId: userId,
        category: input.category,
        tags: clinicalTags(snapshot, flagCodes, input.category),
        snapshot: this.crypto.encryptJson(snapshot),
        consentAt: new Date(),
        messages: { create: { sender: 'PATIENT', kind: input.source === 'VOICE' ? 'VOICE' : 'TEXT', body: this.crypto.encrypt(input.message) } },
      },
    });
    return this.detail(await this.load(consultation.id));
  }

  async list(userId: string): Promise<ConsultationSummary[]> {
    const rows = await this.prisma.consultation.findMany({
      where: { patientId: userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 }, doctor: { include: { doctorProfile: true } } },
    });
    return rows.map((row) => this.summary(row));
  }

  async getForPatient(userId: string, id: string): Promise<ConsultationDetail> {
    return this.detail(await this.ownedByPatient(userId, id));
  }

  async patientMessage(userId: string, id: string, body: string, source: 'TEXT' | 'VOICE'): Promise<ConsultMessageDto> {
    const consultation = await this.ownedByPatient(userId, id);
    if (consultation.status === 'RESOLVED') {
      throw new ConflictException({ code: 'CONSULT_RESOLVED', message: 'This consultation is closed. Start a new one for a new question.' });
    }
    if (consultation.frozen) {
      throw new HttpException({ code: 'CHAT_PAUSED', message: 'This chat is paused after emergency symptoms. Confirm you are safe to continue.' }, HttpStatus.LOCKED);
    }
    const emergency = emergencyError(body);
    if (emergency) {
      // Pause the routine chat and leave a record for the doctor; the message itself is not queued as a question.
      await this.prisma.consultation.update({
        where: { id },
        data: {
          emergencyAt: new Date(),
          frozen: true,
          messages: {
            create: {
              sender: 'SYSTEM',
              kind: 'EMERGENCY',
              body: this.crypto.encrypt(`Emergency symptoms reported: “${body.slice(0, 300)}”. Cherri told her to call 112 / 108 or go to the nearest emergency room, and paused this chat.`),
            },
          },
        },
      });
      throw emergency;
    }
    const message = await this.prisma.consultMessage.create({
      data: { consultationId: id, sender: 'PATIENT', kind: source === 'VOICE' ? 'VOICE' : 'TEXT', body: this.crypto.encrypt(body) },
    });
    await this.prisma.consultation.update({ where: { id }, data: { updatedAt: new Date() } });
    return this.message(message);
  }

  async acknowledgeEmergency(userId: string, id: string): Promise<ConsultationDetail> {
    await this.ownedByPatient(userId, id);
    await this.prisma.consultation.update({
      where: { id },
      data: {
        frozen: false,
        messages: { create: { sender: 'SYSTEM', kind: 'TEXT', body: this.crypto.encrypt('She confirmed she is safe or has had emergency care. Chat resumed.') } },
      },
    });
    return this.detail(await this.load(id));
  }

  // Doctor workspace

  async inbox(doctorId: string, status?: ConsultStatus): Promise<DoctorInboxItem[]> {
    const rows = await this.prisma.consultation.findMany({
      where: {
        ...(status && { status }),
        OR: [{ doctorId: null }, { doctorId }],
      },
      orderBy: [{ emergencyAt: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'asc' }],
      take: 100,
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        doctor: { include: { doctorProfile: true } },
        patient: true,
      },
    });
    return rows.map((row) => ({
      ...this.summary(row),
      patient: { firstName: row.patient.name?.split(/\s+/)[0] ?? null, age: ageOf(row.patient, new Date().toISOString()), lifeStage: row.patient.lifeStage },
    }));
  }

  async getForDoctor(doctorId: string, id: string): Promise<ConsultationDetail> {
    return this.detail(await this.visibleToDoctor(doctorId, id));
  }

  async doctorMessage(doctorId: string, id: string, body: string, tests: string[]): Promise<ConsultMessageDto> {
    const consultation = await this.visibleToDoctor(doctorId, id);
    if (consultation.status === 'RESOLVED') throw new ConflictException({ code: 'CONSULT_RESOLVED', message: 'This consultation is resolved.' });
    const text = tests.length ? [body, `Recommended tests: ${tests.join(', ')}.`].filter(Boolean).join('\n\n') : body;
    const message = await this.prisma.consultMessage.create({
      data: { consultationId: id, sender: 'DOCTOR', kind: tests.length ? 'TESTS' : 'TEXT', body: this.crypto.encrypt(text), tests },
    });
    await this.claim(doctorId, id);
    return this.message(message);
  }

  async recommendVisit(doctorId: string, id: string): Promise<ConsultationDetail> {
    const consultation = await this.visibleToDoctor(doctorId, id);
    if (consultation.status === 'RESOLVED') throw new ConflictException({ code: 'CONSULT_RESOLVED', message: 'This consultation is resolved.' });
    await this.prisma.consultMessage.create({ data: { consultationId: id, sender: 'DOCTOR', kind: 'IN_PERSON', body: this.crypto.encrypt(IN_PERSON_ADVICE) } });
    await this.claim(doctorId, id, { inPersonAdvisedAt: new Date() });
    return this.detail(await this.load(id));
  }

  async resolve(doctorId: string, id: string): Promise<ConsultationDetail> {
    await this.visibleToDoctor(doctorId, id);
    await this.prisma.consultMessage.create({
      data: { consultationId: id, sender: 'SYSTEM', kind: 'RESOLVED', body: this.crypto.encrypt('The doctor marked this consultation as resolved. It is saved in your consultation history.') },
    });
    await this.prisma.consultation.update({ where: { id }, data: { status: 'RESOLVED', resolvedAt: new Date(), doctorId } });
    return this.detail(await this.load(id));
  }

  private async claim(doctorId: string, id: string, extra: { inPersonAdvisedAt?: Date } = {}) {
    await this.prisma.consultation.update({ where: { id }, data: { doctorId, status: 'IN_CONSULTATION', ...extra } });
  }

  private load(id: string): Promise<ConsultWithRelations> {
    return this.prisma.consultation.findUniqueOrThrow({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } }, doctor: { include: { doctorProfile: true } } },
    });
  }

  private async ownedByPatient(userId: string, id: string): Promise<ConsultWithRelations> {
    const row = await this.prisma.consultation.findFirst({
      where: { id, patientId: userId },
      include: { messages: { orderBy: { createdAt: 'asc' } }, doctor: { include: { doctorProfile: true } } },
    });
    if (!row) throw new NotFoundException({ code: 'CONSULT_NOT_FOUND', message: 'Consultation not found.' });
    return row;
  }

  /** Open consults are visible to every verified doctor; once claimed, only to that doctor. */
  private async visibleToDoctor(doctorId: string, id: string): Promise<ConsultWithRelations> {
    const row = await this.prisma.consultation.findFirst({
      where: { id, OR: [{ doctorId: null }, { doctorId }] },
      include: { messages: { orderBy: { createdAt: 'asc' } }, doctor: { include: { doctorProfile: true } } },
    });
    if (!row) throw new NotFoundException({ code: 'CONSULT_NOT_FOUND', message: 'Consultation not found.' });
    return row;
  }

  private doctorDto(doctor: ConsultWithRelations['doctor']): DoctorProfileDto | null {
    const profile = doctor?.doctorProfile;
    return profile ? { name: profile.name, specialty: profile.specialty, registrationNo: profile.registrationNo, verified: profile.verified } : null;
  }

  private message(m: ConsultMessage): ConsultMessageDto {
    return {
      id: m.id,
      sender: m.sender,
      kind: m.kind as ConsultMessageDto['kind'],
      body: this.crypto.decrypt(m.body),
      tests: m.tests,
      createdAt: m.createdAt.toISOString(),
    };
  }

  private summary(row: Consultation & { messages: ConsultMessage[]; doctor: ConsultWithRelations['doctor'] }): ConsultationSummary {
    const last = row.messages.at(row.messages.length > 1 ? -1 : 0);
    const preview = last ? this.crypto.decrypt(last.body) : null;
    return {
      id: row.id,
      category: row.category as ConsultCategory,
      status: row.status,
      tags: row.tags,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      emergencyAt: row.emergencyAt?.toISOString() ?? null,
      doctor: this.doctorDto(row.doctor),
      lastMessage: last && preview !== null ? { sender: last.sender, preview: preview.slice(0, 140), at: last.createdAt.toISOString() } : null,
    };
  }

  private detail(row: ConsultWithRelations): ConsultationDetail {
    return {
      ...this.summary({ ...row, messages: row.messages.slice(-1) }),
      snapshot: this.crypto.decryptJson<ClinicalSnapshot>(row.snapshot),
      messages: row.messages.map((m) => this.message(m)),
      inPersonAdvisedAt: row.inPersonAdvisedAt?.toISOString() ?? null,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      frozen: row.frozen,
    };
  }
}
