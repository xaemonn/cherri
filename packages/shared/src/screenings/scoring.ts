import { MEDICAL_DISCLAIMER, type RiskBand, type ScreeningType } from '../constants';
import type { LabRecord } from '../insights/types';
import { SCREENINGS } from './definitions';

export type ScreeningAnswers = Record<string, boolean>;

export interface ScreeningContext {
  /** Latest lab result per catalog code, used as supporting evidence. */
  labs?: ReadonlyMap<string, LabRecord>;
}

export interface ScreeningResult {
  type: ScreeningType;
  score: number;
  maxScore: number;
  band: RiskBand;
  summary: string;
  reasons: string[];
  nextSteps: string[];
  suggestedTests: string[];
  specialist: string;
  disclaimer: string;
}

export function missingAnswers(type: ScreeningType, answers: ScreeningAnswers): string[] {
  return SCREENINGS[type].questions.filter((q) => typeof answers[q.id] !== 'boolean').map((q) => q.id);
}

type Scored = Pick<ScreeningResult, 'score' | 'maxScore' | 'band' | 'summary' | 'reasons' | 'nextSteps'>;

function weighted(answers: ScreeningAnswers, weights: Record<string, number>): number {
  return Object.entries(weights).reduce((sum, [id, w]) => sum + (answers[id] ? w : 0), 0);
}

const sum = (weights: Record<string, number>) => Object.values(weights).reduce((a, b) => a + b, 0);

function scorePcos(a: ScreeningAnswers, ctx: ScreeningContext): Scored {
  const testosterone = ctx.labs?.get('TESTOSTERONE');
  const highAndrogenLab = testosterone?.flag === 'HIGH';

  const ovulatory = a.irregular || a.missed;
  const androgen = a.hair || a.acne || a.scalp || highAndrogenLab;
  const ovaries = a.ultrasound;
  const criteria = [ovulatory, androgen, ovaries].filter(Boolean).length;
  const supportive = weighted(a, { weight: 1, skin: 1, family: 1 });

  const reasons: string[] = [];
  if (ovulatory) reasons.push('Irregular or missed periods (a sign of irregular ovulation)');
  if (androgen) reasons.push(highAndrogenLab ? 'High testosterone on your lab report' : 'Signs of higher androgens (excess hair, adult acne or scalp thinning)');
  if (ovaries) reasons.push('Polycystic ovaries seen on ultrasound');
  if (a.skin) reasons.push('Dark velvety skin patches, a sign of insulin resistance');
  if (a.weight) reasons.push('Difficulty managing weight around the waist');
  if (a.family) reasons.push('Family history of PCOS or type 2 diabetes');

  const band: RiskBand = criteria >= 2 ? 'HIGH' : criteria === 1 || supportive >= 2 ? 'MODERATE' : 'LOW';
  const summary = {
    HIGH: 'Your answers match 2 or more of the 3 criteria doctors use to diagnose PCOS. This is not a diagnosis, but it is a strong reason to see a gynaecologist.',
    MODERATE: 'Some of your answers are linked to PCOS. A doctor can check with a few simple tests.',
    LOW: 'Your answers don’t point strongly to PCOS right now. Keep logging and re-check if things change.',
  }[band];

  return {
    score: criteria * 3 + supportive,
    maxScore: 12,
    band,
    summary,
    reasons,
    nextSteps:
      band === 'LOW'
        ? ['Keep tracking your cycles in Cherri.']
        : [
            'Book a gynaecologist visit and share your Cherri doctor report.',
            'PCOS is very manageable. Regular movement, balanced meals and good sleep make a real difference.',
            'Ask about a blood sugar check, since PCOS raises the risk of diabetes.',
          ],
  };
}

