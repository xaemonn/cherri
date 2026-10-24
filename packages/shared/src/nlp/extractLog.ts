import type { FlowLevel, Language } from '../constants';
import { SYMPTOMS, symptomLabel, type SymptomCode } from '../catalog/symptoms';
import { clamp } from '../math';

export interface LogDraft {
  /** 0 = today, -1 = yesterday. */
  dayOffset: number;
  flow: FlowLevel | null;
  periodStarted: boolean;
  symptoms: Array<{ code: SymptomCode; severity: number }>;
  painLevel: number | null;
  mood: number | null;
  energy: number | null;
  sleepHours: number | null;
  /** Blood pressure in mmHg and weight in kg, when she reads them out ("BP 138/88, 64 kg"). */
  systolic?: number | null;
  diastolic?: number | null;
  weightKg?: number | null;
  notes: string | null;
}

const BREAK = '|';
const NEGATIONS = new Set(['no', 'not', 'without', 'never', "don't", 'dont', "didn't", 'didnt', "isn't", 'nahi', 'nahin', 'nhi', 'mat', 'नहीं', 'ಇಲ್ಲ', 'illa', 'ಬೇಡ']);
const STRONG = new Set(['very', 'severe', 'terrible', 'horrible', 'unbearable', 'extreme', 'worst', 'killing', 'bahut', 'bohot', 'bahot', 'bohut', 'zyada', 'jyada', 'tez', 'बहुत', 'ತುಂಬಾ', 'tumba', 'ಜಾಸ್ತಿ', 'jaasti']);
const MILD = new Set(['mild', 'slight', 'slightly', 'little', 'bit', 'thoda', 'thodi', 'halka', 'halki', 'थोड़ा', 'ಸ್ವಲ್ಪ', 'swalpa']);

const PERIOD_STARTED = [
  'period started', 'periods started', 'got my period', 'got my periods', 'period came', 'periods came',
  'period aaya', 'period aa gaya', 'period aa gaye', 'periods aa gaye', 'periods aaye', 'period shuru', 'periods shuru',
  'mc aa gaya', 'mc started', 'पीरियड्स आ गए', 'पीरियड शुरू', 'ಮುಟ್ಟು ಬಂತು', 'ಮುಟ್ಟು ಶುರು',
];
const ON_PERIOD = ['on my period', 'on my periods', 'bleeding', 'periods chal rahe', 'period chal raha', 'flow'];
const HEAVY_FLOW = ['heavy flow', 'heavy bleeding', 'heavy period', 'soaking', 'flooding', 'bahut bleeding', 'zyada bleeding'];
const LIGHT_FLOW = ['light flow', 'light bleeding', 'light period', 'halka flow', 'halki bleeding'];
const GOOD_MOOD = ['happy', 'good mood', 'great', 'amazing', 'awesome', 'khush', 'mast', 'calm', 'relaxed', 'accha', 'achha', 'acha', 'ಖುಷಿ'];
const GREAT_MOOD = ['very happy', 'amazing', 'awesome', 'fantastic', 'bahut khush'];
const HIGH_ENERGY = ['energetic', 'full of energy', 'productive', 'active', 'energy high'];

