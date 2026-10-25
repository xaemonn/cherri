/**
 * Medicine & food guardian: when and how to take the medicines women most often use, and which
 * ones block each other. Rules follow standard prescribing information (BNF, FSRH, ATA); they are
 * general guidance, and her doctor's or pharmacist's instructions come first.
 */
export const MEDICINE_CLASSES = [
  'LEVOTHYROXINE',
  'IRON',
  'CALCIUM',
  'ANTACID',
  'NSAID',
  'COMBINED_PILL',
  'PROGESTOGEN_PILL',
  'METFORMIN',
  'FOLIC_ACID',
  'VITAMIN_D',
] as const;
export type MedicineClass = (typeof MEDICINE_CLASSES)[number];

export const MEDICINE_CLASS_LABELS: Record<MedicineClass, string> = {
  LEVOTHYROXINE: 'Thyroid hormone',
  IRON: 'Iron',
  CALCIUM: 'Calcium',
  ANTACID: 'Antacid / acid reducer',
  NSAID: 'Painkiller (NSAID)',
  COMBINED_PILL: 'Birth control pill',
  PROGESTOGEN_PILL: 'Progestogen-only pill',
  METFORMIN: 'Metformin',
  FOLIC_ACID: 'Folic acid',
  VITAMIN_D: 'Vitamin D',
};

/** Generic and common Indian brand names. A medicine can belong to more than one class (e.g. calcium + vitamin D3). */
const CLASS_PATTERNS: ReadonlyArray<readonly [MedicineClass, RegExp]> = [
  ['LEVOTHYROXINE', /levothyrox|thyronorm|eltroxin|thyrox|euthyrox|lethyrox|thyroid (tablet|hormone)/i],
  ['IRON', /\biron\b|ferr(ous|ic)|\bifa\b|livogen|orofer|autrin|fefol|dexorange|feronia|ferium|haemup/i],
  ['CALCIUM', /calcium|shelcal|calcimax|ostocalcium|cipcal|gemcal|\bccm\b/i],
  ['ANTACID', /antacid|digene|gelusil|mucaine|pantoprazole|pantocid|pan[ -]?(?:40|d)\b|omeprazole|omez|rabeprazole|razo|esomeprazole|ranitidine|famotidine/i],
  ['NSAID', /meftal|mefenamic|ibuprofen|brufen|combiflam|naproxen|naprosyn|diclofenac|voveran|aceclofenac|zerodol|ketorolac|nimesulide|aspirin|disprin/i],
  ['COMBINED_PILL', /ovral|krimson|yasmin|\byaz\b|diane|novelon|mala[- ]?[dn]\b|loette|femilon|ginette|\bocp\b|birth control|contraceptive pill|the pill|combined pill|drospirenone|ethinyl/i],
  ['PROGESTOGEN_PILL', /cerazette|desogestrel|mini[- ]?pill|progestogen[- ]only|\bpop\b/i],
  ['METFORMIN', /metformin|glycomet|glucophage|gluconorm|obimet|cetapin/i],
  ['FOLIC_ACID', /folic|folvite|folate|\bifa\b/i],
  ['VITAMIN_D', /vitamin d|\bd3\b|uprise|calcirol|cholecalciferol|arachitol/i],
];

export function classifyMedicine(name: string): MedicineClass[] {
  return CLASS_PATTERNS.filter(([, re]) => re.test(name)).map(([cls]) => cls);
}

export type GuardSeverity = 'INFO' | 'WARNING' | 'DANGER';

export interface GuardRule {
  title: string;
  detail: string;
  severity: GuardSeverity;
}

