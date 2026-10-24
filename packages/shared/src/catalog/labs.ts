import type { Condition, LabFlag } from '../constants';

export interface LabAnalyteDef {
  code: string;
  name: string;
  /** Lower-case names as printed on reports; matched as whole words. */
  aliases: readonly string[];
  /** Names that look similar but are a different test (e.g. MCH contains "hemoglobin"). */
  exclude?: RegExp;
  loinc?: string;
  unit: string;
  /** Approximate adult female reference range in `unit`. A report's own range always wins. */
  range?: { low?: number; high?: number };
  /** Multipliers that convert other units into `unit`, keyed by normalised unit. */
  conversions?: Readonly<Record<string, number>>;
  about: string;
  lowMeans?: string;
  highMeans?: string;
  relatedConditions: readonly Condition[];
}

export const LAB_ANALYTES: readonly LabAnalyteDef[] = [
  {
    code: 'HB',
    name: 'Haemoglobin',
    aliases: ['haemoglobin', 'hemoglobin', 'hb', 'hgb'],
    exclude: /corpuscular|\bmchc?\b|glycated|glycosylated|a1c/,
    loinc: '718-7',
    unit: 'g/dL',
    range: { low: 12, high: 15.5 },
    conversions: { 'g/l': 0.1 },
    about: 'Haemoglobin carries oxygen in your blood.',
    lowMeans:
      'Low haemoglobin means anaemia. In Indian women the most common cause is iron deficiency, often from heavy periods or low dietary iron.',
    highMeans: 'High haemoglobin can happen with dehydration or smoking. Ask your doctor to interpret it.',
    relatedConditions: ['ANEMIA'],
  },
  {
    code: 'FERRITIN',
    name: 'Ferritin',
    aliases: ['ferritin', 'serum ferritin'],
    loinc: '2276-4',
    unit: 'ng/mL',
    range: { low: 15, high: 150 },
    conversions: { 'ug/l': 1 },
    about: 'Ferritin shows how much iron your body has stored.',
    lowMeans:
      'Your iron stores are low. This can cause tiredness and hair fall even before haemoglobin drops.',
    highMeans: 'Ferritin also rises with inflammation or infection, not only with high iron.',
    relatedConditions: ['ANEMIA'],
  },
  {
    code: 'IRON',
    name: 'Serum iron',
    aliases: ['serum iron', 'iron'],
    exclude: /binding|tibc|saturation/,
    loinc: '2498-4',
    unit: 'µg/dL',
    range: { low: 50, high: 170 },
    conversions: { 'umol/l': 5.585 },
    about: 'Serum iron is the iron circulating in your blood right now.',
    lowMeans: 'Low serum iron often goes with iron-deficiency anaemia.',
    highMeans: 'High serum iron is uncommon; ask your doctor about it.',
    relatedConditions: ['ANEMIA'],
  },
  {
    code: 'MCV',
    name: 'Mean corpuscular volume',
    aliases: ['mcv', 'mean corpuscular volume', 'mean cell volume'],
    loinc: '787-2',
    unit: 'fL',
    range: { low: 80, high: 100 },
    about: 'MCV is the average size of your red blood cells.',
    lowMeans: 'Small red blood cells are commonly seen in iron deficiency.',
    highMeans: 'Large red blood cells can point to low vitamin B12 or folate.',
    relatedConditions: ['ANEMIA'],
  },
  {
    code: 'TSH',
    name: 'Thyroid stimulating hormone',
    aliases: ['tsh', 'thyroid stimulating hormone', 'tsh ultrasensitive'],
    loinc: '3016-3',
    unit: 'µIU/mL',
    range: { low: 0.4, high: 4.5 },
    conversions: { 'miu/l': 1, 'mu/l': 1, 'uiu/ml': 1 },
    about: 'TSH is the main screening test for thyroid problems.',
    lowMeans: 'Low TSH can mean an overactive thyroid (hyperthyroidism).',
    highMeans:
      'High TSH can mean an underactive thyroid (hypothyroidism), which can cause tiredness, weight gain and heavy or irregular periods.',
    relatedConditions: ['THYROID'],
  },
  {
    code: 'FT4',
    name: 'Free T4',
    aliases: ['free t4', 'ft4', 'free thyroxine'],
    loinc: '3024-7',
    unit: 'ng/dL',
    range: { low: 0.8, high: 1.8 },
    conversions: { 'pmol/l': 0.0777 },
    about: 'Free T4 is the active thyroid hormone in your blood.',
    lowMeans: 'Low free T4 with high TSH suggests an underactive thyroid.',
    highMeans: 'High free T4 suggests an overactive thyroid.',
    relatedConditions: ['THYROID'],
  },
  {
    code: 'VITD',
    name: 'Vitamin D (25-OH)',
    aliases: ['vitamin d', 'vit d', '25 oh vitamin d', '25 hydroxy vitamin d', 'vitamin d total', 'vitamin d3'],
    loinc: '62292-8',
    unit: 'ng/mL',
    range: { low: 30, high: 100 },
    conversions: { 'nmol/l': 0.4006 },
    about: 'Vitamin D supports bones, muscles, mood and immunity.',
    lowMeans: 'Vitamin D is low. This is very common in India despite the sunshine.',
    highMeans: 'Very high vitamin D usually comes from too many supplements.',
    relatedConditions: [],
  },
  {
    code: 'B12',
    name: 'Vitamin B12',
    aliases: ['vitamin b12', 'vit b12', 'b12', 'cobalamin', 'cyanocobalamin'],
    loinc: '2132-9',
    unit: 'pg/mL',
    range: { low: 200, high: 900 },
    conversions: { 'pmol/l': 1.355 },
    about: 'Vitamin B12 keeps your nerves and blood cells healthy.',
    lowMeans: 'Low B12 can cause tiredness, tingling and brain fog. It is more common with vegetarian diets.',
    highMeans: 'High B12 is usually from supplements and rarely a concern on its own.',
    relatedConditions: ['ANEMIA'],
  },
  {
    code: 'HBA1C',
    name: 'HbA1c',
    aliases: ['hba1c', 'glycated haemoglobin', 'glycated hemoglobin', 'glycosylated haemoglobin', 'glycosylated hemoglobin', 'a1c'],
    loinc: '4548-4',
    unit: '%',
    range: { high: 5.6 },
    about: 'HbA1c shows your average blood sugar over the last 2–3 months.',
    highMeans:
      'Your average blood sugar has been high. 5.7–6.4% is the prediabetes range and 6.5% or more is the diabetes range. PCOS raises this risk.',
    relatedConditions: ['DIABETES', 'PCOS'],
  },
  {
    code: 'GLUCOSE_FASTING',
    name: 'Fasting glucose',
    aliases: ['fasting blood sugar', 'fasting glucose', 'glucose fasting', 'fasting plasma glucose', 'blood sugar fasting', 'fbs'],
    exclude: /\bpp\b|post|random|prandial/,
    loinc: '1558-6',
    unit: 'mg/dL',
    range: { low: 70, high: 99 },
    conversions: { 'mmol/l': 18.016 },
    about: 'Fasting glucose is your blood sugar after not eating overnight.',
    lowMeans: 'Low fasting sugar can cause shakiness and dizziness.',
    highMeans: 'High fasting sugar can point to prediabetes or diabetes. PCOS raises this risk.',
    relatedConditions: ['DIABETES', 'PCOS'],
  },
  {
    code: 'TESTOSTERONE',
    name: 'Total testosterone',
    aliases: ['testosterone', 'total testosterone', 'testosterone total'],
    exclude: /free|bioavailable/,
    loinc: '2986-8',
    unit: 'ng/dL',
    range: { low: 15, high: 70 },
    conversions: { 'nmol/l': 28.84, 'ng/ml': 100 },
    about: 'Testosterone is an androgen. Women make small amounts of it.',
    lowMeans: 'Low testosterone in women is rarely a concern on its own.',
    highMeans:
      'High testosterone can cause acne, excess hair and irregular periods. Doctors look at it when checking for PCOS.',
    relatedConditions: ['PCOS'],
  },
  {
    code: 'LH',
    name: 'Luteinising hormone',
    aliases: ['lh', 'luteinizing hormone', 'luteinising hormone'],
    loinc: '10501-5',
    unit: 'mIU/mL',
    conversions: { 'iu/l': 1, 'miu/ml': 1 },
    about: 'LH triggers ovulation. Normal values depend on where you are in your cycle.',
    relatedConditions: ['PCOS'],
  },
  {
    code: 'FSH',
    name: 'Follicle stimulating hormone',
    aliases: ['fsh', 'follicle stimulating hormone'],
    loinc: '15067-2',
    unit: 'mIU/mL',
    conversions: { 'iu/l': 1, 'miu/ml': 1 },
    about: 'FSH helps eggs mature. Normal values depend on where you are in your cycle and your age.',
    relatedConditions: ['PCOS'],
  },
  {
    code: 'PROLACTIN',
    name: 'Prolactin',
    aliases: ['prolactin', 'serum prolactin'],
    loinc: '2842-3',
    unit: 'ng/mL',
    range: { low: 4.8, high: 23.3 },
    conversions: { 'ug/l': 1, 'miu/l': 0.0472 },
    about: 'Prolactin is the milk-making hormone. It can affect your periods.',
    lowMeans: 'Low prolactin is rarely a concern.',
    highMeans: 'High prolactin can cause irregular or missed periods. It is worth discussing with your doctor.',
    relatedConditions: [],
  },
  {
    code: 'AMH',
    name: 'Anti-Müllerian hormone',
    aliases: ['amh', 'anti mullerian hormone', 'anti müllerian hormone'],
    unit: 'ng/mL',
    conversions: { 'pmol/l': 0.14 },
    about: 'AMH reflects egg reserve. It is often higher in PCOS, and what counts as normal depends on age.',
    relatedConditions: ['PCOS'],
  },
];

