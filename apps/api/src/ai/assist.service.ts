import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  addDays,
  describeLogDraft,
  extractLogHeuristic,
  groundDraft,
  logDraftSchema,
  mythCheckResultSchema,
  SYMPTOMS,
  todayIn,
  type Citation,
  type LogDraft,
  type MythCheck,
  type ParsedLog,
  redactPII,
} from '@cherri/shared';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { HealthDataService } from '../tracking/health-data.service';
import { LogsService } from '../tracking/logs.service';
import { extractJson } from './json';
import { LlmGateway } from './llm/llm.gateway';
import { LlmUnavailableError } from './llm/llm.types';
import { libraryContext } from './chat/prompts';

const LOG_PARSER_PROMPT = `You convert a woman's health note (English, Hindi, Hinglish or Kannada) into JSON for a symptom tracker. Include only what she explicitly says.

Allowed symptom codes:
${SYMPTOMS.map((s) => `${s.code} (${s.label})`).join(', ')}

Return exactly this JSON shape:
{"dayOffset": 0, "flow": null, "periodStarted": false, "symptoms": [{"code": "cramps", "severity": 2}], "painLevel": null, "mood": null, "energy": null, "sleepHours": null, "systolic": null, "diastolic": null, "weightKg": null}

Rules: dayOffset 0 = today, -1 = yesterday ("kal" in a past-tense sentence, or "ನಿನ್ನೆ", means yesterday). flow is NONE, SPOTTING, LIGHT, MEDIUM, HEAVY or null. severity: 1 mild, 2 moderate, 3 strong. painLevel 0-10 only if she gives a number or clearly describes intensity. mood and energy go from 1 (very low) to 5 (great). systolic/diastolic only when she reads out a blood pressure like 120/80; weightKg only when she gives her weight. Use null for anything not mentioned.`;

const MYTH_PROMPT = `You are a careful fact-checker for a women's health app in India. Judge the claim using medical consensus and the library excerpts.
Return JSON: {"verdict": "TRUE" | "MYTH" | "MISLEADING" | "UNPROVEN", "evidence": "STRONG" | "MODERATE" | "EMERGING" | "TREND_ONLY", "explanation": "2-4 short, friendly sentences"}
"evidence" is how strong the science behind your verdict is. Be respectful about cultural practices: explain the health facts without mocking beliefs. Cite excerpts like [1] when you use them.`;

@Injectable()
export class AssistService {
  constructor(
    private readonly gateway: LlmGateway,
    private readonly knowledge: KnowledgeService,
    private readonly logs: LogsService,
    private readonly data: HealthDataService,
  ) {}

  /** Talk-to-Log: free text (typed or transcribed) → structured log, via AI with an offline fallback. */
  async parseLog(userId: string, text: string, options: { date?: string; commit?: boolean; source?: 'CHAT' | 'VOICE' }): Promise<ParsedLog> {
    const user = await this.data.getUser(userId);
    const today = options.date ?? todayIn(user.timezone);

    let draft: LogDraft;
    let parser: string;
    try {
      const result = await this.gateway.complete({
        task: 'fast',
        json: true,
        temperature: 0,
        maxTokens: 400,
        messages: [
          { role: 'system', content: LOG_PARSER_PROMPT },
          { role: 'user', content: redactPII(text) },
        ],
      });
      draft = { ...groundDraft(logDraftSchema.parse(extractJson(result.content)), text), notes: text.trim().slice(0, 500) };
      parser = result.provider;
    } catch {
      draft = extractLogHeuristic(text);
      parser = 'offline';
    }

    const date = addDays(today, draft.dayOffset);
    const log = options.commit ? await this.logs.applyDraft(userId, date, draft, options.source ?? 'CHAT') : null;
    return { date, draft, summary: describeLogDraft(draft), parser, log };
  }

  async transcribe(audio: Buffer, filename: string, language?: string) {
    try {
      return await this.gateway.transcribe(audio, filename, language);
    } catch (error) {
      if (error instanceof LlmUnavailableError) {
        throw new ServiceUnavailableException({ code: 'VOICE_UNAVAILABLE', message: 'Voice notes need an AI provider right now. Please type instead.' });
      }
      throw error;
    }
  }

  /** Myth Buster: curated answers first, then AI grounded in the library, then the library alone. */
  async checkMyth(claim: string): Promise<MythCheck> {
    const curated = this.knowledge.findMyth(claim);
    const fromCurated = (): MythCheck => {
      const { verdict, evidence, explanation } = curated!.myth;
      return { claim, verdict, evidence, explanation, source: 'curated', citations: [] };
    };
    if (curated && curated.coverage >= 0.6) return fromCurated();

    const hits = this.knowledge.search(claim, 3);
    const citations: Citation[] = hits.map((h, i) => ({ index: i + 1, articleId: h.articleId, title: h.title, source: h.source, url: h.url }));
    try {
      const result = await this.gateway.complete({
        task: 'chat',
        json: true,
        temperature: 0.2,
        maxTokens: 500,
        messages: [
          { role: 'system', content: [MYTH_PROMPT, libraryContext(hits)].filter(Boolean).join('\n\n') },
          { role: 'user', content: `Claim: ${redactPII(claim)}` },
        ],
      });
      const parsed = mythCheckResultSchema.parse(extractJson(result.content));
      const referenced = new Set([...parsed.explanation.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
      return { claim, ...parsed, source: 'ai', citations: citations.filter((c) => referenced.has(c.index)) };
    } catch {
      if (curated && curated.coverage >= 0.3) return fromCurated();
      const top = hits[0];
      if (!top) {
        throw new ServiceUnavailableException({ code: 'MYTH_CHECK_UNAVAILABLE', message: 'Fact-checking is offline right now. Try one of the myths in the Learn tab.' });
      }
      return {
        claim,
        verdict: 'UNPROVEN',
        evidence: 'EMERGING',
        explanation: `I can’t fact-check new claims while offline, but here is what our library says [1]: ${top.text.slice(0, 400).replace(/\s+\S*$/, '')}…`,
        source: 'library',
        citations: citations.slice(0, 1),
      };
    }
  }
}