export const MEDICINE_RULES: Record<MedicineClass, { when: string; rules: GuardRule[] }> = {
  LEVOTHYROXINE: {
    when: 'First thing in the morning, empty stomach, plain water',
    rules: [
      { title: 'Empty stomach, plain water', detail: 'Swallow it as soon as you wake up, with water only.', severity: 'INFO' },
      { title: 'Wait 45–60 minutes', detail: 'No tea, coffee or breakfast for 45 to 60 minutes, otherwise your body absorbs less of the hormone.', severity: 'WARNING' },
      { title: '4 hours from iron, calcium and antacids', detail: 'They bind the hormone in your gut. Take them at lunch or dinner instead.', severity: 'WARNING' },
    ],
  },
  IRON: {
    when: 'After a light meal, with lemon water',
    rules: [
      { title: 'After a light meal', detail: 'A little food first helps prevent nausea and stomach upset.', severity: 'INFO' },
      { title: 'No chai, coffee, milk or calcium for 2 hours', detail: 'Tea, coffee, milk and calcium all block iron absorption.', severity: 'WARNING' },
      { title: 'Pair it with vitamin C', detail: 'Lemon water, amla, orange or guava with your tablet helps your body take in more iron.', severity: 'INFO' },
      { title: 'Dark stools are normal', detail: 'Black or dark green stools are expected on iron. Constipation? Drink more water and eat more fibre.', severity: 'INFO' },
    ],
  },
  CALCIUM: {
    when: 'With food, away from iron',
    rules: [
      { title: 'Take it with food', detail: 'Calcium carbonate needs stomach acid to dissolve, so take it with or right after a meal.', severity: 'INFO' },
      { title: 'Keep it away from iron and thyroid tablets', detail: 'Leave at least 4 hours between calcium and iron or levothyroxine.', severity: 'WARNING' },
    ],
  },
  ANTACID: {
    when: 'Away from iron and thyroid tablets',
    rules: [
      { title: '4 hours from iron and thyroid tablets', detail: 'Antacids and acid reducers stop iron and levothyroxine from being absorbed.', severity: 'WARNING' },
      { title: 'Long-term acid reducers', detail: 'Months of pantoprazole or omeprazole can lower iron and vitamin B12. Ask your doctor whether you still need it.', severity: 'INFO' },
    ],
  },
  NSAID: {
    when: 'Always after food',
    rules: [
      { title: 'Never on an empty stomach', detail: 'Always take it after food to protect your stomach lining from irritation and ulcers.', severity: 'WARNING' },
      { title: 'Start early for period pain', detail: 'Taken at the first sign of cramps, these work better than waiting until the pain peaks.', severity: 'INFO' },
      { title: 'One painkiller at a time', detail: 'Don’t combine two NSAIDs (for example Meftal and ibuprofen). It adds side effects, not relief.', severity: 'WARNING' },
    ],
  },
  COMBINED_PILL: {
    when: 'At the same hour every day',
    rules: [
      { title: 'Same hour, every day', detail: 'Taking your pill at varying times increases spotting and the chance of pregnancy. Set a daily alarm.', severity: 'WARNING' },
      { title: 'Vomiting or diarrhoea', detail: 'Vomiting within 2 hours of the pill, or severe diarrhoea for over 24 hours, can count as a missed pill.', severity: 'INFO' },
      { title: 'Missed a pill?', detail: 'Use the missed-pill helper below for exactly what to do.', severity: 'INFO' },
    ],
  },
  PROGESTOGEN_PILL: {
    when: 'At the same time every day, within your pill’s window',
    rules: [
      { title: 'A strict window', detail: 'Traditional mini-pills must be taken within 3 hours of your usual time; desogestrel pills within 12 hours.', severity: 'WARNING' },
      { title: 'No pill-free break', detail: 'Take one every day, with no break between packs.', severity: 'INFO' },
    ],
  },
  METFORMIN: {
    when: 'With or right after meals',
    rules: [
      { title: 'With meals', detail: 'Taking it with food reduces nausea, bloating and loose stools.', severity: 'INFO' },
      { title: 'Ask about vitamin B12', detail: 'Long-term metformin can lower vitamin B12; a yearly check is worth asking for.', severity: 'INFO' },
    ],
  },
  FOLIC_ACID: {
    when: 'Once a day, any time',
    rules: [{ title: 'Every day', detail: 'Most important in the months before pregnancy and the first 3 months of pregnancy.', severity: 'INFO' }],
  },
  VITAMIN_D: {
    when: 'With your biggest meal',
    rules: [{ title: 'With food that has some fat', detail: 'Vitamin D is absorbed better with a meal containing some fat or oil.', severity: 'INFO' }],
  },
};

