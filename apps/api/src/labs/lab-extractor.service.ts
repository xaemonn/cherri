import { Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { parseLabText, type RawLabResult } from '@cherri/shared';
import { z } from 'zod';
import { extractJson } from '../ai/json';
import { LlmGateway } from '../ai/llm/llm.gateway';
import { LlmUnavailableError } from '../ai/llm/llm.types';

export type LabFileKind = 'pdf' | 'png' | 'jpeg' | 'webp';

export interface Extraction {
  labName: string | null;
  reportDate: string | null;
  results: RawLabResult[];
  extractor: string;
  /** Raw text (PDFs only), used to find the report date when the AI doesn't. */
  text: string | null;
}

const LAB_PROMPT = `Extract every numeric test result from this lab report.
Return JSON: {"labName": string | null, "reportDate": "YYYY-MM-DD" | null, "results": [{"name": "test name as printed", "value": number, "unit": string | null, "refLow": number | null, "refHigh": number | null}]}
Rules: copy numbers exactly. refLow and refHigh come from the printed reference range ("12.0 - 15.5" means 12 and 15.5; "< 5.7" means refHigh 5.7). Skip results that are not numbers. Indian reports usually print dates as DD/MM/YYYY. Never include the patient's name, ID, phone number or address.`;

const MAX_PDF_TEXT = 12_000;

const toNumber = z.preprocess((v) => {
  if (typeof v !== 'string') return v;
  const digits = v.replace(/[^0-9.-]/g, '');
  return digits === '' ? Number.NaN : Number(digits);
}, z.number().refine(Number.isFinite));
const resultSchema = z.object({
  name: z.string().trim().min(1).max(120),
  value: toNumber,
  unit: z.string().trim().max(30).nullable().optional().catch(null),
  refLow: toNumber.nullable().optional().catch(null),
  refHigh: toNumber.nullable().optional().catch(null),
});
const extractionSchema = z.object({
  labName: z.string().trim().max(120).nullable().optional().catch(null),
  reportDate: z.string().nullable().optional().catch(null),
  results: z.array(z.unknown()).catch([]),
});

/** Identify the file from its first bytes. Never trust the client's MIME type. */
export function sniffFileKind(buffer: Buffer): LabFileKind | null {
  if (buffer.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf';
  if (buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return 'png';
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpeg';
  if (buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

function parseExtraction(content: string): Omit<Extraction, 'extractor' | 'text'> {
  const parsed = extractionSchema.parse(extractJson(content));
  const results = parsed.results.flatMap((r) => {
    const ok = resultSchema.safeParse(r);
    return ok.success ? [ok.data as RawLabResult] : [];
  });
  return { labName: parsed.labName ?? null, reportDate: parsed.reportDate ?? null, results };
}

@Injectable()
export class LabExtractorService {
  constructor(private readonly gateway: LlmGateway) {}

  async extract(buffer: Buffer, kind: LabFileKind): Promise<Extraction> {
    return kind === 'pdf' ? this.fromPdf(buffer) : this.fromImage(buffer, kind);
  }

  private async fromPdf(buffer: Buffer): Promise<Extraction> {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    if (text.trim().length < 40) {
      throw new UnprocessableEntityException({
        code: 'SCANNED_PDF',
        message: 'This PDF looks scanned, so there is no text to read. Upload a clear photo of the report instead.',
      });
    }

    try {
      const result = await this.gateway.complete({
        task: 'chat',
        json: true,
        temperature: 0,
        maxTokens: 2000,
        messages: [
          { role: 'system', content: LAB_PROMPT },
          { role: 'user', content: text.slice(0, MAX_PDF_TEXT) },
        ],
      });
      const extraction = parseExtraction(result.content);
      if (extraction.results.length > 0) return { ...extraction, extractor: result.provider, text };
    } catch {
      // Fall through to the offline parser.
    }
    return { labName: null, reportDate: null, results: parseLabText(text), extractor: 'offline-parser', text };
  }

  private async fromImage(buffer: Buffer, kind: Exclude<LabFileKind, 'pdf'>): Promise<Extraction> {
    try {
      const result = await this.gateway.complete({
        task: 'vision',
        json: true,
        temperature: 0,
        maxTokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: LAB_PROMPT },
              { type: 'image_url', image_url: { url: `data:image/${kind};base64,${buffer.toString('base64')}` } },
            ],
          },
        ],
      });
      return { ...parseExtraction(result.content), extractor: result.provider, text: null };
    } catch (error) {
      if (error instanceof LlmUnavailableError) {
        throw new ServiceUnavailableException({
          code: 'LAB_AI_UNAVAILABLE',
          message: 'Reading photos needs the AI right now. Try the PDF from your lab, or enter the values manually.',
        });
      }
      throw new UnprocessableEntityException({ code: 'LAB_UNREADABLE', message: 'We couldn’t read that report. Try a sharper, well-lit photo.' });
    }
  }
}