const ANALYTE_BY_CODE = new Map(LAB_ANALYTES.map((a) => [a.code, a]));

export function getLabAnalyte(code: string): LabAnalyteDef | undefined {
  return ANALYTE_BY_CODE.get(code);
}

export const LAB_CODES = LAB_ANALYTES.map((a) => a.code) as [string, ...string[]];

function normalizeName(name: string): string {
  return ` ${name
    .toLowerCase()
    .replace(/[^a-z0-9%üö]+/g, ' ')
    .trim()} `;
}

export function normalizeUnit(unit: string): string {
  return unit
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[µμ]/g, 'u')
    .replace(/mcg/g, 'ug');
}

/** Find the catalog analyte a printed test name refers to, preferring the longest alias. */
export function matchLabAnalyte(printedName: string): LabAnalyteDef | undefined {
  const name = normalizeName(printedName);
  let best: { def: LabAnalyteDef; length: number } | undefined;
  for (const def of LAB_ANALYTES) {
    if (def.exclude?.test(name)) continue;
    for (const alias of def.aliases) {
      const needle = normalizeName(alias);
      if (name.includes(needle) && (!best || needle.length > best.length)) {
        best = { def, length: needle.length };
      }
    }
  }
  return best?.def;
}

/** Convert a value into the analyte's canonical unit, or null if the unit is unknown. */
export function toCanonicalUnit(def: LabAnalyteDef, value: number, unit?: string | null): number | null {
  if (!unit) return value;
  const normalized = normalizeUnit(unit);
  if (normalized === normalizeUnit(def.unit)) return value;
  const factor = def.conversions?.[normalized];
  return factor === undefined ? null : Math.round(value * factor * 1000) / 1000;
}

