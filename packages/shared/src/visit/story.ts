import { z } from 'zod';
import { SYMPTOM_CODES, type SymptomCode } from '../catalog/symptoms';
import { extractLogHeuristic, saysNumber } from '../nlp/extractLog';

/**
 * Her symptom story in her own words, organised the way a doctor takes a history
 * (onset, site, character, timing, what makes it better or worse, impact, concerns).
 */
export interface StructuredStory {
  mainConcern: string;
  since: string | null;
  pattern: string | null;
  location: string | null;
  severity: string | null;
  triggers: string[];
  relief: string[];
  tried: string[];
  impact: string | null;
  worries: string | null;
  goals: string | null;
  symptoms: SymptomCode[];
}

const line = (max: number) => z.string().trim().max(max).nullable();
const list = z.array(z.string().trim().min(1).max(120)).max(8);

/** What she confirms (and may edit) before the story is saved. */
export const structuredStorySchema = z.object({
  mainConcern: z.string().trim().min(1).max(300),
  since: line(120),
  pattern: line(200),
  location: line(120),
  severity: line(120),
  triggers: list,
  relief: list,
  tried: list,
  impact: line(300),
  worries: line(300),
  goals: line(300),
  symptoms: z.array(z.enum(SYMPTOM_CODES)).max(20),
});

/** Lenient parse of what an AI returns: bad fields become empty instead of failing the whole story. */
export const aiStorySchema = z.object({
  mainConcern: z.string().trim().max(300).catch(''),
  since: line(120).catch(null),
  pattern: line(200).catch(null),
  location: line(120).catch(null),
  severity: line(120).catch(null),
  triggers: z.array(z.string().max(120)).max(8).catch([]),
  relief: z.array(z.string().max(120)).max(8).catch([]),
  tried: z.array(z.string().max(120)).max(8).catch([]),
  impact: line(300).catch(null),
  worries: line(300).catch(null),
  goals: line(300).catch(null),
});

export const storyStructureRequestSchema = z.object({
  text: z.string().trim().min(10).max(4000),
});

export const saveStorySchema = z.object({
  text: z.string().trim().min(10).max(4000),
  structured: structuredStorySchema,
  source: z.enum(['MANUAL', 'VOICE']).default('MANUAL'),
});

export type StoryStructureRequest = z.infer<typeof storyStructureRequestSchema>;
export type SaveStoryInput = z.input<typeof saveStorySchema>;

const SENTENCE_END = /(?<=[.!?।])\s+|\n+/;
const NUMBER_WORDS = '\\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|few|several|many|couple of';

