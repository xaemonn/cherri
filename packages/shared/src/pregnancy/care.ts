import { addDays, diffDays, type ISODate } from '../dates';

/** Naegele's rule: the due date is 280 days after the first day of the last period. */
export const PREGNANCY_DAYS = 280;
/** The postnatal period during which danger signs are watched most closely (WHO, MoHFW). */
export const POSTNATAL_DAYS = 42;

export function dueDateFromLmp(lmp: ISODate): ISODate {
  return addDays(lmp, PREGNANCY_DAYS);
}

export interface GestationalAge {
  weeks: number;
  days: number;
  totalDays: number;
  /** 1: up to 13+6 weeks, 2: 14 to 27+6, 3: from 28 weeks (ACOG). */
  trimester: 1 | 2 | 3;
  daysToGo: number;
  dueDate: ISODate;
}

/** Weeks + days of pregnancy from her due date; null when the date can't belong to a current pregnancy. */
export function gestationalAge(dueDate: ISODate, today: ISODate): GestationalAge | null {
  const totalDays = PREGNANCY_DAYS - diffDays(dueDate, today);
  if (totalDays < 0 || totalDays > 44 * 7) return null;
  const weeks = Math.floor(totalDays / 7);
  return {
    weeks,
    days: totalDays % 7,
    totalDays,
    trimester: weeks < 14 ? 1 : weeks < 28 ? 2 : 3,
    daysToGo: Math.max(0, diffDays(dueDate, today)),
    dueDate,
  };
}

export interface PostpartumAge {
  days: number;
  weeks: number;
  /** Within the 6 weeks after birth. */
  postnatal: boolean;
}

export function postpartumAge(deliveryDate: ISODate, today: ISODate): PostpartumAge | null {
  const days = diffDays(today, deliveryDate);
  if (days < 0 || days > 730) return null;
  return { days, weeks: Math.floor(days / 7), postnatal: days <= POSTNATAL_DAYS };
}

/** Rough sizes from fetal growth charts, in produce she will recognise. */
const BABY_SIZES: ReadonlyArray<readonly [week: number, emoji: string, name: string]> = [
  [4, '', 'a poppy seed (khus khus)'],
  [5, '', 'a sesame seed (til)'],
  [6, '', 'a grain of masoor dal'],
  [7, '', 'a peanut'],
  [8, '', 'a rajma bean'],
  [9, '', 'a grape'],
  [10, '', 'a date (khajoor)'],
  [11, '', 'a fig (anjeer)'],
  [12, '', 'a lime (nimbu)'],
  [13, '', 'a pea pod'],
  [14, '', 'a lemon'],
  [15, '', 'an apple'],
  [16, '', 'a guava (amrood)'],
  [18, '', 'a sweet potato'],
  [19, '', 'a mango'],
  [20, '', 'a banana'],
  [21, '', 'a carrot'],
  [22, '', 'a long cucumber'],
  [24, '', 'a corn cob (bhutta)'],
  [26, '', 'a mooli'],
  [28, '', 'a brinjal (baingan)'],
  [30, '', 'a cabbage'],
  [32, '', 'a coconut'],
  [34, '', 'a musk melon (kharbuja)'],
  [36, '', 'a pineapple'],
  [38, '', 'a small watermelon'],
  [40, '', 'a pumpkin (kaddu)'],
];

export function babySize(weeks: number): { emoji: string; name: string } | null {
  const row = [...BABY_SIZES].reverse().find(([week]) => weeks >= week);
  return row ? { emoji: row[1], name: row[2] } : null;
}

export type CareStepKind = 'VISIT' | 'TEST' | 'VACCINE' | 'SUPPLEMENT' | 'PLAN';
export type CareStepStatus = 'DONE' | 'NOW' | 'NEXT';

export interface CareStep {
  id: string;
  /** Inclusive window: pregnancy weeks for antenatal steps, days after birth for postnatal ones. */
  from: number;
  to: number;
  kind: CareStepKind;
  title: string;
  detail: string;
}

