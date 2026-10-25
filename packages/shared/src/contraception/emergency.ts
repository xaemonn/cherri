import { addDays, type ISODate } from '../dates';

/**
 * Emergency contraception triage: how likely conception is, which options still work and for how
 * long, and what to expect afterwards. Based on FSRH emergency contraception guidance and WHO data.
 * Nothing here is stored except an optional test reminder date.
 */
export const EC_EVENTS = ['UNPROTECTED_SEX', 'CONDOM_BROKE', 'MISSED_PILL'] as const;
export type EcEvent = (typeof EC_EVENTS)[number];

export const EC_EVENT_LABELS: Record<EcEvent, string> = {
  UNPROTECTED_SEX: 'Sex without contraception',
  CONDOM_BROKE: 'Condom broke or slipped',
  MISSED_PILL: 'Missed or late birth control pill',
};

export type ConceptionRisk = 'HIGH' | 'MODERATE' | 'LOW';

export interface RiskInput {
  /** Day of her cycle on which the event happened (day 1 = first day of period). Null if unknown. */
  cycleDay: number | null;
  cycleLength: number;
  /** Cycle length varies a lot, so ovulation is harder to place. */
  irregular: boolean;
}

export interface RiskAssessment {
  risk: ConceptionRisk;
  ovulationDay: number;
  fertileStart: number;
  fertileEnd: number;
  explanation: string;
}

/** Fertile window: the 5 days before ovulation and the day after (sperm survive up to 5 days). */
export function conceptionRisk({ cycleDay, cycleLength, irregular }: RiskInput): RiskAssessment {
  const length = Math.min(60, Math.max(21, Math.round(cycleLength)));
  const ovulationDay = length - 14;
  const fertileStart = Math.max(1, ovulationDay - 5);
  const fertileEnd = ovulationDay + 1;
  const base = { ovulationDay, fertileStart, fertileEnd };
  const caveat = ' Ovulation can shift from cycle to cycle, so no day is completely risk-free.';

  if (cycleDay === null) {
    return { ...base, risk: 'MODERATE', explanation: `Without your cycle day, Cherri can’t place your fertile window, so treat this as a real risk.${caveat}` };
  }
  if (cycleDay >= fertileStart && cycleDay <= fertileEnd) {
    return {
      ...base,
      risk: 'HIGH',
      explanation: `Day ${cycleDay} falls inside your likely fertile window (days ${fertileStart}–${fertileEnd}), when pregnancy is most likely.${caveat}`,
    };
  }
  const near = cycleDay >= fertileStart - 3 && cycleDay <= fertileEnd + 2;
  if (near || irregular) {
    return {
      ...base,
      risk: 'MODERATE',
      explanation: irregular
        ? `Your cycles vary a lot, so your fertile window (around days ${fertileStart}–${fertileEnd}) is hard to pin down.${caveat}`
        : `Day ${cycleDay} is close to your likely fertile window (days ${fertileStart}–${fertileEnd}).${caveat}`,
    };
  }
  return { ...base, risk: 'LOW', explanation: `Day ${cycleDay} is outside your likely fertile window (days ${fertileStart}–${fertileEnd}).${caveat}` };
}

export interface EcOption {
  id: 'LNG' | 'UPA' | 'CU_IUD';
  name: string;
  examples: string;
  windowHours: number;
  hoursLeft: number;
  available: boolean;
  efficacy: string;
  notes: string[];
}

/** Levonorgestrel effectiveness by hours since sex (WHO randomised trial, Lancet 1998). */
function lngEfficacy(hours: number): string {
  if (hours <= 24) return 'Most effective now: prevents up to about 95% of expected pregnancies';
  if (hours <= 48) return 'Still works, less well: about 85%';
  if (hours <= 72) return 'Works less well: about 58%. Take it as soon as possible';
  return 'No longer effective after 72 hours';
}

export function ecOptions(hoursSince: number): EcOption[] {
  const h = Math.max(0, hoursSince);
  const left = (window: number) => Math.max(0, Math.round((window - h) * 10) / 10);
  return [
    {
      id: 'LNG',
      name: 'Levonorgestrel 1.5 mg pill',
      examples: 'i-pill, Unwanted-72, Plan B. Sold over the counter at chemists.',
      windowHours: 72,
      hoursLeft: left(72),
      available: h <= 72,
      efficacy: lngEfficacy(h),
      notes: ['One tablet, as soon as possible.', 'May work less well if you weigh over 70 kg: a copper IUD works regardless of weight.'],
    },
    {
      id: 'UPA',
      name: 'Ulipristal acetate 30 mg pill',
      examples: 'Needs a prescription in India and isn’t stocked everywhere; ask a doctor or pharmacist.',
      windowHours: 120,
      hoursLeft: left(120),
      available: h <= 120,
      efficacy: h <= 120 ? 'Works up to 5 days (120 hours) and keeps its effect better than levonorgestrel over that time' : 'No longer effective after 120 hours',
      notes: ['Don’t take levonorgestrel within 5 days after ulipristal: it stops ulipristal from working.'],
    },
    {
      id: 'CU_IUD',
      name: 'Copper IUD (Cu-T), fitted at a clinic',
      examples: 'Free at government health centres; also gives you contraception for 5 to 10 years.',
      windowHours: 120,
      hoursLeft: left(120),
      available: h <= 120,
      efficacy: h <= 120 ? 'The most effective option: prevents over 99% of pregnancies when fitted within 5 days' : 'Past 5 days; a doctor may still fit one depending on when you ovulated',
      notes: ['Needs a short clinic visit with a doctor or trained nurse.'],
    },
  ];
}

export const AFTER_EMERGENCY_PILL: readonly string[] = [
  'Light spotting in the next few days is common. It comes from the hormone dose and is not your period.',
  'Your next period may come up to a week earlier or later than usual.',
  'One emergency pill covers this accident; taking a second one for the same accident doesn’t add protection. If you have unprotected sex again later in this cycle, ask a pharmacist before taking another.',
  'Emergency pills aren’t meant for regular use. Ask about a regular method; the pill, injection (Antara), Chhaya or a Cu-T are free at government centres.',
  'If you vomit within 3 hours of the pill, take another dose.',
  'Take a pregnancy test if your period is more than 7 days late, or on the reminder date below.',
];

/** A home urine test is reliable 21 days after unprotected sex. */
export function pregnancyTestDate(eventDate: ISODate): ISODate {
  return addDays(eventDate, 21);
}
