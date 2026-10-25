import { Injectable, NotFoundException } from '@nestjs/common';
import type { SymptomStory } from '@prisma/client';
import {
  aiStorySchema,
  detectSafetyConcern,
  groundStory,
  redactPII,
  structureStoryHeuristic,
  type ReportStory,
  type SaveStoryInput,
  type StructuredStory,
  type StructuredStoryResult,
  type SymptomStoryDto,
} from '@cherri/shared';
import { CryptoService } from '../common/crypto.service';
import { PrismaService } from '../common/prisma.service';
import { extractJson } from '../ai/json';
import { LlmGateway } from '../ai/llm/llm.gateway';

const STORY_PROMPT = `You organise a woman's description of her symptoms into the history a doctor takes. She may write in English, Hindi, Hinglish or Kannada; write every field in plain English.
Use only what she says. Never add a symptom, number, date, medicine or diagnosis she did not mention, and never guess what condition she has.

Return exactly this JSON shape, with null or [] for anything she doesn't say:
{"mainConcern": "her main problem, one short sentence", "since": "when it started or how long it has gone on", "pattern": "when it happens, e.g. before periods", "location": "where in the body", "severity": "how bad, in her words or her own number", "triggers": ["what makes it worse"], "relief": ["what helps"], "tried": ["medicines or remedies she has tried"], "impact": "how it affects study, work, sleep or relationships", "worries": "what she is worried about", "goals": "what she wants from the visit"}`;

/**
 * "Tell your story": her words, structured into a clinical history for the doctor report.
 * The AI only rephrases; anything it says that her words don't support is dropped.
 */
@Injectable()
export class StoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly gateway: LlmGateway,
  ) {}

  async get(userId: string): Promise<SymptomStoryDto | null> {
    const row = await this.prisma.symptomStory.findUnique({ where: { userId } });
    return row ? this.toDto(row) : null;
  }

  /** Organise the text without saving it: she reviews and edits the result first. */
  async structure(text: string): Promise<StructuredStoryResult> {
    const concern = detectSafetyConcern(text);
    const safety = concern ? { category: concern.category, message: concern.message, helplines: concern.helplines.map(({ name, number }) => ({ name, number })) } : null;
    try {
      const result = await this.gateway.complete({
        task: 'fast',
        json: true,
        temperature: 0,
        maxTokens: 700,
        messages: [
          { role: 'system', content: STORY_PROMPT },
          { role: 'user', content: redactPII(text) },
        ],
      });
      const parsed = aiStorySchema.parse(extractJson(result.content));
      return { structured: groundStory(parsed, text), parser: result.provider, safety };
    } catch {
      return { structured: structureStoryHeuristic(text), parser: 'offline', safety };
    }
  }

  async save(userId: string, input: SaveStoryInput): Promise<SymptomStoryDto> {
    const data = {
      text: this.crypto.encrypt(input.text),
      structured: this.crypto.encryptJson(input.structured),
      source: input.source ?? 'MANUAL',
    };
    const row = await this.prisma.symptomStory.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    return this.toDto(row);
  }

  async remove(userId: string): Promise<void> {
    const { count } = await this.prisma.symptomStory.deleteMany({ where: { userId } });
    if (count === 0) throw new NotFoundException({ code: 'STORY_NOT_FOUND', message: 'No story saved yet.' });
  }

  async forReport(userId: string): Promise<ReportStory | null> {
    const story = await this.get(userId);
    return story ? { ...story.structured, inHerWords: story.text, updatedAt: story.updatedAt } : null;
  }

  private toDto(row: SymptomStory): SymptomStoryDto {
    return {
      text: this.crypto.decrypt(row.text),
      structured: this.crypto.decryptJson<StructuredStory>(row.structured),
      source: row.source === 'VOICE' ? 'VOICE' : 'MANUAL',
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