export interface MedicineConflict {
  a: string;
  b: string;
  severity: GuardSeverity;
  message: string;
}

const PAIR_CONFLICTS: ReadonlyArray<{ a: MedicineClass; b: MedicineClass; severity: GuardSeverity; message: string }> = [
  {
    a: 'IRON',
    b: 'CALCIUM',
    severity: 'WARNING',
    message: 'Calcium blocks iron absorption. Space them at least 4 hours apart, for example iron after lunch and calcium after dinner.',
  },
  { a: 'IRON', b: 'ANTACID', severity: 'WARNING', message: 'Antacids and acid reducers block iron. Take iron at least 4 hours away from them.' },
  {
    a: 'LEVOTHYROXINE',
    b: 'IRON',
    severity: 'WARNING',
    message: 'Iron binds thyroid hormone in your gut. Take levothyroxine on waking and iron at least 4 hours later.',
  },
  {
    a: 'LEVOTHYROXINE',
    b: 'CALCIUM',
    severity: 'WARNING',
    message: 'Calcium blocks thyroid hormone absorption. Keep them at least 4 hours apart.',
  },
  { a: 'LEVOTHYROXINE', b: 'ANTACID', severity: 'WARNING', message: 'Antacids reduce levothyroxine absorption. Keep them at least 4 hours apart.' },
];

export interface MedicineGuidance {
  medicines: Array<{ id?: string; name: string; classes: MedicineClass[]; when: string | null; rules: GuardRule[] }>;
  conflicts: MedicineConflict[];
}

/** Timing rules for each medicine, plus clashes between the ones she takes together. */
export function medicineGuidance(
  medicines: ReadonlyArray<{ id?: string; name: string }>,
  context: { pregnant?: boolean } = {},
): MedicineGuidance {
  const items = medicines.map((m) => {
    const classes = classifyMedicine(m.name);
    const rules = classes.flatMap((cls) => MEDICINE_RULES[cls].rules);
    return { ...(m.id && { id: m.id }), name: m.name, classes, when: classes.length ? MEDICINE_RULES[classes[0]!].when : null, rules };
  });

  const conflicts: MedicineConflict[] = [];
  for (const rule of PAIR_CONFLICTS) {
    const first = items.find((i) => i.classes.includes(rule.a));
    const second = items.find((i) => i !== first && i.classes.includes(rule.b));
    if (first && second) conflicts.push({ a: first.name, b: second.name, severity: rule.severity, message: rule.message });
  }
  const nsaids = items.filter((i) => i.classes.includes('NSAID'));
  if (nsaids.length >= 2) {
    conflicts.push({
      a: nsaids[0]!.name,
      b: nsaids[1]!.name,
      severity: 'DANGER',
      message: 'These are both NSAID painkillers. Taking them together raises the risk of stomach bleeding and kidney strain without better pain relief. Use one, and ask a pharmacist if it isn’t enough.',
    });
  }
  if (context.pregnant && nsaids.length > 0) {
    conflicts.push({
      a: nsaids[0]!.name,
      b: 'pregnancy',
      severity: 'DANGER',
      message: 'NSAID painkillers such as ibuprofen and mefenamic acid are usually avoided in pregnancy, especially after 20 weeks, unless your doctor prescribed them. Paracetamol is the usual choice. Ask your doctor before your next dose.',
    });
  }
  return { medicines: items, conflicts };
}

export const PILL_TYPES = ['COMBINED', 'PROGESTOGEN_ONLY', 'DESOGESTREL'] as const;
export type PillType = (typeof PILL_TYPES)[number];

export const PILL_TYPE_LABELS: Record<PillType, string> = {
  COMBINED: 'Combined pill (e.g. Ovral-L, Krimson 35, Yasmin): 21 active pills + break',
  PROGESTOGEN_ONLY: 'Traditional mini-pill (3-hour window)',
  DESOGESTREL: 'Desogestrel mini-pill, e.g. Cerazette (12-hour window)',
};

