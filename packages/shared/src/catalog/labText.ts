import { isISODate, type ISODate } from '../dates';
import { matchLabAnalyte, type RawLabResult } from './labs';

/** Numbers that are part of a test's name rather than its result. */
const NAME_NUMBERS = [/25\s*-?\s*\(?\s*oh\s*\)?/gi, /\bb12\b/gi, /\bt[34]\b/gi, /a1c/gi, /\b\d(st|nd|rd|th)\s+gen(eration)?\b/gi];

const NUMBER = String.raw`(\d+(?:\.\d+)?)`;
const VALUE_RE = new RegExp(String.raw`(?:^|[\s:(])${NUMBER}(?=$|[\s)a-zA-Zµμ%/])`);
const RANGE_RE = new RegExp(String.raw`${NUMBER}\s*(?:-|–|to)\s*${NUMBER}`, 'i');
const UPPER_ONLY_RE = new RegExp(String.raw`(?:<|≤|upto|up to)\s*${NUMBER}`, 'i');
const LOWER_ONLY_RE = new RegExp(String.raw`(?:>|≥)\s*${NUMBER}`);
const UNIT_RE = /^\s*([a-zA-Zµμ%][a-zA-Zµμ%/0-9.^]*)/;

/**
 * Best-effort extraction of results from the text of a digital lab report PDF.
 * Used when no AI provider is reachable; handles the common
 * "Test name   value   unit   low - high" row layout used by Indian labs.
 */
export function parseLabText(text: string): RawLabResult[] {
  const results: RawLabResult[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length < 3 || line.length > 200) continue;
    const def = matchLabAnalyte(line);
    if (!def || seen.has(def.code)) continue;

    // Blank out name-numbers with equal-length padding so indices still line up with `line`.
    let cleaned = line;
    for (const pattern of NAME_NUMBERS) cleaned = cleaned.replace(pattern, (m) => ' '.repeat(m.length));

    const valueMatch = VALUE_RE.exec(cleaned);
    if (!valueMatch?.[1]) continue;
    const value = Number(valueMatch[1]);
    const rest = cleaned.slice(valueMatch.index + valueMatch[0].length);

    const unit = UNIT_RE.exec(rest)?.[1] ?? null;
    let refLow: number | null = null;
    let refHigh: number | null = null;
    const range = RANGE_RE.exec(rest);
    if (range?.[1] && range[2]) {
      refLow = Number(range[1]);
      refHigh = Number(range[2]);
    } else {
      const upper = UPPER_ONLY_RE.exec(rest);
      const lower = LOWER_ONLY_RE.exec(rest);
      if (upper?.[1]) refHigh = Number(upper[1]);
      if (lower?.[1]) refLow = Number(lower[1]);
    }

    seen.add(def.code);
    results.push({ name: line.slice(0, valueMatch.index).trim() || def.name, value, unit, refLow, refHigh });
  }
  return results;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Find the first plausible report date (Indian DD/MM/YYYY or DD-Mon-YYYY) not after `today`. */
export function parseReportDate(text: string, today: ISODate): ISODate | null {
  const candidates: ISODate[] = [];
  const pad = (n: number) => String(n).padStart(2, '0');

  for (const m of text.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/g)) {
    candidates.push(`${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`);
  }
  for (const m of text.matchAll(/\b(\d{1,2})[\s-]([A-Za-z]{3})[A-Za-z]*[\s,-]+(\d{4})\b/g)) {
    const month = MONTHS.indexOf((m[2] ?? '').toLowerCase());
    if (month >= 0) candidates.push(`${m[3]}-${pad(month + 1)}-${pad(Number(m[1]))}`);
  }
  return candidates.find((d) => isISODate(d) && d <= today && d >= '2000-01-01') ?? null;
}