const SINCE_PATTERNS = [
  new RegExp(`\\b(?:since|for|from)\\s+(?:the\\s+)?(?:last|past)?\\s*(?:${NUMBER_WORDS})\\s+(?:day|week|month|year)s?\\b`, 'i'),
  /\bsince\s+(?:i\s+was|age|the\s+age\s+of)\s+\d{1,2}\b/i,
  /\bsince\s+(?:my\s+|the\s+)?(?:first\s+period|periods\s+started|school|college|marriage|wedding|delivery|childbirth|pregnancy|last\s+(?:week|month|year)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)\b/i,
  /\b(?:\d+|ek|do|teen|char|paanch)\s+(?:din|hafte|mahine|mahina|saal|sal)\s+se\b/i,
  /\d+\s*(?:दिन|हफ्ते|महीने|साल)\s*से/,
];
const SEVERITY = /\b\d{1,2}(?:\.\d)?\s*(?:\/|out of)\s*10\b|\b(?:unbearable|excruciating|the worst|can'?t bear|cannot bear|severe|very bad)\b/i;
// "Lying on my left side" is a position, not where it hurts.
const LOCATION =
  /(?<!\b(?:on|onto) (?:my|her|the) (?:(?:left|right|lower|upper|both)\s+)?)\b(?:(?:left|right|lower|upper|both)\s+)?(?:side|belly|abdomen|tummy|stomach|lower back|back|pelvis|pelvic area|breasts?|head|thighs?|legs?|ovar(?:y|ies)|womb|vagina)\b/i;
const PATTERN =
  /\b(?:every (?:month|cycle|day|night|morning)|before (?:my )?periods?|during (?:my )?periods?|after (?:my )?periods?|mid-?cycle|around ovulation|at night|in the morning|after eating|after sex|comes and goes|on and off|all the time|har mahine|roz)\b/i;
const TRIGGER = /\b(?:worse (?:when|after|during|with|if)|gets worse|makes it worse|triggered by|badh jata|badh jaata)\b/i;
const RELIEF = /\b(?:helps|helped|relieves|relief|better (?:with|when|after)|eases|aaram)\b/i;
const TRIED = /\b(?:tried|took|have taken|been taking|taking|using|used|started|prescribed|was given)\s+([^.,;!?]{2,60})/gi;
const MEDICINES =
  /\b(?:meftal(?:[- ]spas)?|ibuprofen|brufen|paracetamol|dolo|crocin|combiflam|mefenamic acid|metformin|thyronorm|eltroxin|thyroxine|iron tablets?|ifa|folic acid|calcium|birth control pills?|the pill|ocps?|hot water (?:bag|bottle)|heating pad|ajwain|ginger tea)\b/gi;
const IMPACT =
  /\b(?:miss(?:ed|ing)?|skip(?:ped)?|absent|can'?t (?:go|work|study|walk|sleep|stand)|cannot (?:go|work|study|walk|sleep|stand)|unable to|leave (?:work|college|school|office)|stay in bed|bed rest|affects my|ruins|chhutti)\b/i;
const WORRY = /\b(?:worried|worry|scared|afraid|fear|anxious about|concerned|dar lagta|tension hai|chinta)\b/i;
const GOAL = /\b(?:i want to|i'?d like to|want to know|want to understand|hoping|i need to know|is it possible|can i|should i|whether)\b/i;

function clean(text: string, max: number): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).replace(/\s+\S*$/, '')}…` : trimmed;
}

/** The part of a sentence after a cue word ("worse when I stand for long" → "when I stand for long"). */
function clauseAfter(sentence: string, cue: RegExp): string {
  const match = cue.exec(sentence);
  if (!match) return clean(sentence, 120);
  const rest = sentence.slice(match.index).replace(/[.!?।]+$/, '');
  return clean(rest, 120);
}

/**
 * Offline structuring: plain pattern matching, so a story is never lost when no AI is reachable.
 * It only ever copies her words; it never adds facts.
 */
export function structureStoryHeuristic(text: string): StructuredStory {
  const sentences = text
    .split(SENTENCE_END)
    .map((s) => s.trim())
    .filter(Boolean);
  const find = (re: RegExp) => sentences.find((s) => re.test(s)) ?? null;
  const findAll = (re: RegExp) => sentences.filter((s) => re.test(s));

  const symptoms = extractLogHeuristic(text).symptoms.map((s) => s.code);
  // People usually lead with what bothers them most.
  const concern = sentences[0] ?? text;

  const sinceMatch = SINCE_PATTERNS.map((re) => re.exec(text)).find(Boolean);
  const severityMatch = SEVERITY.exec(text);
  const locationMatch = LOCATION.exec(text);
  const patternMatch = PATTERN.exec(text);

  const tried = new Set<string>();
  for (const match of text.matchAll(MEDICINES)) tried.add(match[0].toLowerCase());
  for (const match of text.matchAll(TRIED)) {
    const item = clean(match[1]!, 60);
    if (![...tried].some((t) => item.toLowerCase().includes(t))) tried.add(item);
  }

  const impact = find(IMPACT);
  const worries = find(WORRY);
  const goals = find(GOAL);

  return {
    mainConcern: clean(concern, 300),
    since: sinceMatch ? clean(sinceMatch[0], 120) : null,
    pattern: patternMatch ? clean(patternMatch[0], 200) : null,
    location: locationMatch ? clean(locationMatch[0], 120) : null,
    severity: severityMatch ? clean(severityMatch[0], 120) : null,
    triggers: findAll(TRIGGER)
      .map((s) => clauseAfter(s, TRIGGER))
      .slice(0, 4),
    relief: findAll(RELIEF)
      .map((s) => clean(s.replace(/[.!?।]+$/, ''), 120))
      .slice(0, 4),
    tried: [...tried].slice(0, 6),
    impact: impact ? clean(impact, 300) : null,
    worries: worries ? clean(worries, 300) : null,
    goals: goals ? clean(goals, 300) : null,
    symptoms,
  };
}

/** Diagnostic claims an AI must never add on her behalf. */
const DIAGNOSTIC_CLAIM = /\b(?:you have|she has|diagnosed with|diagnosis of|confirms?|definitely|is caused by|suffers from)\b/i;

/**
 * Keeps only what her own words support: every number in a field must appear in her text
 * (so 8/10 can't become 9/10), and no field may assert a diagnosis she didn't mention.
 */
export function isGroundedIn(value: string, source: string): boolean {
  const numbers = value.match(/\d+(?:\.\d+)?/g) ?? [];
  if (!numbers.every((n) => saysNumber(source, Number(n)))) return false;
  return !DIAGNOSTIC_CLAIM.test(value) || DIAGNOSTIC_CLAIM.test(source);
}

export function groundStory(story: Omit<StructuredStory, 'symptoms'>, source: string): StructuredStory {
  const keep = (value: string | null) => (value && isGroundedIn(value, source) ? value : null);
  const keepAll = (values: string[]) => values.filter((v) => v.trim() && isGroundedIn(v, source));
  const fallback = structureStoryHeuristic(source);
  return {
    mainConcern: keep(story.mainConcern) ?? fallback.mainConcern,
    since: keep(story.since),
    pattern: keep(story.pattern),
    location: keep(story.location),
    severity: keep(story.severity),
    triggers: keepAll(story.triggers),
    relief: keepAll(story.relief),
    tried: keepAll(story.tried),
    impact: keep(story.impact),
    worries: keep(story.worries),
    goals: keep(story.goals),
    symptoms: fallback.symptoms,
  };
}