/**
 * Antenatal care in India: at least 4 check-ups (MoHFW), with the tests, vaccines and
 * free supplements that go with them. WHO now advises 8 contacts; more visits are better.
 */
export const ANTENATAL_STEPS: readonly CareStep[] = [
  {
    id: 'register',
    from: 0,
    to: 12,
    kind: 'VISIT',
    title: 'Register your pregnancy (check-up 1)',
    detail:
      'Visit your nearest health centre, ANM or doctor before 12 weeks to get your Mother and Child Protection (MCP) card. Ask for blood group, haemoglobin, blood sugar, urine, HIV, syphilis and hepatitis B tests.',
  },
  {
    id: 'folic',
    from: 0,
    to: 12,
    kind: 'SUPPLEMENT',
    title: 'Folic acid every day',
    detail: 'A daily folic acid tablet in the first 3 months protects your baby’s brain and spine. It is free at government health centres.',
  },
  {
    id: 'td',
    from: 4,
    to: 20,
    kind: 'VACCINE',
    title: 'Td (tetanus-diphtheria) vaccine',
    detail: 'Two doses four weeks apart, early in pregnancy. If you had two doses in a pregnancy within the last 3 years, one booster is enough.',
  },
  {
    id: 'dating_scan',
    from: 11,
    to: 14,
    kind: 'TEST',
    title: 'First ultrasound (dating scan)',
    detail: 'Confirms your due date and checks early development. Best done between 11 and 14 weeks.',
  },
  {
    id: 'ifa_calcium',
    from: 14,
    to: 40,
    kind: 'SUPPLEMENT',
    title: 'Iron (IFA) and calcium tablets',
    detail:
      'From the 4th month, take one iron-folic acid tablet a day and calcium twice a day, for at least 180 days. Free under Anemia Mukt Bharat. Take them at different times, and not with tea.',
  },
  {
    id: 'deworm',
    from: 14,
    to: 27,
    kind: 'SUPPLEMENT',
    title: 'Deworming tablet',
    detail: 'One albendazole tablet in the second trimester helps prevent anaemia.',
  },
  {
    id: 'anc2',
    from: 14,
    to: 26,
    kind: 'VISIT',
    title: 'Check-up 2',
    detail: 'Blood pressure, weight, haemoglobin, urine and your baby’s growth.',
  },
  {
    id: 'anomaly_scan',
    from: 18,
    to: 22,
    kind: 'TEST',
    title: 'Anomaly scan',
    detail: 'A detailed ultrasound that checks your baby’s organs and growth.',
  },
  {
    id: 'gdm',
    from: 24,
    to: 28,
    kind: 'TEST',
    title: 'Sugar test (75 g OGTT)',
    detail: 'Screens for diabetes in pregnancy, even if your first sugar test was normal.',
  },
  {
    id: 'kicks',
    from: 28,
    to: 42,
    kind: 'PLAN',
    title: 'Know your baby’s movements',
    detail: 'Notice your baby’s usual pattern every day. If the movements slow down or stop, contact your doctor straight away. Don’t wait until tomorrow.',
  },
  {
    id: 'anc3',
    from: 28,
    to: 34,
    kind: 'VISIT',
    title: 'Check-up 3',
    detail: 'Blood pressure, weight, haemoglobin and your baby’s growth and heartbeat.',
  },
  {
    id: 'birth_plan',
    from: 32,
    to: 36,
    kind: 'PLAN',
    title: 'Plan your birth',
    detail:
      'Choose your hospital and keep your MCP card, ID and some money ready. Save 102 for free transport. Delivery in a government hospital is free under JSSK.',
  },
  {
    id: 'anc4',
    from: 36,
    to: 40,
    kind: 'VISIT',
    title: 'Check-up 4',
    detail: 'Checks your baby’s position and your readiness for birth.',
  },
  {
    id: 'past_due',
    from: 40,
    to: 42,
    kind: 'PLAN',
    title: 'Around your due date',
    detail: 'If labour hasn’t started by 41 weeks, your doctor will discuss next steps. Go in straight away if your waters break or you bleed.',
  },
];

