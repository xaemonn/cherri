import { BLEEDING_FLOWS, type Condition, type LifeStage } from '../constants';
import { addDays, diffDays, type ISODate } from '../dates';
import { computeCycleStats, validCycleLengths, type CyclePrediction } from '../cycle/predict';
import { sortPeriods, type PeriodRecord } from '../cycle/phases';
import { POSTNATAL_DAYS } from '../pregnancy/care';
import { pbacCycles } from './pbac';
import { latestLabsByCode, type LabRecord, type LogRecord } from './types';
import { bloodPressureReadings, classifyBloodPressure, pressureRise, rapidWeightGain } from './vitals';

export type RedFlagSeverity = 'INFO' | 'WARNING' | 'URGENT';

export interface RedFlag {
  code: string;
  severity: RedFlagSeverity;
  title: string;
  detail: string;
  action: string;
  relatedCondition?: Condition;
}

export interface RedFlagInput {
  today: ISODate;
  lifeStage: LifeStage;
  age?: number | null;
  /** Age at her first period; decides which cycle lengths count as irregular. */
  menarcheAge?: number | null;
  /** Completed weeks of pregnancy, when she has given a due date. */
  pregnancyWeeks?: number | null;
  /** Days since she gave birth, when she has given a delivery date. */
  postpartumDays?: number | null;
  periods: readonly PeriodRecord[];
  logs: readonly LogRecord[];
  labs: readonly LabRecord[];
  prediction?: CyclePrediction | null;
}

const SEVERITY_ORDER: Record<RedFlagSeverity, number> = { URGENT: 0, WARNING: 1, INFO: 2 };
const SEE_GYNAE = 'Book a visit with a gynaecologist and share your Cherri doctor report.';
const PREECLAMPSIA_SIGNS: Record<string, string> = {
  headache: 'headache',
  blurred_vision: 'blurred vision',
  upper_belly_pain: 'pain under the ribs',
  swelling: 'swelling',
};

const hasSymptom = (log: LogRecord, code: string) => log.symptoms.some((s) => s.code === code);

/**
 * Rule-based checks for patterns that should not be ignored. Thresholds follow
 * common clinical guidance (ACOG/NICE/FIGO/WHO/MoHFW); each flag says what to do next.
 */
