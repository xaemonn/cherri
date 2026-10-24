import {
  addDays,
  bloodPressureReadings,
  diffDays,
  formatDay,
  getLabAnalyte,
  getSymptom,
  latestLabsByCode,
  MEDICAL_DISCLAIMER,
  PHASE_GUIDES,
  SCREENINGS,
  summarizeSymptoms,
  weightReadings,
  type DoctorReport,
  type ISODate,
  type MoodShift,
  type ReportBackground,
  type ReportMedication,
  type ReportPregnancy,
  type ReportStory,
  type ScreeningType,
} from '@cherri/shared';
import type { HealthSnapshot } from '../insights/insights.service';
import type { ScreeningRecord } from '../screenings/screenings.service';

export type { DoctorReport };

export interface ReportExtras {
  rangeDays: number;
  notes: Array<{ date: ISODate; text: string }>;
  story: ReportStory | null;
  medications: ReportMedication[];
  background: ReportBackground | null;
  moodShifts: MoodShift[];
  mindChecks: NonNullable<DoctorReport['mindChecks']>;
}

const PCOS_FLAGS = ['INFREQUENT_PERIODS', 'IRREGULAR_CYCLES', 'NO_PERIOD_90_DAYS'];
const ANAEMIA_FLAGS = ['HEAVY_BLEEDING', 'LONG_PERIODS', 'FREQUENT_PERIODS', 'LOW_HAEMOGLOBIN', 'PREGNANCY_ANAEMIA', 'SEVERE_ANAEMIA'];
const BP_FLAGS = ['SEVERE_HYPERTENSION', 'PREECLAMPSIA_WARNING_SIGNS', 'HIGH_BP_MATERNAL', 'BP_RISING', 'HIGH_BP', 'VERY_HIGH_BP'];

function questionsFor(snap: HealthSnapshot, screenings: Map<ScreeningType, ScreeningRecord>, maxPain: number | null, extras: ReportExtras): string[] {
  const flags = new Set(snap.redFlags.map((f) => f.code));
  const concerning = (type: ScreeningType) => {
    const band = screenings.get(type)?.band;
    return band === 'HIGH' || band === 'MODERATE';
  };
  const labs = latestLabsByCode(snap.labs);
  const hb = labs.get('HB');
  const tsh = labs.get('TSH');
  const patternFeatures = new Set(snap.patterns.patterns.map((p) => p.feature));
  const q: string[] = [];

  // Her own question comes first: it's why she booked the visit.
  if (extras.story?.goals) q.push(extras.story.goals);

  if (BP_FLAGS.some((f) => flags.has(f)) && (snap.pregnancy || snap.postpartum)) {
    const latest = bloodPressureReadings(snap.logs).at(-1);
    q.push(
      `My blood pressure has been going up${latest ? ` (latest ${latest.systolic}/${latest.diastolic})` : ''}. Do I need closer monitoring, a urine protein test or treatment?`,
    );
  }
  if (flags.has('PREGNANCY_ANAEMIA') && hb) q.push(`My haemoglobin is ${hb.value} g/dL. Should my iron dose change, and when should it be rechecked?`);
  if (concerning('PCOS') || PCOS_FLAGS.some((f) => flags.has(f))) {
    q.push('Could my irregular cycles be caused by PCOS or a thyroid problem? Which tests should I get?');
  }
  if (concerning('ENDOMETRIOSIS') || flags.has('SEVERE_PERIOD_PAIN')) {
    q.push(
      `My period pain reaches ${maxPain ?? 'severe levels'}/10 and affects my daily life. Could this be endometriosis or adenomyosis, and what are my options beyond painkillers?`,
    );
  }
  if (flags.has('HEAVY_BLEEDING') || flags.has('LONG_PERIODS') || (hb?.flag === 'LOW' && !snap.pregnancy)) {
    q.push(
      `My periods are heavy${hb?.flag === 'LOW' ? ` and my haemoglobin was ${hb.value} g/dL` : ''}. Do I need iron treatment, and what is causing the bleeding?`,
    );
  }
  if (concerning('PMDD') || ['low_mood', 'irritability', 'anxiety', 'low_mood_score'].some((f) => patternFeatures.has(f))) {
    q.push('My mood changes every cycle before my period. Could this be PMDD, and what treatments are available?');
  }
  for (const shift of extras.moodShifts.slice(0, 1)) {
    q.push(`My mood has been lower since I started ${shift.medication}. Could it be related, and are there alternatives?`);
  }
  const highMind = extras.mindChecks.filter((m) => m.score >= 10);
  if (highMind.length > 0) {
    q.push(`My ${highMind.map((m) => `${m.type === 'PHQ9' ? 'PHQ-9' : 'GAD-7'} score was ${m.score}`).join(' and ')}. Can we talk about support or treatment?`);
  }
  if (tsh && tsh.flag !== 'NORMAL' && tsh.flag !== 'UNKNOWN') q.push(`My TSH was ${tsh.value}. Do I need treatment or a repeat test?`);
  if (patternFeatures.has('headache') || patternFeatures.has('migraine')) {
    q.push('My headaches follow my cycle. Could they be menstrual migraines?');
  }
  q.push('Is there anything you would like me to keep tracking before our next visit?');
  return [...new Set(q)].slice(0, 6);
}

