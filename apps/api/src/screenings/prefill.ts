import { addDays, summarizeSymptoms, type PrefilledAnswer, type ScreeningType } from '@cherri/shared';
import type { HealthSnapshot } from '../insights/insights.service';

/**
 * Suggest answers from what she has already logged, so a screening feels like
 * "confirm what Cherri noticed" rather than a blank form. She can always change them.
 */
export function prefillScreening(type: ScreeningType, snap: HealthSnapshot): Record<string, PrefilledAnswer> {
  const summary = summarizeSymptoms(snap.logs, snap.periods, {
    today: snap.today,
    expectedCycleLength: snap.expectedCycleLength,
    defaultPeriodLength: snap.user.avgPeriodLength,
    days: 90,
  });
  const symptom = (code: string) => summary.find((s) => s.code === code);
  const out: Record<string, PrefilledAnswer> = {};

  const fromSymptom = (questionId: string, code: string, minShare: number, minDays = 2) => {
    const s = symptom(code);
    if (s && s.share >= minShare && s.days >= minDays) {
      out[questionId] = { value: true, reason: `You logged ${s.label.toLowerCase()} on ${s.days} days in the last 3 months.` };
    }
  };
  const flagged = (code: string) => snap.redFlags.some((f) => f.code === code);
  const stats = snap.prediction?.stats;
  const family = new Set(snap.user.familyHistory);
  const fromFamily = (questionId: string, conditions: string[], label: string) => {
    if (conditions.some((c) => family.has(c))) out[questionId] = { value: true, reason: `You noted ${label} in your family.` };
  };

  const recentPeriods = snap.periods.slice(-3);
  const severePainPeriods = recentPeriods.filter((p) => {
    const end = p.endDate ?? addDays(p.startDate, 6);
    return snap.logs.some((l) => l.date >= p.startDate && l.date <= end && (l.painLevel ?? 0) >= 7);
  }).length;

  switch (type) {
    case 'PCOS':
      if (stats?.avgCycleLength && stats.avgCycleLength > 35) {
        out.irregular = { value: true, reason: `Your logged cycles average ${Math.round(stats.avgCycleLength)} days.` };
      } else if (stats?.regularity === 'IRREGULAR') {
        out.irregular = { value: true, reason: `Your cycle length varies by ${stats.variability} days.` };
      }
      if (flagged('NO_PERIOD_90_DAYS')) out.missed = { value: true, reason: 'It has been over 90 days since your last logged period.' };
      fromSymptom('acne', 'acne', 0.2);
      fromSymptom('hair', 'excess_hair', 0, 2);
      fromSymptom('scalp', 'hair_loss', 0.15);
      fromSymptom('skin', 'dark_patches', 0, 1);
      fromSymptom('weight', 'weight_gain', 0, 2);
      fromFamily('family', ['PCOS', 'DIABETES'], family.has('PCOS') ? 'PCOS' : 'diabetes');
      break;
    case 'ENDOMETRIOSIS':
      if (severePainPeriods >= 2) {
        out.pain_daily = { value: true, reason: `You logged pain of 7/10 or more during ${severePainPeriods} of your last ${recentPeriods.length} periods.` };
      }
      fromSymptom('sex', 'pain_during_sex', 0, 1);
      fromSymptom('bowel', 'painful_bowel', 0, 1);
      fromSymptom('urine', 'painful_urination', 0, 1);
      fromSymptom('pelvic', 'pelvic_pain', 0.1, 4);
      fromFamily('family', ['ENDOMETRIOSIS'], 'endometriosis');
      break;
    case 'PMDD': {
      const premenstrual = snap.patterns.patterns.filter((p) => p.window === 'PREMENSTRUAL' || p.window === 'LUTEAL');
      const map: Record<string, string> = {
        low_mood: 'depressed',
        low_mood_score: 'depressed',
        irritability: 'irritable',
        anxiety: 'anxious',
        mood_swings: 'mood_swings',
        low_energy: 'energy',
        fatigue: 'energy',
        cravings: 'appetite',
        insomnia: 'sleep',
        poor_sleep: 'sleep',
        brain_fog: 'focus',
        bloating: 'physical',
        breast_tenderness: 'physical',
      };
      for (const p of premenstrual) {
        const questionId = map[p.feature];
        if (questionId && !out[questionId]) out[questionId] = { value: true, reason: `Pattern Radar: ${p.message}` };
      }
      if (premenstrual.length > 0) {
        out.timing = { value: true, reason: 'Your logs show these symptoms cluster before your period.' };
      }
      break;
    }
    case 'ANEMIA':
      if (flagged('HEAVY_BLEEDING') || flagged('LONG_PERIODS')) {
        out.heavy = { value: true, reason: 'Your logs show heavy or long periods.' };
      }
      fromSymptom('tired', 'fatigue', 0.3);
      fromSymptom('dizzy', 'dizziness', 0, 3);
      fromSymptom('breath', 'breathlessness', 0, 2);
      fromSymptom('hair_nails', 'hair_loss', 0.15);
      fromSymptom('cold', 'feeling_cold', 0, 2);
      break;
    case 'THYROID':
      fromSymptom('tired', 'fatigue', 0.3);
      fromSymptom('weight_gain', 'weight_gain', 0, 2);
      fromSymptom('cold', 'feeling_cold', 0, 2);
      fromSymptom('constipation', 'constipation', 0, 3);
      fromSymptom('dry', 'dry_skin', 0, 2);
      fromSymptom('hair', 'hair_loss', 0.15);
      fromSymptom('mood', 'brain_fog', 0, 3);
      if (stats?.regularity === 'IRREGULAR' || flagged('HEAVY_BLEEDING')) {
        out.periods = { value: true, reason: 'Your logs show irregular or heavy periods.' };
      }
      fromFamily('family', ['THYROID'], 'thyroid problems');
      break;
  }
  return out;
}