function normalize(text: string): string {
  const cleaned = text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    // Sentence punctuation breaks the negation/intensity window; decimals like 6.5 survive.
    .replace(/[,;!?।]|(?<!\d)\.|\.(?!\d)/g, ` ${BREAK} `)
    .replace(/[^\p{L}\p{M}\p{N}'/.|\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return ` ${cleaned} `;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const KANNADA = /[ಀ-೿]/;

function phraseRegExp(phrase: string): RegExp {
  // Kannada glues endings onto words (ತಲೆತಿರುಗುತ್ತಿದೆ), so its phrases match as stems.
  const tail = KANNADA.test(phrase) ? '[\\u0C80-\\u0CFF]*' : '(?:s|es)?';
  return new RegExp(`(?<=\\s)${escapeRegExp(phrase)}${tail}(?=\\s)`, 'g');
}

function contains(text: string, phrases: readonly string[]): boolean {
  return phrases.some((p) => phraseRegExp(p).test(text));
}

/** Up to `count` words on each side of a match, stopping at sentence breaks. */
function neighbours(text: string, start: number, end: number, count: number): string[] {
  const takeUntilBreak = (words: string[]) => {
    const idx = words.indexOf(BREAK);
    return idx === -1 ? words : words.slice(0, idx);
  };
  const before = takeUntilBreak(text.slice(0, start).trim().split(' ').reverse()).slice(0, count);
  const after = takeUntilBreak(text.slice(end).trim().split(' ')).slice(0, count);
  return [...before, ...after];
}

/** Like `contains`, but ignores negated mentions ("no bleeding", "dard nahi"). */
function mentions(text: string, phrases: readonly string[]): boolean {
  for (const phrase of phrases) {
    for (const match of text.matchAll(phraseRegExp(phrase))) {
      const nearby = neighbours(text, match.index, match.index + match[0].length, 2);
      if (!nearby.some((w) => NEGATIONS.has(w))) return true;
    }
  }
  return false;
}

/**
 * Offline parser for free-text logs such as "cramps 7/10 since morning, bahut thakaan".
 * Used when no AI provider is reachable, and as the deterministic reference in tests.
 */
export function extractLogHeuristic(input: string): LogDraft {
  const text = normalize(input);
  const symptoms = new Map<SymptomCode, number>();

  for (const symptom of SYMPTOMS) {
    for (const keyword of symptom.keywords) {
      for (const match of text.matchAll(phraseRegExp(keyword.toLowerCase()))) {
        const nearby = neighbours(text, match.index, match.index + match[0].length, 2);
        if (nearby.some((w) => NEGATIONS.has(w))) continue;
        const severity = nearby.some((w) => STRONG.has(w)) ? 3 : nearby.some((w) => MILD.has(w)) ? 1 : 2;
        symptoms.set(symptom.code, Math.max(symptoms.get(symptom.code) ?? 0, severity));
      }
    }
  }

  const painMatch = /(\d{1,2}(?:\.\d)?)\s*(?:\/|out of|outta|on)\s*10(?!\d)/.exec(text);
  const painLevel = painMatch?.[1] ? clamp(Math.round(Number(painMatch[1])), 0, 10) : null;

  const periodStarted = mentions(text, PERIOD_STARTED);
  let flow: FlowLevel | null = null;
  if (periodStarted || mentions(text, ON_PERIOD)) flow = 'MEDIUM';
  if (mentions(text, LIGHT_FLOW)) flow = 'LIGHT';
  if (mentions(text, HEAVY_FLOW) || symptoms.has('heavy_bleeding')) flow = 'HEAVY';
  if (!flow && symptoms.has('spotting')) flow = 'SPOTTING';

  let mood: number | null = null;
  if (mentions(text, GOOD_MOOD)) mood = 4;
  if (mentions(text, GREAT_MOOD)) mood = 5;
  if (symptoms.has('low_mood')) mood = 2;

  let energy: number | null = null;
  if (mentions(text, HIGH_ENERGY)) energy = 4;
  if (symptoms.has('fatigue')) energy = symptoms.get('fatigue') === 3 ? 1 : 2;

  const sleepMatch =
    /(?:slept|sleep|neend|so\s+payi|ನಿದ್ದೆ|ನಿದ್ರೆ)\D{0,12}?(\d{1,2}(?:\.\d)?)\s*(?:hours|hrs|hr|h|ghante|ghanta|ಗಂಟೆ[ಀ-೿]*)(?=\s)/.exec(text) ??
    /(\d{1,2}(?:\.\d)?)\s*(?:hours|hrs|hr|h|ghante|ghanta|ಗಂಟೆ[ಀ-೿]*)\s+(?:of\s+)?(?:sleep|neend|ನಿದ್ದೆ|ನಿದ್ರೆ)/.exec(text);
  const sleepHours = sleepMatch?.[1] ? clamp(Number(sleepMatch[1]), 0, 24) : null;

  const { systolic, diastolic } = extractBloodPressure(text);
  const weightKg = extractWeight(text);

  let dayOffset = 0;
  if (!contains(text, ['today', 'aaj', 'आज', 'ಇಂದು', 'ಇವತ್ತು'])) {
    if (contains(text, ['day before yesterday', 'parso', 'parson', 'ಮೊನ್ನೆ'])) dayOffset = -2;
    else if (contains(text, ['yesterday', 'last night', 'kal', 'कल', 'ನಿನ್ನೆ'])) dayOffset = -1;
  }

  const notes = input.trim().slice(0, 500);
  return {
    dayOffset,
    flow,
    periodStarted,
    symptoms: [...symptoms.entries()].map(([code, severity]) => ({ code, severity })),
    painLevel,
    mood,
    energy,
    sleepHours,
    systolic,
    diastolic,
    weightKg,
    notes: notes || null,
  };
}

/** "BP 138/88", "blood pressure 140 by 90", "pressure 120 over 80". Needs a BP word so "7/10" is never read as one. */
function extractBloodPressure(text: string): { systolic: number | null; diastolic: number | null } {
  const match = /(?:\bbp\b|blood pressure|pressure|बीपी|ಬಿಪಿ)\D{0,15}?(\d{2,3})\s*(?:\/|by|over)\s*(\d{2,3})(?!\d)/.exec(text);
  const systolic = Number(match?.[1]);
  const diastolic = Number(match?.[2]);
  return isPlausibleBloodPressure(systolic, diastolic) ? { systolic, diastolic } : { systolic: null, diastolic: null };
}

export function isPlausibleBloodPressure(systolic: number, diastolic: number): boolean {
  return systolic >= 70 && systolic <= 250 && diastolic >= 40 && diastolic <= 150 && systolic > diastolic;
}

/** "weight 64", "64.5 kg", "wazan 58 kilo". */
function extractWeight(text: string): number | null {
  const match =
    /(?:weight|weigh|weighed|wazan|wajan|vajan|ತೂಕ)\D{0,12}?(\d{2,3}(?:\.\d)?)(?![\d/])/.exec(text) ??
    /(\d{2,3}(?:\.\d)?)\s*(?:kg|kgs|kilo|kilos|kilogram|kilograms)(?=\s)/.exec(text);
  const value = Number(match?.[1]);
  return value >= 30 && value <= 200 ? value : null;
}

export function isEmptyDraft(draft: LogDraft): boolean {
  return (
    !draft.periodStarted &&
    (draft.flow === null || draft.flow === undefined) &&
    draft.symptoms.length === 0 &&
    draft.painLevel === null &&
    draft.mood === null &&
    draft.energy === null &&
    draft.sleepHours === null &&
    draft.systolic == null &&
    draft.weightKg == null
  );
}

const SEVERITY_WORDS = ['', 'mild ', '', 'strong '];

/** Human summary of a draft, e.g. "period started, strong cramps, fatigue, pain 7/10". */
export function describeLogDraft(draft: LogDraft): string {
  const parts: string[] = [];
  if (draft.periodStarted) parts.push('period started');
  else if (draft.flow && draft.flow !== 'NONE') parts.push(`${draft.flow.toLowerCase()} flow`);
  for (const s of draft.symptoms) parts.push(`${SEVERITY_WORDS[s.severity] ?? ''}${symptomLabel(s.code).toLowerCase()}`);
  if (draft.painLevel !== null) parts.push(`pain ${draft.painLevel}/10`);
  if (draft.mood !== null) parts.push(`mood ${draft.mood}/5`);
  if (draft.energy !== null) parts.push(`energy ${draft.energy}/5`);
  if (draft.sleepHours !== null) parts.push(`${draft.sleepHours}h sleep`);
  if (draft.systolic != null && draft.diastolic != null) parts.push(`BP ${draft.systolic}/${draft.diastolic}`);
  if (draft.weightKg != null) parts.push(`${draft.weightKg} kg`);
  return parts.join(', ');
}

const QUESTION_RE = /\?|^\s*(what|why|how|when|which|is|are|can|could|should|do|does|will|kya|kyu|kyun|kaise|kab|kitna|kitne)\b/i;

/** Questions ("what causes cramps?") must not be mistaken for symptom logs. */
export function looksLikeQuestion(text: string): boolean {
  return QUESTION_RE.test(text);
}

/** Common Hindi words as typed in English letters; two or more strongly signal Hinglish. */
const HINGLISH_WORDS = new Set(
  'hai hain ho hoon hu kya kyun kyu kaise kab nahi nahin nhi bahut bohot bohut aaj kal mujhe mera meri mere tum aap kuch sab abhi bhi aur lekin ko ka ki ke wala wali thoda thodi dard pet raha rahi rahe gaya gayi gaye karna karu chahiye accha acha achha theek thik yaar matlab haan hona hota hoti'.split(' '),
);

/** Which language a message is written in, so replies can match it exactly. */
export function detectLanguage(text: string): Language {
  if (KANNADA.test(text)) return 'kn';
  if (/[ऀ-ॿ]/.test(text)) return 'hi';
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  const hits = new Set(words.filter((w) => HINGLISH_WORDS.has(w))).size;
  return hits >= 2 && hits / words.length >= 0.15 ? 'hinglish' : 'en';
}

const PERIOD_WORDS = /\b(period|periods|bleeding|bleed|flow|spotting|mc|chums|pad|pads|khoon)\b|पीरियड/i;
const SLEEP_WORDS = /\b(sleep|slept|neend|soyi|soya|so gayi|so gaya)\b|नींद/i;

/**
 * AI models like to fill every field of a tool call. Keep only the values the user
 * actually expressed: a pain score needs a number, mood/energy/sleep need a mention,
 * and flow needs period words (a guessed "NONE" would wrongly end an open period).
 */
export function groundDraft(draft: LogDraft, text: string): LogDraft {
  const heuristic = extractLogHeuristic(text);
  const hasNumber = /\d/.test(text);
  const bp = draft.systolic != null && draft.diastolic != null && isPlausibleBloodPressure(draft.systolic, draft.diastolic);
  const bpSaid = bp && saysNumber(text, draft.systolic!) && saysNumber(text, draft.diastolic!);
  return {
    ...draft,
    flow: heuristic.flow !== null || PERIOD_WORDS.test(text) ? draft.flow : null,
    periodStarted: draft.periodStarted && (heuristic.periodStarted || PERIOD_WORDS.test(text)),
    painLevel: hasNumber ? draft.painLevel : null,
    mood: heuristic.mood !== null || /\bmood\b/i.test(text) ? draft.mood : null,
    energy: heuristic.energy !== null || /\benergy\b/i.test(text) ? draft.energy : null,
    sleepHours: heuristic.sleepHours !== null || (hasNumber && SLEEP_WORDS.test(text)) ? draft.sleepHours : null,
    // A reading is a number she said out loud; never keep one the model made up.
    systolic: bpSaid ? draft.systolic : null,
    diastolic: bpSaid ? draft.diastolic : null,
    weightKg: draft.weightKg != null && saysNumber(text, draft.weightKg) ? draft.weightKg : null,
  };
}

/** True when `value` appears in the text as a number of its own (so 14 is not found inside 140). */
export function saysNumber(text: string, value: number): boolean {
  return new RegExp(`(?<![\\d.])${escapeRegExp(String(value))}(?![\\d]|\\.\\d)`).test(text);
}