/** What a clinician would usually want to see that isn't in her records yet (so absence isn't mistaken for "normal"). */
function notYetOnRecord(snap: HealthSnapshot, screenings: Map<ScreeningType, ScreeningRecord>, extras: ReportExtras): string[] {
  const flags = new Set(snap.redFlags.map((f) => f.code));
  const labs = latestLabsByCode(snap.labs);
  const gaps: string[] = [];
  const pcosSignals = PCOS_FLAGS.some((f) => flags.has(f)) || ['HIGH', 'MODERATE'].includes(screenings.get('PCOS')?.band ?? '');
  const anaemiaSignals = ANAEMIA_FLAGS.some((f) => flags.has(f)) || ['HIGH', 'MODERATE'].includes(screenings.get('ANEMIA')?.band ?? '');

  if (snap.pregnancy) {
    const pregnancyStart = addDays(snap.pregnancy.dueDate, -280);
    const lastBp = bloodPressureReadings(snap.logs).at(-1);
    if (!lastBp || diffDays(snap.today, lastBp.date) > 14) gaps.push('No blood pressure reading in the last 2 weeks');
    if (!snap.labs.some((l) => l.code === 'HB' && l.takenAt >= pregnancyStart)) gaps.push('No haemoglobin result during this pregnancy');
  }
  if (pcosSignals && !labs.has('TSH')) gaps.push('No thyroid test (TSH) on record');
  if (pcosSignals && !labs.has('TESTOSTERONE')) gaps.push('No testosterone result on record');
  if (anaemiaSignals && !labs.has('HB')) gaps.push('No haemoglobin (CBC) result on record');
  if (anaemiaSignals && labs.get('HB')?.flag === 'LOW' && !labs.has('FERRITIN')) gaps.push('No ferritin (iron stores) result on record');
  const stats = snap.prediction?.stats;
  if (snap.prediction && (stats?.completedCycles ?? 0) < 3) gaps.push('Fewer than 3 full cycles logged, so cycle statistics are provisional');
  if (extras.medications.length === 0) gaps.push('Current medicines not listed');
  if (!extras.background?.allergies) gaps.push('Allergies not recorded');
  return gaps.slice(0, 6);
}