/** The first six weeks after birth and beyond (MoHFW home-based newborn care and PNC guidance). */
export const POSTNATAL_STEPS: readonly CareStep[] = [
  {
    id: 'asha_visits',
    from: 0,
    to: 42,
    kind: 'VISIT',
    title: 'ASHA home visits',
    detail: 'Your ASHA visits on days 3, 7, 14, 21, 28 and 42 (and on day 1 after a home birth) to check you and your baby.',
  },
  {
    id: 'danger_watch',
    from: 0,
    to: 42,
    kind: 'PLAN',
    title: 'Watch for danger signs for 6 weeks',
    detail: 'Heavy bleeding, fever, foul-smelling discharge, a severe headache, breathlessness or a painful swollen leg need a doctor the same day.',
  },
  {
    id: 'breastfeeding',
    from: 0,
    to: 180,
    kind: 'PLAN',
    title: 'Only breastmilk for 6 months',
    detail: 'Start within the first hour if you can. Ask your ASHA or nurse for help with latching. Pain or a red, hot breast needs a check.',
  },
  {
    id: 'ifa_postnatal',
    from: 0,
    to: 180,
    kind: 'SUPPLEMENT',
    title: 'Keep taking iron (IFA) for 6 months',
    detail: 'One IFA tablet a day for 180 days after birth refills the iron you lost. Free at government health centres.',
  },
  {
    id: 'six_week_check',
    from: 35,
    to: 56,
    kind: 'VISIT',
    title: '6-week check-up for you',
    detail: 'Blood pressure, healing, mood and family planning. This visit is for you, not only the baby.',
  },
  {
    id: 'family_planning',
    from: 42,
    to: 365,
    kind: 'PLAN',
    title: 'Choose a family planning method',
    detail: 'You can get pregnant again before your periods return. PPIUCD, the Antara injection and Chhaya pills are free at government centres.',
  },
  {
    id: 'mind',
    from: 0,
    to: 365,
    kind: 'PLAN',
    title: 'Look after your mind',
    detail: 'Feeling weepy for a few days after birth is common. If sadness lasts more than 2 weeks, or you have frightening thoughts, talk to a doctor or call Tele-MANAS on 14416.',
  },
];

export function careStepStatus(step: CareStep, at: number): CareStepStatus {
  if (at > step.to) return 'DONE';
  return at >= step.from ? 'NOW' : 'NEXT';
}

export interface MaternalScheme {
  name: string;
  short: string;
  description: string;
  url: string;
}

export const MATERNAL_SCHEMES: readonly MaternalScheme[] = [
  {
    name: 'Janani Shishu Suraksha Karyakram',
    short: 'JSSK',
    description:
      'Free delivery (including C-section), medicines, tests, food during your stay and free transport at government hospitals, plus free care for your sick baby up to one year.',
    url: 'https://nhm.gov.in',
  },
  {
    name: 'Pradhan Mantri Surakshit Matritva Abhiyan',
    short: 'PMSMA',
    description: 'A free check-up by a doctor on the 9th of every month at government health facilities, for the 2nd and 3rd trimesters.',
    url: 'https://pmsma.mohfw.gov.in',
  },
  {
    name: 'Pradhan Mantri Matru Vandana Yojana',
    short: 'PMMVY',
    description: '₹5,000 for your first child, and ₹6,000 for a second child if she is a girl, paid into your bank account. Register at your Anganwadi centre.',
    url: 'https://pmmvy.wcd.gov.in',
  },
  {
    name: 'Janani Suraksha Yojana',
    short: 'JSY',
    description: 'Cash assistance for giving birth in a hospital, mainly for low-income families. Your ASHA can help you apply.',
    url: 'https://nhm.gov.in',
  },
];

/** PMSMA runs on the 9th of every month. */
export function nextPmsmaDay(today: ISODate): ISODate {
  const [year, month, day] = today.split('-').map(Number) as [number, number, number];
  if (day <= 9) return `${today.slice(0, 7)}-09`;
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
  return `${next}-09`;
}