function scoreEndometriosis(a: ScreeningAnswers): Scored {
  const weights = { pain_daily: 2, painkillers: 2, pelvic: 2, sex: 2, bowel: 2, urine: 1, fertility: 1, family: 1 };
  const score = weighted(a, weights);
  const labels: Record<string, string> = {
    pain_daily: 'Period pain that disrupts daily life',
    painkillers: 'Pain that painkillers don’t control',
    pelvic: 'Pelvic pain outside your period',
    sex: 'Deep pain during or after sex',
    bowel: 'Painful bowel movements around your period',
    urine: 'Pain or blood when peeing around your period',
    fertility: 'Difficulty getting pregnant',
    family: 'Family history of endometriosis',
  };
  const band: RiskBand = score >= 6 ? 'HIGH' : score >= 3 ? 'MODERATE' : 'LOW';
  return {
    score,
    maxScore: sum(weights),
    band,
    summary: {
      HIGH: 'You have several symptoms that NICE guidance says should make a doctor suspect endometriosis. In India diagnosis often takes years, so bring your Cherri report and ask about it directly.',
      MODERATE: 'Some of your symptoms are linked to endometriosis. It is worth discussing with a gynaecologist.',
      LOW: 'Your answers don’t point strongly to endometriosis. If your pain changes, check again.',
    }[band],
    reasons: Object.keys(labels).filter((id) => a[id]).map((id) => labels[id]!),
    nextSteps:
      band === 'LOW'
        ? ['Keep logging your pain levels. They make your doctor report stronger.']
        : [
            'See a gynaecologist and show your pain history from Cherri.',
            'A normal ultrasound does not rule out endometriosis. Ask about next steps if your pain continues.',
            'Treatment options (hormonal and surgical) exist, so you don’t have to just bear it.',
          ],
  };
}

function scorePmdd(a: ScreeningAnswers): Scored {
  const core = ['mood_swings', 'irritable', 'depressed', 'anxious'];
  const other = ['interest', 'focus', 'energy', 'appetite', 'sleep', 'overwhelmed', 'physical'];
  const coreCount = core.filter((id) => a[id]).length;
  const count = coreCount + other.filter((id) => a[id]).length;

  const band: RiskBand =
    coreCount >= 1 && count >= 5 && a.timing && a.impact
      ? 'HIGH'
      : count >= 5 || (coreCount >= 1 && a.impact)
        ? 'MODERATE'
        : 'LOW';

  const reasons = [`${count} of 11 premenstrual symptoms, including ${coreCount} core mood symptom${coreCount === 1 ? '' : 's'}`];
  if (a.timing) reasons.push('Symptoms ease once your period starts');
  if (a.impact) reasons.push('Symptoms seriously affect your daily life');

  const nextSteps =
    band === 'LOW'
      ? ['Keep logging your mood. Cherri will flag it if a cycle pattern appears.']
      : [
          'Log your mood daily for 2 cycles. Doctors need this to confirm PMDD, and Cherri’s Pattern Radar does the analysis.',
          'See a gynaecologist or psychiatrist. PMDD is treatable.',
        ];
  if (a.depressed) {
    nextSteps.push('If you ever feel hopeless or unsafe, call Tele-MANAS on 14416 (free, 24×7).');
  }

  return {
    score: count,
    maxScore: 11,
    band,
    summary: {
      HIGH: 'Your answers match the pattern doctors look for in PMDD, a severe and treatable form of PMS.',
      MODERATE: 'You have notable premenstrual symptoms. Tracking them for two cycles will show whether it is PMS or PMDD.',
      LOW: 'Your premenstrual symptoms look mild right now.',
    }[band],
    reasons,
    nextSteps,
  };
}