/** A few plain sentences, built only from the numbers in the report: nothing is generated or guessed. */
function summarize(report: Omit<DoctorReport, 'summary'>): string {
  const { patient, cycle, pain, pregnancy, vitals } = report;
  const who = [patient.firstName ?? 'The patient', patient.age ? `${patient.age}` : null].filter(Boolean).join(', ');
  const parts: string[] = [];

  if (pregnancy?.stage === 'PREGNANCY') {
    parts.push(`${who}, ${pregnancy.weeks}+${pregnancy.days} weeks pregnant (due ${formatDay(pregnancy.dueDate, { year: true })}).`);
  } else if (pregnancy?.stage === 'POSTPARTUM') {
    parts.push(`${who}, ${pregnancy.weeksSinceBirth} weeks after giving birth (${formatDay(pregnancy.deliveryDate, { year: true })}).`);
  } else {
    parts.push(`${who}. ${report.loggedDays} days logged between ${formatDay(report.rangeStart, { year: true })} and ${formatDay(report.rangeEnd, { year: true })}.`);
  }
  const bp = vitals?.bloodPressure ?? [];
  if (bp.length > 0) {
    const latest = bp.at(-1)!;
    const highest = bp.reduce((a, b) => (b.systolic > a.systolic ? b : a));
    parts.push(
      `Latest BP ${latest.systolic}/${latest.diastolic} (${formatDay(latest.date)})${highest !== latest ? `, highest ${highest.systolic}/${highest.diastolic}` : ''}, from ${bp.length} readings.`,
    );
  }
  if (cycle?.averageCycleLength) {
    parts.push(`Cycles average ${cycle.averageCycleLength} days (range ${cycle.shortestCycle}–${cycle.longestCycle}), ${cycle.regularity.toLowerCase()}.`);
  }
  if (pain.maximum != null && pain.maximum >= 4) parts.push(`Pain reached ${pain.maximum}/10, with ${pain.daysAt6OrMore} days at 6/10 or more.`);
  const top = report.symptoms.slice(0, 3).map((s) => `${(s.clinicalTerm ?? s.label).toLowerCase()} (${Math.round(s.shareOfLoggedDays * 100)}%)`);
  if (top.length) parts.push(`Most logged: ${top.join(', ')} of logged days.`);
  const abnormal = report.labs.filter((l) => l.flag === 'LOW' || l.flag === 'HIGH').slice(0, 3);
  if (abnormal.length) parts.push(`Out-of-range labs: ${abnormal.map((l) => `${l.name} ${l.value}${l.unit ? ` ${l.unit}` : ''} (${l.flag.toLowerCase()})`).join(', ')}.`);
  const urgent = report.redFlags.filter((f) => f.severity === 'URGENT');
  if (urgent.length) parts.push(`Needs prompt attention: ${urgent.map((f) => f.title.toLowerCase()).join('; ')}.`);
  return parts.join(' ');
}