export function detectRedFlags(input: RedFlagInput): RedFlag[] {
  const { today, lifeStage, logs } = input;
  const flags: RedFlag[] = [];
  const periods = sortPeriods(input.periods).filter((p) => p.startDate <= today);
  const cycling = lifeStage === 'CYCLE' || lifeStage === 'TTC' || lifeStage === 'PERIMENOPAUSE';
  const recentLogs = logs.filter((l) => diffDays(today, l.date) <= 90 && l.date <= today);
  const bleedingLogs = recentLogs.filter((l) => l.flow && l.flow !== 'NONE');
  const maternal = lifeStage === 'PREGNANCY' || (lifeStage === 'POSTPARTUM' && (input.postpartumDays ?? 0) <= POSTNATAL_DAYS);

  if (lifeStage === 'MENOPAUSE' && bleedingLogs.length > 0) {
    flags.push({
      code: 'POSTMENOPAUSAL_BLEEDING',
      severity: 'URGENT',
      title: 'Bleeding after menopause',
      detail: 'Any bleeding or spotting after menopause should be checked by a doctor.',
      action: 'Please see a gynaecologist within the next few days.',
    });
  }

  if (lifeStage === 'PREGNANCY') {
    const worrying = recentLogs.filter(
      (l) => diffDays(today, l.date) <= 3 && ((l.flow && BLEEDING_FLOWS.includes(l.flow)) || (l.painLevel ?? 0) >= 7),
    );
    if (worrying.length > 0) {
      flags.push({
        code: 'PREGNANCY_BLEEDING_OR_PAIN',
        severity: 'URGENT',
        title: 'Bleeding or strong pain in pregnancy',
        detail: 'Bleeding or severe belly pain during pregnancy needs to be checked the same day.',
        action: 'Contact your doctor or go to the nearest hospital today. In an emergency call 108 or 112.',
      });
    }
    flags.push(...pregnancyFlags(input, recentLogs));
  }

  if (maternal) flags.push(...maternalBloodPressureFlags(input, recentLogs));
  else flags.push(...bloodPressureFlags(today, recentLogs));

  if (lifeStage === 'POSTPARTUM') flags.push(...postpartumFlags(input, recentLogs));

  if (cycling && periods.length > 0) flags.push(...cycleFlags(input, periods, bleedingLogs));

  flags.push(...labFlags(input));

  return flags.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

function cycleFlags(input: RedFlagInput, periods: PeriodRecord[], bleedingLogs: LogRecord[]): RedFlag[] {
  const { today, logs, age } = input;
  const flags: RedFlag[] = [];
  const last = periods.at(-1)!;
  const daysSince = diffDays(today, last.startDate);
  const lengths = validCycleLengths(periods).slice(-3);

  // 2023 International PCOS Guideline: cycles are expected to be irregular in the first year after
  // the first period; for the next two years "irregular" means < 21 or > 45 days, after that > 35 days.
  const yearsSinceMenarche = input.menarcheAge != null && age != null ? age - input.menarcheAge : null;
  const firstYear = yearsSinceMenarche !== null && yearsSinceMenarche < 1;
  const earlyYears = yearsSinceMenarche !== null ? yearsSinceMenarche < 3 : age != null && age < 20;
  const transition = (age != null && age >= 45) || input.lifeStage === 'PERIMENOPAUSE';
  const upperLimit = earlyYears ? 45 : 35;
  // Irregular cycles alone don't point to PCOS in the first years after menarche or in the menopause transition.
  const pcosRelevant = !earlyYears && !transition;
  const context = earlyYears
    ? ' In the first few years after your first period, cycles up to 45 days apart are common.'
    : transition
      ? ' From your mid-40s, changing cycles are often part of the menopause transition.'
      : '';

  if (daysSince >= 90) {
    flags.push({
      code: 'NO_PERIOD_90_DAYS',
      severity: 'WARNING',
      title: 'No period for 3 months or more',
      detail: `It has been ${daysSince} days since your last period. Missed periods can be caused by pregnancy, PCOS, thyroid problems, stress or weight changes.`,
      action: `If there is any chance of pregnancy, take a test. ${SEE_GYNAE}`,
      ...(pcosRelevant && { relatedCondition: 'PCOS' as const }),
    });
  } else if (input.prediction?.nextPeriod?.isLate && input.prediction.nextPeriod.daysLate >= 7) {
    flags.push({
      code: 'LATE_PERIOD',
      severity: 'INFO',
      title: `Period ${input.prediction.nextPeriod.daysLate} days late`,
      detail: 'Stress, illness, travel or changes in sleep and diet can delay a period.',
      action: 'If there is any chance of pregnancy, take a home pregnancy test.',
    });
  }

  if (!firstYear && lengths.filter((l) => l > upperLimit).length >= 2) {
    flags.push({
      code: 'INFREQUENT_PERIODS',
      severity: 'WARNING',
      title: 'Cycles longer than usual',
      detail: `Your recent cycles were ${lengths.join(', ')} days. Cycles over ${upperLimit} days can be a sign of PCOS or thyroid issues.${context}`,
      action: pcosRelevant ? 'Try the PCOS check, then book a visit with a gynaecologist and share your Cherri doctor report.' : SEE_GYNAE,
      ...(pcosRelevant && { relatedCondition: 'PCOS' as const }),
    });
  }
  if (!firstYear && lengths.filter((l) => l < 21).length >= 2) {
    flags.push({
      code: 'FREQUENT_PERIODS',
      severity: 'WARNING',
      title: 'Periods coming very often',
      detail: `Your recent cycles were ${lengths.join(', ')} days. Periods closer than 21 days apart can lead to anaemia and should be checked.`,
      action: SEE_GYNAE,
      relatedCondition: 'ANEMIA',
    });
  }

  const stats = computeCycleStats(periods);
  if (!firstYear && stats.completedCycles >= 4 && stats.regularity === 'IRREGULAR') {
    flags.push({
      code: 'IRREGULAR_CYCLES',
      severity: 'INFO',
      title: 'Irregular cycles',
      detail: `Your cycle length varies by ${stats.variability} days. Variation over about 9 days counts as irregular.${context}`,
      action: 'Keep logging. Cherri will include this in your doctor report.',
      ...(pcosRelevant && { relatedCondition: 'PCOS' as const }),
    });
  }

  // STRAW+10: a persistent difference of 7+ days between consecutive cycles (early) or a 60+ day gap (late).
  if (age != null && age >= 40) {
    const recent = validCycleLengths(periods).slice(-6);
    const jumps = recent.slice(1).filter((l, i) => Math.abs(l - recent[i]!) >= 7).length;
    const longGap = recent.find((l) => l >= 60);
    if (jumps >= 2 || longGap) {
      flags.push({
        code: 'MENOPAUSE_TRANSITION',
        severity: 'INFO',
        title: 'Signs of the menopause transition',
        detail: longGap
          ? `One of your recent cycles lasted ${longGap} days. After 40, gaps of 60 days or more are a common sign of perimenopause.`
          : 'Your cycle length has changed by a week or more between cycles. After 40, this is a common early sign of perimenopause.',
        action: 'Hot flushes, poor sleep or mood changes? Tell your doctor: there are safe, effective treatments. Very heavy or very frequent bleeding should always be checked.',
      });
    }
  }

  const recentPeriods = periods.slice(-3);
  const longPeriod = recentPeriods.find((p) => p.endDate && diffDays(p.endDate, p.startDate) + 1 > 7);
  if (longPeriod) {
    flags.push({
      code: 'LONG_PERIODS',
      severity: 'WARNING',
      title: 'Periods lasting more than 7 days',
      detail: 'Bleeding for more than 7 days can be caused by fibroids, polyps or hormone changes, and can lead to anaemia.',
      action: SEE_GYNAE,
      relatedCondition: 'ANEMIA',
    });
  }

  // PBAC (Higham 1990): a measured score over 100 is heavy menstrual bleeding, stronger evidence than "heavy" flow taps.
  const measured = pbacCycles(recentPeriods, logs, today).at(-1);
  if (measured?.heavy) {
    const clots = measured.clotsLarge > 0 ? ` You logged ${measured.clotsLarge} large clot${measured.clotsLarge === 1 ? '' : 's'}.` : '';
    flags.push({
      code: 'PBAC_HEAVY',
      severity: 'WARNING',
      title: `Heavy menstrual bleeding (PBAC ${measured.score})`,
      detail: `Your blood loss for the period starting ${measured.start} is clinically classified as heavy (PBAC score ${measured.score}, about ${measured.estimatedMl} mL; heavy is over 100 points or 80 mL).${clots} Bleeding like this raises your risk of iron-deficiency anaemia and can be a sign of causes such as fibroids or polyps.`,
      action: `Ask for haemoglobin and ferritin tests and a pelvic ultrasound. ${SEE_GYNAE}`,
      relatedCondition: 'ANEMIA',
    });
  }

  const heavyPeriods = recentPeriods.filter((p) => {
    const end = p.endDate ?? addDays(p.startDate, 9);
    const days = logs.filter((l) => l.date >= p.startDate && l.date <= end);
    const heavyDays = days.filter((l) => l.flow === 'HEAVY').length;
    const heavySigns = days.filter((l) => hasSymptom(l, 'heavy_bleeding') || hasSymptom(l, 'clots')).length;
    return heavyDays >= 3 || heavySigns >= 2;
  });
  if (!measured?.heavy && (heavyPeriods.length >= 2 || (heavyPeriods.length === 1 && recentPeriods.length === 1))) {
    flags.push({
      code: 'HEAVY_BLEEDING',
      severity: 'WARNING',
      title: 'Heavy periods',
      detail: 'Heavy bleeding, such as soaking a pad every 1–2 hours or passing large clots, is a leading cause of anaemia in India.',
      action: `Ask for a haemoglobin and ferritin test. ${SEE_GYNAE}`,
      relatedCondition: 'ANEMIA',
    });
  }

  const severePainPeriods = recentPeriods.filter((p) => {
    const end = p.endDate ?? addDays(p.startDate, 6);
    return logs.some((l) => l.date >= p.startDate && l.date <= end && (l.painLevel ?? 0) >= 8);
  });
  if (severePainPeriods.length >= 2) {
    flags.push({
      code: 'SEVERE_PERIOD_PAIN',
      severity: 'WARNING',
      title: 'Severe period pain',
      detail: 'Pain of 8/10 or more during your periods is not something you just have to bear. It can be a sign of endometriosis or adenomyosis.',
      action: `Try the endometriosis check. ${SEE_GYNAE}`,
      relatedCondition: 'ENDOMETRIOSIS',
    });
  }

  const bleedingOutside = bleedingLogs.filter(
    (l) =>
      !periods.some((p) => {
        const end = p.endDate ?? addDays(p.startDate, 7);
        return l.date >= addDays(p.startDate, -2) && l.date <= addDays(end, 2);
      }),
  );
  if (bleedingOutside.length >= 2) {
    flags.push({
      code: 'BLEEDING_BETWEEN_PERIODS',
      severity: 'WARNING',
      title: 'Bleeding between periods',
      detail: `You logged bleeding or spotting on ${bleedingOutside.length} days outside your periods in the last 3 months.`,
      action: SEE_GYNAE,
    });
  }
  return flags;
}

/** Danger signs logged in pregnancy (MoHFW Mother and Child Protection card, RCOG on fetal movements). */
function pregnancyFlags(input: RedFlagInput, recentLogs: LogRecord[]): RedFlag[] {
  const { today } = input;
  const flags: RedFlag[] = [];
  const within = (days: number) => recentLogs.filter((l) => diffDays(today, l.date) <= days);

  if ((input.pregnancyWeeks ?? 24) >= 24 && within(2).some((l) => hasSymptom(l, 'reduced_fetal_movement'))) {
    flags.push({
      code: 'REDUCED_FETAL_MOVEMENTS',
      severity: 'URGENT',
      title: 'Baby moving less',
      detail: 'You logged that your baby is moving less than usual. A change in movements can be an early sign that the baby needs checking.',
      action: 'Contact your doctor or go to the hospital now. Don’t wait until tomorrow, and don’t rely on a home heartbeat monitor.',
    });
  }
  if (within(2).some((l) => hasSymptom(l, 'fluid_leak'))) {
    flags.push({
      code: 'FLUID_LEAK',
      severity: 'URGENT',
      title: 'Leaking fluid',
      detail: 'Fluid leaking from the vagina can mean your waters have broken, which needs checking even before labour pains start.',
      action: 'Go to the hospital today. Call 102 for free transport.',
    });
  }
  if (within(3).some((l) => hasSymptom(l, 'fever'))) {
    flags.push({
      code: 'FEVER_IN_PREGNANCY',
      severity: 'WARNING',
      title: 'Fever in pregnancy',
      detail: 'Fever in pregnancy can come from infections such as a urine infection or malaria, which need treatment.',
      action: 'See your doctor today. Paracetamol is generally considered safe in pregnancy; ask before taking anything else.',
    });
  }
  const weightJump = (input.pregnancyWeeks ?? 20) >= 20 ? rapidWeightGain(recentLogs) : null;
  if (weightJump) {
    flags.push({
      code: 'RAPID_WEIGHT_GAIN',
      severity: 'WARNING',
      title: 'Sudden weight gain',
      detail: `You gained ${weightJump.gainKg} kg between ${weightJump.fromDate} and ${weightJump.toDate}. Gaining more than 3 kg in a month can be fluid building up.`,
      action: 'Get your blood pressure and urine checked this week.',
    });
  }
  return flags;
}

/** Blood pressure in pregnancy and the 6 weeks after birth (ACOG, NICE NG133; MAP rise as in Project Lucina). */
function maternalBloodPressureFlags(input: RedFlagInput, recentLogs: LogRecord[]): RedFlag[] {
  const { today } = input;
  const readings = bloodPressureReadings(recentLogs);
  const lastWeek = readings.filter((r) => diffDays(today, r.date) <= 7);
  const severe = lastWeek.find((r) => classifyBloodPressure(r.systolic, r.diastolic) === 'SEVERE');
  const when = input.lifeStage === 'PREGNANCY' ? 'in pregnancy' : 'after giving birth';

  if (severe) {
    return [
      {
        code: 'SEVERE_HYPERTENSION',
        severity: 'URGENT',
        title: 'Very high blood pressure',
        detail: `Your blood pressure was ${severe.systolic}/${severe.diastolic} on ${severe.date}. A reading of 160/110 or more ${when} needs treatment the same day.`,
        action: 'Go to the hospital now. Call 102 or 108 if you need transport.',
      },
    ];
  }

  const high = lastWeek.filter((r) => classifyBloodPressure(r.systolic, r.diastolic) === 'HIGH').at(-1);
  if (high) {
    const lateEnough = input.lifeStage === 'POSTPARTUM' || (input.pregnancyWeeks ?? 20) >= 20;
    const signs = [
      ...new Set(
        recentLogs
          .filter((l) => Math.abs(diffDays(l.date, high.date)) <= 3)
          .flatMap((l) => l.symptoms.map((s) => PREECLAMPSIA_SIGNS[s.code]).filter((s): s is string => Boolean(s))),
      ),
    ];
    if (lateEnough && signs.length > 0) {
      return [
        {
          code: 'PREECLAMPSIA_WARNING_SIGNS',
          severity: 'URGENT',
          title: 'High blood pressure with warning signs',
          detail: `Your blood pressure was ${high.systolic}/${high.diastolic} on ${high.date}, and you logged ${signs.join(', ')}. Together these can be signs of pre-eclampsia.`,
          action: 'Go to the hospital today: this needs checking within hours, not days.',
        },
      ];
    }
    return [
      {
        code: 'HIGH_BP_MATERNAL',
        severity: 'WARNING',
        title: 'High blood pressure reading',
        detail: `Your blood pressure was ${high.systolic}/${high.diastolic} on ${high.date}. ${when === 'in pregnancy' ? 'In pregnancy' : 'After birth'}, 140/90 or more should be checked by a doctor.`,
        action: 'Rest for 15 minutes and measure again. If it is still 140/90 or more, contact your doctor today.',
      },
    ];
  }

  const rise = pressureRise(readings);
  if (rise && rise.rise >= 15) {
    return [
      {
        code: 'BP_RISING',
        severity: 'INFO',
        title: 'Blood pressure creeping up',
        detail: `Your mean arterial pressure has gone from about ${rise.baselineMap} to ${rise.currentMap} mmHg since ${rise.baselineSince}, though still under 140/90.`,
        action: 'Mention it at your next check-up and measure twice a week. A headache, blurred vision or swelling means see a doctor the same day.',
      },
    ];
  }
  return [];
}

function bloodPressureFlags(today: ISODate, recentLogs: LogRecord[]): RedFlag[] {
  const readings = bloodPressureReadings(recentLogs).filter((r) => diffDays(today, r.date) <= 30);
  const crisis = readings.filter((r) => diffDays(today, r.date) <= 7).find((r) => r.systolic >= 180 || r.diastolic >= 120);
  if (crisis) {
    return [
      {
        code: 'VERY_HIGH_BP',
        severity: 'URGENT',
        title: 'Very high blood pressure',
        detail: `Your blood pressure was ${crisis.systolic}/${crisis.diastolic} on ${crisis.date}. 180/120 or more needs to be rechecked today.`,
        action: 'Get it rechecked today. With chest pain, breathlessness, weakness or trouble speaking, call 108 or 112.',
      },
    ];
  }
  const high = readings.filter((r) => r.systolic >= 140 || r.diastolic >= 90);
  if (high.length >= 2) {
    return [
      {
        code: 'HIGH_BP',
        severity: 'WARNING',
        title: 'High blood pressure readings',
        detail: `${high.length} of your readings in the last month were 140/90 or higher (latest ${high.at(-1)!.systolic}/${high.at(-1)!.diastolic}).`,
        action: 'See a doctor in the next few weeks. Raised blood pressure usually has no symptoms but is very treatable.',
      },
    ];
  }
  return [];
}

function postpartumFlags(input: RedFlagInput, recentLogs: LogRecord[]): RedFlag[] {
  const { today } = input;
  const flags: RedFlag[] = [];
  const days = input.postpartumDays;
  if (days != null && days <= POSTNATAL_DAYS && recentLogs.some((l) => diffDays(today, l.date) <= 3 && hasSymptom(l, 'fever'))) {
    flags.push({
      code: 'POSTNATAL_FEVER',
      severity: 'WARNING',
      title: 'Fever after giving birth',
      detail: 'Fever in the weeks after birth can be an infection of the womb, breast, wound or urine, which needs treatment.',
      action: 'See your doctor today, sooner if you also have foul-smelling discharge or belly pain.',
    });
  }
  // "Baby blues" fade within about two weeks; low mood after that can be postnatal depression (NICE CG192).
  if (days == null || days >= 14) {
    const lowDays = recentLogs.filter(
      (l) => diffDays(today, l.date) < 14 && (hasSymptom(l, 'low_mood') || hasSymptom(l, 'anxiety') || (l.mood ?? 5) <= 1),
    ).length;
    if (lowDays >= 5) {
      flags.push({
        code: 'POSTNATAL_LOW_MOOD',
        severity: 'WARNING',
        title: 'Low mood after birth',
        detail: `You logged low mood or anxiety on ${lowDays} of the last 14 days. Postnatal depression is common, is not your fault and gets better with support.`,
        action: 'Talk to your doctor or ASHA, or call Tele-MANAS on 14416 (free, 24×7).',
      });
    }
  }
  return flags;
}

function labFlags(input: RedFlagInput): RedFlag[] {
  const flags: RedFlag[] = [];
  const labs = latestLabsByCode(input.labs);
  const hb = labs.get('HB');
  if (hb && input.lifeStage === 'PREGNANCY') {
    // WHO: anaemia in pregnancy is Hb below 11 g/dL, severe below 7.
    if (hb.value < 7) {
      flags.push({
        code: 'SEVERE_ANAEMIA',
        severity: 'URGENT',
        title: 'Very low haemoglobin in pregnancy',
        detail: `Your haemoglobin was ${hb.value} g/dL on ${hb.takenAt}. Below 7 in pregnancy is severe anaemia.`,
        action: 'Please see a doctor within the next day or two: you may need iron by injection or other treatment.',
        relatedCondition: 'ANEMIA',
      });
    } else if (hb.value < 11) {
      flags.push({
        code: 'PREGNANCY_ANAEMIA',
        severity: 'WARNING',
        title: 'Anaemia in pregnancy',
        detail: `Your haemoglobin was ${hb.value} g/dL on ${hb.takenAt}. In pregnancy, below 11 counts as anaemia.`,
        action: 'Take your IFA tablet every day (free under Anemia Mukt Bharat) and ask your doctor whether you need a higher dose and a repeat test.',
        relatedCondition: 'ANEMIA',
      });
    }
  } else if (hb && hb.value < 8) {
    flags.push({
      code: 'SEVERE_ANAEMIA',
      severity: 'URGENT',
      title: 'Very low haemoglobin',
      detail: `Your haemoglobin was ${hb.value} g/dL on ${hb.takenAt}. This is severe anaemia.`,
      action: 'Please see a doctor within the next day or two.',
      relatedCondition: 'ANEMIA',
    });
  } else if (hb && hb.flag === 'LOW') {
    flags.push({
      code: 'LOW_HAEMOGLOBIN',
      severity: 'WARNING',
      title: 'Low haemoglobin',
      detail: `Your haemoglobin was ${hb.value} g/dL on ${hb.takenAt}, which suggests anaemia.`,
      action: 'Ask a doctor about iron tests and treatment. Free iron-folic acid tablets are available at government health centres.',
      relatedCondition: 'ANEMIA',
    });
  }
  const tsh = labs.get('TSH');
  if (tsh && (tsh.flag === 'HIGH' || tsh.flag === 'LOW')) {
    flags.push({
      code: 'ABNORMAL_TSH',
      severity: 'WARNING',
      title: tsh.flag === 'HIGH' ? 'High TSH' : 'Low TSH',
      detail: `Your TSH was ${tsh.value} on ${tsh.takenAt}. Thyroid problems can affect your periods, energy and weight.`,
      action: 'Show this result to a doctor. They may repeat it with a free T4 test.',
      relatedCondition: 'THYROID',
    });
  }
  const hba1c = labs.get('HBA1C');
  if (hba1c && hba1c.value >= 5.7) {
    flags.push({
      code: 'HIGH_HBA1C',
      severity: 'WARNING',
      title: hba1c.value >= 6.5 ? 'HbA1c in the diabetes range' : 'HbA1c in the prediabetes range',
      detail: `Your HbA1c was ${hba1c.value}% on ${hba1c.takenAt}.`,
      action: 'See a doctor about blood sugar management. Diet and movement changes help a lot at this stage.',
      relatedCondition: 'DIABETES',
    });
  }
  const vitD = labs.get('VITD');
  if (vitD && vitD.value < 20) {
    flags.push({
      code: 'LOW_VITAMIN_D',
      severity: 'INFO',
      title: 'Low vitamin D',
      detail: `Your vitamin D was ${vitD.value} ng/mL on ${vitD.takenAt}.`,
      action: 'Ask your doctor whether you need a supplement.',
    });
  }
  return flags;
}
