import { Injectable } from '@nestjs/common';
import {
  addDays,
  describeLogDraft,
  FLOW_LEVELS,
  groundDraft,
  isEmptyDraft,
  logDraftSchema,
  SCREENING_TYPES,
  SYMPTOM_CODES,
  type ChatAction,
  type Citation,
  type ISODate,
} from '@cherri/shared';
import type { HealthSnapshot } from '../../insights/insights.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { LogsService } from '../../tracking/logs.service';
import type { LlmTool, LlmToolCall } from '../llm/llm.types';

export interface ToolContext {
  userId: string;
  today: ISODate;
  /** Her latest message: logged values must be grounded in it. */
  userMessage: string;
  snapshot: HealthSnapshot;
  citations: Citation[];
  emitAction: (action: ChatAction) => void;
}

const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []): LlmTool => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required } },
});

export const CHAT_TOOLS: LlmTool[] = [
  fn(
    'log_symptoms',
    'Save what she says she is experiencing (today unless she says otherwise). Include ONLY fields she explicitly mentioned: never guess a pain score, mood, energy, sleep or flow. Call it when she describes how she feels now or recently, not for general questions.',
    {
      dayOffset: { type: 'integer', minimum: -7, maximum: 0, description: '0 = today, -1 = yesterday' },
      symptoms: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            code: { type: 'string', enum: SYMPTOM_CODES },
            severity: { type: 'integer', minimum: 1, maximum: 3, description: '1 mild, 2 moderate, 3 strong' },
          },
          required: ['code', 'severity'],
        },
      },
      flow: { type: 'string', enum: FLOW_LEVELS },
      periodStarted: { type: 'boolean' },
      painLevel: { type: 'integer', minimum: 0, maximum: 10 },
      mood: { type: 'integer', minimum: 1, maximum: 5 },
      energy: { type: 'integer', minimum: 1, maximum: 5 },
      sleepHours: { type: 'number', minimum: 0, maximum: 24 },
      systolic: { type: 'integer', minimum: 60, maximum: 260, description: 'Top blood pressure number, only if she gives a reading' },
      diastolic: { type: 'integer', minimum: 30, maximum: 160, description: 'Bottom blood pressure number' },
      weightKg: { type: 'number', minimum: 25, maximum: 250 },
    },
  ),
  fn('get_cycle_status', 'Get her current cycle day and phase, next period prediction, fertile window and cycle stats.', {}),
  fn(
    'search_health_library',
    'Search the trusted Cherri health library (WHO, NHS, NICE, Government of India sources). Always write the query in English.',
    { query: { type: 'string', description: 'English search query' } },
    ['query'],
  ),
  fn(
    'suggest_screening',
    'Show her a button to take a symptom check when her symptoms match one she has not done.',
    {
      screening: { type: 'string', enum: SCREENING_TYPES },
      reason: { type: 'string', description: 'One short sentence on why' },
    },
    ['screening', 'reason'],
  ),
];

/** Executes the AI companion's tool calls against real app services. */
@Injectable()
export class ChatToolsService {
  constructor(
    private readonly logs: LogsService,
    private readonly knowledge: KnowledgeService,
  ) {}

  async execute(call: LlmToolCall, ctx: ToolContext): Promise<unknown> {
    let args: Record<string, unknown>;
    try {
      args = call.arguments ? (JSON.parse(call.arguments) as Record<string, unknown>) : {};
    } catch {
      return { error: 'Arguments were not valid JSON.' };
    }
    switch (call.name) {
      case 'log_symptoms':
        return this.logSymptoms(args, ctx);
      case 'get_cycle_status':
        return this.cycleStatus(ctx);
      case 'search_health_library':
        return this.searchLibrary(String(args.query ?? ''), ctx);
      case 'suggest_screening':
        return this.suggestScreening(args, ctx);
      default:
        return { error: `Unknown tool ${call.name}` };
    }
  }

  private async logSymptoms(args: Record<string, unknown>, ctx: ToolContext) {
    const draft = groundDraft(logDraftSchema.parse({ ...args, notes: null }), ctx.userMessage);
    if (isEmptyDraft(draft)) return { saved: false, reason: 'Nothing specific to log.' };
    const date = addDays(ctx.today, draft.dayOffset);
    await this.logs.applyDraft(ctx.userId, date, draft, 'CHAT');
    const summary = describeLogDraft(draft);
    ctx.emitAction({ kind: 'LOGGED', date, summary });
    return { saved: true, date, logged: summary };
  }

  private cycleStatus(ctx: ToolContext) {
    const prediction = ctx.snapshot.prediction;
    if (!prediction) return { message: `Period predictions are paused in her life stage (${ctx.snapshot.user.lifeStage}).` };
    if (!prediction.current) return { message: 'No periods logged yet. Ask her when her last period started.' };
    ctx.emitAction({ kind: 'SHOW_CYCLE' });
    const { current, nextPeriod, stats, model } = prediction;
    return {
      today: ctx.today,
      cycleDay: current.day,
      phase: current.phase,
      onPeriod: current.isPeriod,
      nextPeriod,
      fertileWindow: { start: current.fertileStart, end: current.fertileEnd, ovulation: current.ovulation },
      averageCycleLength: stats.avgCycleLength,
      regularity: stats.regularity,
      learnedFromCycles: model.basedOnCycles,
    };
  }

  private searchLibrary(query: string, ctx: ToolContext) {
    const hits = this.knowledge.search(query, 3).filter((h) => !ctx.citations.some((c) => c.articleId === h.articleId));
    return hits.map((hit) => {
      const index = ctx.citations.length + 1;
      ctx.citations.push({ index, articleId: hit.articleId, title: hit.title, source: hit.source, url: hit.url });
      return { cite: `[${index}]`, title: hit.title, section: hit.heading, text: hit.text, source: hit.source };
    });
  }

  private suggestScreening(args: Record<string, unknown>, ctx: ToolContext) {
    const screening = String(args.screening ?? '');
    if (!(SCREENING_TYPES as readonly string[]).includes(screening)) return { error: 'Unknown screening.' };
    ctx.emitAction({ kind: 'SUGGEST_SCREENING', screening, reason: String(args.reason ?? '').slice(0, 200) });
    return { shown: true };
  }
}
