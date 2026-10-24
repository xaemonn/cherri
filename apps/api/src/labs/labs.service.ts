import { Injectable, NotFoundException, UnprocessableEntityException, UnsupportedMediaTypeException } from '@nestjs/common';
import type { LabReport, LabResult } from '@prisma/client';
import {
  addDays,
  fromUTCDate,
  getLabAnalyte,
  interpretLabResult,
  isISODate,
  parseReportDate,
  toUTCDate,
  type InterpretedLabResult,
  type LabReportDto,
  type LabTrend,
  type ManualLabReportInput,
} from '@cherri/shared';
import { PrismaService } from '../common/prisma.service';
import { HealthDataService } from '../tracking/health-data.service';
import { LabExtractorService, sniffFileKind } from './lab-extractor.service';

const MAX_RESULTS = 80;

@Injectable()
export class LabsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly extractor: LabExtractorService,
    private readonly data: HealthDataService,
  ) {}

  /** Decode an uploaded report. The file is processed in memory and never stored. */
  async upload(userId: string, file: { buffer: Buffer; originalname?: string }): Promise<LabReportDto> {
    const kind = sniffFileKind(file.buffer);
    if (!kind) throw new UnsupportedMediaTypeException({ code: 'UNSUPPORTED_FILE', message: 'Upload a PDF, JPG, PNG or WEBP lab report.' });

    const today = this.data.today(await this.data.getUser(userId));
    const extraction = await this.extractor.extract(file.buffer, kind);
    if (extraction.results.length === 0) {
      throw new UnprocessableEntityException({ code: 'NO_RESULTS_FOUND', message: 'We couldn’t find any test results in that file.' });
    }

    const plausible = (d: string | null | undefined): d is string => !!d && isISODate(d) && d <= today && d >= addDays(today, -365 * 5);
    const takenAt =
      [extraction.reportDate, extraction.text ? parseReportDate(extraction.text, today) : null].find(plausible) ?? today;

    return this.save(userId, {
      source: kind === 'pdf' ? 'UPLOAD_PDF' : 'UPLOAD_IMAGE',
      fileName: file.originalname?.slice(0, 120) ?? null,
      labName: extraction.labName,
      takenAt,
      extractor: extraction.extractor,
      results: extraction.results.slice(0, MAX_RESULTS).map(interpretLabResult),
    });
  }

  async manual(userId: string, input: ManualLabReportInput): Promise<LabReportDto> {
    const results = input.results.map((r) =>
      interpretLabResult({ name: getLabAnalyte(r.code)!.name, value: r.value, unit: r.unit ?? getLabAnalyte(r.code)!.unit, refLow: r.refLow, refHigh: r.refHigh }),
    );
    return this.save(userId, { source: 'MANUAL', fileName: null, labName: input.labName ?? null, takenAt: input.takenAt, extractor: null, results });
  }

  async list(userId: string): Promise<LabReportDto[]> {
    const reports = await this.prisma.labReport.findMany({
      where: { userId },
      include: { results: true },
      orderBy: [{ takenAt: 'desc' }, { createdAt: 'desc' }],
    });
    return reports.map((r) => this.toDto(r));
  }

  async trends(userId: string): Promise<LabTrend[]> {
    const rows = await this.prisma.labResult.findMany({ where: { userId, code: { not: null } }, orderBy: { takenAt: 'asc' } });
    const byCode = new Map<string, typeof rows>();
    for (const row of rows) byCode.set(row.code!, [...(byCode.get(row.code!) ?? []), row]);
    return [...byCode.entries()].map(([code, points]) => {
      const def = getLabAnalyte(code);
      return {
        code,
        name: def?.name ?? points[0]!.name,
        unit: def?.unit ?? points[0]!.unit,
        points: points.map((p) => ({ takenAt: fromUTCDate(p.takenAt), value: p.value, unit: p.unit, flag: p.flag })),
      };
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.labReport.deleteMany({ where: { id, userId } });
    if (count === 0) throw new NotFoundException({ code: 'LAB_REPORT_NOT_FOUND', message: 'Lab report not found.' });
  }

  private async save(
    userId: string,
    report: { source: string; fileName: string | null; labName: string | null; takenAt: string; extractor: string | null; results: InterpretedLabResult[] },
  ): Promise<LabReportDto> {
    const created = await this.prisma.labReport.create({
      data: {
        userId,
        source: report.source,
        fileName: report.fileName,
        labName: report.labName,
        takenAt: toUTCDate(report.takenAt),
        extractor: report.extractor,
        results: {
          create: report.results.map((r) => ({
            userId,
            code: r.code,
            name: r.name,
            value: r.value,
            unit: r.unit ?? null,
            // Store only ranges printed on the report; catalog ranges are re-derived on read.
            refLow: r.rangeSource === 'REPORT' ? (r.refLow ?? null) : null,
            refHigh: r.rangeSource === 'REPORT' ? (r.refHigh ?? null) : null,
            flag: r.flag,
            takenAt: toUTCDate(report.takenAt),
          })),
        },
      },
      include: { results: true },
    });
    return this.toDto(created);
  }

  private toDto(report: LabReport & { results: LabResult[] }): LabReportDto {
    const results = report.results.map((r) => ({
      id: r.id,
      ...interpretLabResult({ name: r.name, value: r.value, unit: r.unit, refLow: r.refLow, refHigh: r.refHigh }),
      // The stored code and flag are authoritative (manual entries carry an explicit code).
      code: r.code,
      flag: r.flag,
    }));
    const highlights = results.filter((r) => r.flag === 'LOW' || r.flag === 'HIGH');
    return {
      id: report.id,
      takenAt: fromUTCDate(report.takenAt),
      labName: report.labName,
      source: report.source,
      extractor: report.extractor,
      createdAt: report.createdAt.toISOString(),
      results,
      highlights,
      summary:
        highlights.length === 0
          ? `All ${results.length} results are within the reference range.`
          : `${highlights.length} of ${results.length} results need attention: ${highlights
              .slice(0, 4)
              .map((r) => `${r.name} (${r.flag.toLowerCase()})`)
              .join(', ')}${highlights.length > 4 ? ' and more' : ''}.`,
    };
  }
}
