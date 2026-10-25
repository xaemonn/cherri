/**
 * The danger-sign check from the MoHFW Mother and Child Protection card and WHO's
 * "Pregnancy, childbirth, postpartum and newborn care" guide, as plain yes/no questions.
 * Deterministic on purpose: no AI decides whether she goes to hospital.
 */
export type DangerStage = 'PREGNANCY' | 'POSTPARTUM';
export type DangerLevel = 'RED' | 'AMBER' | 'GREEN';
export type DangerAnswer = 'YES' | 'NO' | 'UNSURE';

export interface DangerQuestion {
  id: string;
  text: string;
  /** RED: go to hospital now. AMBER: see a doctor, ANM or ASHA today. */
  level: Exclude<DangerLevel, 'GREEN'>;
  /** Only asked from this week of pregnancy. */
  fromWeek?: number;
}

export const DANGER_QUESTIONS: Record<DangerStage, readonly DangerQuestion[]> = {
  PREGNANCY: [
    { id: 'bleeding', text: 'Any bleeding from the vagina, even a little?', level: 'RED' },
    { id: 'fits', text: 'Fits (convulsions), or fainting?', level: 'RED' },
    { id: 'headache_vision', text: 'A severe headache, or blurred vision or seeing spots?', level: 'RED' },
    { id: 'belly_pain', text: 'Severe pain in your belly that does not go away?', level: 'RED' },
    { id: 'water_leak', text: 'Water or fluid leaking from the vagina?', level: 'RED' },
    { id: 'movement', text: 'Is your baby moving less than usual, or not at all?', level: 'RED', fromWeek: 20 },
    { id: 'breathing', text: 'Difficulty breathing, or pain in your chest?', level: 'RED' },
    { id: 'swelling', text: 'Sudden swelling of your face or hands?', level: 'AMBER' },
    { id: 'fever', text: 'Fever?', level: 'AMBER' },
    { id: 'vomiting', text: 'Vomiting so much that you can’t keep food or water down?', level: 'AMBER' },
    { id: 'urine', text: 'Burning or pain when you pass urine?', level: 'AMBER' },
    { id: 'leg', text: 'Pain, redness or swelling in one leg?', level: 'AMBER' },
    { id: 'mood', text: 'Feeling very low, hopeless or unable to cope on most days?', level: 'AMBER' },
  ],
  POSTPARTUM: [
    { id: 'pp_bleeding', text: 'Heavy bleeding: soaking a pad in an hour or less, or passing large clots?', level: 'RED' },
    { id: 'pp_fits', text: 'Fits (convulsions), or fainting?', level: 'RED' },
    { id: 'pp_headache_vision', text: 'A severe headache, or blurred vision?', level: 'RED' },
    { id: 'pp_breathing', text: 'Difficulty breathing, or pain in your chest?', level: 'RED' },
    { id: 'pp_harm', text: 'Thoughts of harming yourself or your baby?', level: 'RED' },
    { id: 'pp_fever', text: 'Fever or chills?', level: 'AMBER' },
    { id: 'pp_discharge', text: 'Foul-smelling discharge from the vagina?', level: 'AMBER' },
    { id: 'pp_leg', text: 'Pain, redness or swelling in one leg?', level: 'AMBER' },
    { id: 'pp_breast', text: 'A painful, red or hot area on your breast?', level: 'AMBER' },
    { id: 'pp_wound', text: 'Stitches or a C-section wound that is red, swollen or leaking?', level: 'AMBER' },
    { id: 'pp_mood', text: 'Feeling very low or anxious for more than two weeks?', level: 'AMBER' },
  ],
};

export function dangerQuestionsFor(stage: DangerStage, weeks?: number | null): DangerQuestion[] {
  return DANGER_QUESTIONS[stage].filter((q) => q.fromWeek === undefined || weeks == null || weeks >= q.fromWeek);
}

export interface DangerAssessment {
  level: DangerLevel;
  /** Signs she said yes to, most serious first. */
  signs: DangerQuestion[];
  /** Serious signs she wasn't sure about: these escalate the result. */
  unsure: DangerQuestion[];
  headline: string;
  action: string;
  call: string[];
}

const RESULT: Record<DangerLevel, { headline: string; action: string; call: string[] }> = {
  RED: {
    headline: 'Go to the hospital now',
    action: 'Go to the nearest hospital or community health centre straight away. Take your MCP card. Call 102 or 108 for free transport. Don’t wait to see if it gets better.',
    call: ['102', '108', '112'],
  },
  AMBER: {
    headline: 'See a doctor today',
    action: 'Talk to your doctor, ANM or ASHA today. If it gets worse, or a new danger sign appears, go to the hospital.',
    call: ['102', '108'],
  },
  GREEN: {
    headline: 'No danger sign reported',
    action: 'Keep going to your check-ups and do this check again whenever something feels different.',
    call: [],
  },
};

/**
 * One "yes" to a RED sign means hospital now. "Not sure" about a RED sign counts as at least
 * AMBER: missing a danger sign costs more than an extra check-up.
 */
export function assessDangerSigns(stage: DangerStage, answers: Readonly<Record<string, DangerAnswer>>, weeks?: number | null): DangerAssessment {
  const questions = dangerQuestionsFor(stage, weeks);
  const signs = questions.filter((q) => answers[q.id] === 'YES').sort((a, b) => (a.level === b.level ? 0 : a.level === 'RED' ? -1 : 1));
  const unsure = questions.filter((q) => q.level === 'RED' && answers[q.id] === 'UNSURE');
  const level: DangerLevel = signs.some((s) => s.level === 'RED') ? 'RED' : signs.length > 0 || unsure.length > 0 ? 'AMBER' : 'GREEN';
  const result = RESULT[level];
  const mentalHealth = signs.some((s) => s.id === 'pp_harm' || s.id === 'mood' || s.id === 'pp_mood');
  return {
    level,
    signs,
    unsure,
    headline: result.headline,
    action: mentalHealth ? `${result.action} For support with how you feel, call Tele-MANAS on 14416 (free, 24×7).` : result.action,
    call: mentalHealth ? [...result.call, '14416'] : result.call,
  };
}