export function flagValue(value: number, low?: number | null, high?: number | null): LabFlag {
  const hasLow = low !== undefined && low !== null;
  const hasHigh = high !== undefined && high !== null;
  if (!hasLow && !hasHigh) return 'UNKNOWN';
  if (hasLow && value < low) return 'LOW';
  if (hasHigh && value > high) return 'HIGH';
  return 'NORMAL';
}

export interface RawLabResult {
  name: string;
  value: number;
  unit?: string | null;
  refLow?: number | null;
  refHigh?: number | null;
}

export interface InterpretedLabResult extends RawLabResult {
  code: string | null;
  flag: LabFlag;
  rangeSource: 'REPORT' | 'CATALOG' | 'NONE';
  explanation: string;
}

/**
 * Attach a catalog code, a flag and a plain-language explanation to an extracted result.
 * The report's printed reference range wins; the catalog range is a fallback only when
 * the unit can be converted safely.
 */
export function interpretLabResult(raw: RawLabResult): InterpretedLabResult {
  const def = matchLabAnalyte(raw.name);
  const hasReportRange = raw.refLow != null || raw.refHigh != null;

  let flag: LabFlag = 'UNKNOWN';
  let rangeSource: InterpretedLabResult['rangeSource'] = 'NONE';
  let refLow = raw.refLow ?? null;
  let refHigh = raw.refHigh ?? null;

  if (hasReportRange) {
    flag = flagValue(raw.value, refLow, refHigh);
    rangeSource = 'REPORT';
  } else if (def?.range) {
    const canonical = toCanonicalUnit(def, raw.value, raw.unit);
    if (canonical !== null) {
      flag = flagValue(canonical, def.range.low, def.range.high);
      rangeSource = 'CATALOG';
      if (normalizeUnit(raw.unit ?? def.unit) === normalizeUnit(def.unit)) {
        refLow = def.range.low ?? null;
        refHigh = def.range.high ?? null;
      }
    }
  }

  let explanation = def?.about ?? 'Ask your doctor what this result means for you.';
  if (flag === 'LOW' && def?.lowMeans) explanation = def.lowMeans;
  if (flag === 'HIGH' && def?.highMeans) explanation = def.highMeans;
  if (flag === 'NORMAL') explanation = `Within the reference range. ${def?.about ?? ''}`.trim();

  return { ...raw, refLow, refHigh, code: def?.code ?? null, flag, rangeSource, explanation };
}