/** Builds the clinician-facing summary: clinical terms, numbers first, no fluff. */
export function buildDoctorReport(snap: HealthSnapshot, screenings: Map<ScreeningType, ScreeningRecord>, extras: ReportExtras): DoctorReport {
  const rangeStart = addDays(snap.today, -extras.rangeDays + 1);
  const logsInRange = snap.logs.filter((l) => l.date >= rangeStart);
  const periodsInRange = snap.periods.filter((p) => p.startDate >= addDays(rangeStart, -60));

  const periodPain = logsInRange
    .filter((l) => l.painLevel != null && snap.periods.some((p) => l.date >= p.startDate && l.date <= (p.endDate ?? addDays(p.startDate, 6))))
    .map((l) => l.painLevel!);
  const allPain = logsInRange.map((l) => l.painLevel).filter((p): p is number => p != null);
  const maxPain = allPain.length ? Math.max(...allPain) : null;

  const stats = snap.prediction?.stats;
  const last = snap.periods.at(-1);
  const pregnancy: ReportPregnancy | null = snap.pregnancy
    ? { stage: 'PREGNANCY', weeks: snap.pregnancy.weeks, days: snap.pregnancy.days, trimester: snap.pregnancy.trimester, dueDate: snap.pregnancy.dueDate }
    : snap.postpartum && snap.user.deliveryDate
      ? { stage: 'POSTPARTUM', deliveryDate: addDays(snap.today, -snap.postpartum.days), weeksSinceBirth: snap.postpartum.weeks }
      : null;
  const bloodPressure = bloodPressureReadings(logsInRange).slice(-30).map(({ date, systolic, diastolic }) => ({ date, systolic, diastolic }));
  const weight = weightReadings(logsInRange).slice(-20);
  const shiftByMedication = new Map(extras.moodShifts.map((s) => [s.medication, { before: s.before, after: s.after }]));

  const report: Omit<DoctorReport, 'summary'> = {
    version: 1,
    generatedAt: new Date().toISOString(),
    rangeStart,
    rangeEnd: snap.today,
    patient: {
      firstName: snap.user.name?.split(/\s+/)[0] ?? null,
      age: snap.age,
      lifeStage: snap.user.lifeStage,
      knownConditions: snap.user.conditions,
    },
    cycle: stats
      ? {
          averageCycleLength: stats.avgCycleLength,
          shortestCycle: stats.shortestCycle,
          longestCycle: stats.longestCycle,
          variability: stats.variability,
          regularity: stats.regularity,
          averagePeriodLength: stats.avgPeriodLength,
          lastPeriodStart: last?.startDate ?? null,
          nextExpected: snap.prediction?.nextPeriod?.date ?? null,
          history: periodsInRange.map((p, i, arr) => {
            const next = arr[i + 1];
            return {
              start: p.startDate,
              end: p.endDate ?? null,
              periodDays: p.endDate ? diffDays(p.endDate, p.startDate) + 1 : null,
              cycleLength: next ? diffDays(next.startDate, p.startDate) : null,
            };
          }),
        }
      : null,
    pain: {
      averageDuringPeriod: periodPain.length ? Math.round((periodPain.reduce((a, b) => a + b, 0) / periodPain.length) * 10) / 10 : null,
      maximum: maxPain,
      daysAt6OrMore: allPain.filter((p) => p >= 6).length,
    },
    symptoms: summarizeSymptoms(snap.logs, snap.periods, {
      today: snap.today,
      expectedCycleLength: snap.expectedCycleLength,
      defaultPeriodLength: snap.user.avgPeriodLength,
      days: extras.rangeDays,
    })
      .slice(0, 12)
      .map((s) => ({
        label: s.label,
        clinicalTerm: getSymptom(s.code)?.clinicalTerm ?? null,
        days: s.days,
        shareOfLoggedDays: s.share,
        avgSeverity: s.avgSeverity,
        peakPhase: s.peakPhase ? PHASE_GUIDES[s.peakPhase].name : null,
      })),
    patterns: snap.patterns.patterns.map((p) => `${p.message} (p=${p.pValue < 0.001 ? '<0.001' : p.pValue})`),
    redFlags: snap.redFlags.map(({ severity, title, detail }) => ({ severity, title, detail })),
    screenings: [...screenings.values()].map((s) => ({
      title: SCREENINGS[s.type].title,
      band: s.band,
      summary: s.result.summary,
      date: s.createdAt.slice(0, 10),
      basis: SCREENINGS[s.type].basis,
    })),
    labs: [...latestLabsByCode(snap.labs).values()].map((lab) => {
      const previous = snap.labs.filter((l) => l.code === lab.code && l.takenAt < lab.takenAt).at(-1);
      const analyte = getLabAnalyte(lab.code!);
      return {
        name: analyte?.name ?? lab.name,
        value: lab.value,
        unit: lab.unit ?? null,
        flag: lab.flag,
        takenAt: lab.takenAt,
        previous: previous ? { value: previous.value, takenAt: previous.takenAt } : null,
        loinc: analyte?.loinc ?? null,
      };
    }),
    questionsToAsk: questionsFor(snap, screenings, maxPain, extras),
    notes: extras.notes,
    loggedDays: logsInRange.length,
    disclaimer: `Patient-generated tracking data summarised by Cherri. Screening results are not diagnoses. ${MEDICAL_DISCLAIMER}`,
    story: extras.story,
    background: extras.background,
    medications: extras.medications.map((m) => ({ ...m, moodChange: shiftByMedication.get(m.name) ?? null })),
    pregnancy,
    vitals: bloodPressure.length || weight.length ? { bloodPressure, weight } : null,
    notYetOnRecord: notYetOnRecord(snap, screenings, extras),
    mindChecks: extras.mindChecks,
  };
  return { ...report, summary: summarize(report) };
}