function scoreAnemia(a: ScreeningAnswers, ctx: ScreeningContext): Scored {
  const weights = { heavy: 2, tired: 1, breath: 1, dizzy: 1, pale: 1, pica: 2, hair_nails: 1, diet: 1, cold: 1 };
  const score = weighted(a, weights);
  const hb = ctx.labs?.get('HB');
  const ferritin = ctx.labs?.get('FERRITIN');
  const labConfirmed = hb?.flag === 'LOW' || ferritin?.flag === 'LOW';

  const labels: Record<string, string> = {
    heavy: 'Heavy or long periods',
    tired: 'Constant tiredness or weakness',
    breath: 'Breathlessness or racing heart with light activity',
    dizzy: 'Frequent dizziness',
    pale: 'Pale skin, eyelids or nails',
    pica: 'Cravings for ice, mud, chalk or raw rice (a classic sign of iron deficiency)',
    hair_nails: 'Hair fall or brittle nails',
    diet: 'Low intake of iron-rich foods',
    cold: 'Cold hands and feet',
  };
  const reasons = Object.keys(labels).filter((id) => a[id]).map((id) => labels[id]!);
  if (hb?.flag === 'LOW') reasons.unshift(`Low haemoglobin on your report (${hb.value} g/dL)`);
  if (ferritin?.flag === 'LOW') reasons.unshift(`Low ferritin on your report (${ferritin.value} ng/mL)`);

  const band: RiskBand = labConfirmed || score >= 5 ? 'HIGH' : score >= 3 ? 'MODERATE' : 'LOW';
  return {
    score,
    maxScore: sum(weights),
    band,
    summary: {
      HIGH: labConfirmed
        ? 'Your lab results already show low iron or haemoglobin. Treat this seriously, because anaemia drains your energy and focus.'
        : 'Your symptoms strongly suggest anaemia. A simple blood test can confirm it.',
      MODERATE: 'Some of your symptoms are common with anaemia. A blood test is cheap and worth it.',
      LOW: 'Your answers don’t point strongly to anaemia.',
    }[band],
    reasons,
    nextSteps: [
      'Eat iron-rich foods: palak, methi, ragi, chana, rajma, jaggery, dates, eggs or meat.',
      'Add vitamin C (lemon, amla, guava) to iron-rich meals, and keep chai or coffee an hour away from meals.',
      ...(band === 'LOW'
        ? []
        : ['Get a CBC and ferritin test. Free iron-folic acid tablets are available at government health centres (Anemia Mukt Bharat).']),
    ],
  };
}

function scoreThyroid(a: ScreeningAnswers, ctx: ScreeningContext): Scored {
  const weights = { tired: 1, weight_gain: 1, cold: 1, constipation: 1, dry: 1, hair: 1, periods: 2, mood: 1, neck: 2, hyper: 2, family: 1 };
  const score = weighted(a, weights);
  const tsh = ctx.labs?.get('TSH');
  const labAbnormal = tsh?.flag === 'HIGH' || tsh?.flag === 'LOW';

  const reasons: string[] = [];
  if (labAbnormal) reasons.push(`Your TSH was ${tsh!.flag === 'HIGH' ? 'high' : 'low'} (${tsh!.value})`);
  const symptomCount = ['tired', 'weight_gain', 'cold', 'constipation', 'dry', 'hair', 'mood'].filter((id) => a[id]).length;
  if (symptomCount) reasons.push(`${symptomCount} common underactive-thyroid symptoms`);
  if (a.periods) reasons.push('Changes in your periods');
  if (a.neck) reasons.push('Swelling at the front of your neck');
  if (a.hyper) reasons.push('Symptoms of an overactive thyroid');
  if (a.family) reasons.push('Family history of thyroid problems');

  const band: RiskBand = labAbnormal || score >= 7 || a.neck ? 'HIGH' : score >= 4 ? 'MODERATE' : 'LOW';
  return {
    score,
    maxScore: sum(weights),
    band,
    summary: {
      HIGH: 'Your answers suggest your thyroid should be checked soon. Thyroid problems are common in Indian women and easy to treat.',
      MODERATE: 'Some symptoms could be thyroid-related. A TSH test is quick and inexpensive.',
      LOW: 'Your answers don’t point strongly to a thyroid problem.',
    }[band],
    reasons,
    nextSteps: band === 'LOW' ? ['Re-check if new symptoms appear.'] : ['Get a TSH test and share the result with a doctor.'],
  };
}

export function scoreScreening(type: ScreeningType, answers: ScreeningAnswers, context: ScreeningContext = {}): ScreeningResult {
  const def = SCREENINGS[type];
  const scored = {
    PCOS: () => scorePcos(answers, context),
    ENDOMETRIOSIS: () => scoreEndometriosis(answers),
    PMDD: () => scorePmdd(answers),
    ANEMIA: () => scoreAnemia(answers, context),
    THYROID: () => scoreThyroid(answers, context),
  }[type]();

  return {
    type,
    ...scored,
    suggestedTests: scored.band === 'LOW' ? [] : def.tests,
    specialist: def.specialist,
    disclaimer: `This check is based on ${def.basis}. ${MEDICAL_DISCLAIMER}`,
  };
}