export interface MissedPillInput {
  pillType: PillType;
  /** Hours since the pill should have been taken. */
  hoursLate: number;
  /** Which week of the pack (combined pills only): 1–3 active weeks, or the break/placebo week. */
  packWeek?: 1 | 2 | 3 | 'BREAK';
  /** Unprotected sex in the 7 days before the missed pill. */
  recentSex?: boolean;
}

export interface MissedPillAdvice {
  headline: string;
  steps: string[];
  takeTwoToday: boolean;
  backupDays: number;
  emergencyContraception: 'NOT_NEEDED' | 'CONSIDER' | 'RECOMMENDED';
  note: string;
}

/** Missed-pill steps from the FSRH guidance (UK Faculty of Sexual & Reproductive Healthcare), in plain words. */
export function missedPillAdvice(input: MissedPillInput): MissedPillAdvice {
  const hours = Math.max(0, input.hoursLate);
  const note = 'If you are unsure, a pharmacist or your doctor can check with you. Missing pills is common; it isn’t your fault.';

  if (input.pillType === 'COMBINED') {
    if (input.packWeek === 'BREAK') {
      return {
        headline: 'Missed pills in your break week don’t matter',
        steps: ['Throw away the missed inactive (sugar) pills.', 'Start your next pack on the usual day.'],
        takeTwoToday: false,
        backupDays: 0,
        emergencyContraception: 'NOT_NEEDED',
        note,
      };
    }
    if (hours < 48) {
      return {
        headline: hours < 24 ? 'Your pill is late, but you’re still protected' : 'One missed pill: you’re still protected',
        steps: [
          'Take the missed pill now, even if that means taking two pills today.',
          'Take the rest of the pack at your usual time.',
          'No extra contraception is needed.',
        ],
        takeTwoToday: true,
        backupDays: 0,
        emergencyContraception: 'NOT_NEEDED',
        note,
      };
    }
    const steps = [
      'Take the most recent missed pill now (two pills today is fine). Leave any earlier missed pills in the pack.',
      'Carry on taking one pill a day at your usual time.',
      'Use condoms, or avoid sex, for the next 7 days.',
    ];
    let ec: MissedPillAdvice['emergencyContraception'] = 'NOT_NEEDED';
    if (input.packWeek === 1 && input.recentSex) {
      steps.push('You missed pills in week 1 and had unprotected sex in the past 7 days: emergency contraception is recommended. Open the emergency contraception helper now.');
      ec = 'RECOMMENDED';
    } else if (input.packWeek === 1) {
      steps.push('If you have unprotected sex before you’ve taken 7 pills in a row, you may need emergency contraception.');
      ec = 'CONSIDER';
    }
    if (input.packWeek === 3) steps.push('You’re in week 3: finish the active pills and start the next pack straight away, skipping the break (or the sugar pills).');
    return {
      headline: 'Two or more missed pills: you need backup for 7 days',
      steps,
      takeTwoToday: true,
      backupDays: 7,
      emergencyContraception: ec,
      note,
    };
  }

  const window = input.pillType === 'DESOGESTREL' ? 12 : 3;
  if (hours <= window) {
    return {
      headline: 'You’re within your pill’s window',
      steps: ['Take your pill now.', 'Take the next one at your usual time. No extra contraception is needed.'],
      takeTwoToday: false,
      backupDays: 0,
      emergencyContraception: 'NOT_NEEDED',
      note,
    };
  }
  return {
    headline: `More than ${window} hours late: you need backup for 2 days`,
    steps: [
      'Take one pill now (only one, even if you missed more). Take the next at your usual time, even if that means two today.',
      'Use condoms, or avoid sex, for the next 2 days (48 hours).',
      input.recentSex
        ? 'You had unprotected sex since the pill was due or in the last 2 days: emergency contraception is recommended. Open the emergency contraception helper now.'
        : 'If you have unprotected sex in the next 2 days, you may need emergency contraception.',
    ],
    takeTwoToday: true,
    backupDays: 2,
    emergencyContraception: input.recentSex ? 'RECOMMENDED' : 'CONSIDER',
    note,
  };
}
