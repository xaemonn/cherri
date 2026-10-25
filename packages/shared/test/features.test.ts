import { describe, expect, it } from 'vitest';
import {
  SCREENINGS,
  detectSafetyConcern,
  extractLogHeuristic,
  interpretLabResult,
  logDraftSchema,
  matchLabAnalyte,
  missingAnswers,
  onboardingSchema,
  parseLabText,
  parseReportDate,
  redactPII,
  scoreScreening,
  upsertLogSchema,
  type LabRecord,
  type ScreeningAnswers,
} from '../src';

const allNo = (type: keyof typeof SCREENINGS): ScreeningAnswers =>
  Object.fromEntries(SCREENINGS[type].questions.map((q) => [q.id, false]));

describe('screenings', () => {
  it('scores PCOS by the Rotterdam criteria', () => {
    expect(scoreScreening('PCOS', { ...allNo('PCOS'), irregular: true, hair: true }).band).toBe('HIGH');
    expect(scoreScreening('PCOS', { ...allNo('PCOS'), acne: true }).band).toBe('MODERATE');
    const low = scoreScreening('PCOS', allNo('PCOS'));
    expect(low.band).toBe('LOW');
    expect(low.suggestedTests).toEqual([]);
  });

  it('uses lab results as evidence', () => {
    const labs = new Map<string, LabRecord>([
      ['TESTOSTERONE', { code: 'TESTOSTERONE', name: 'Testosterone', value: 80, flag: 'HIGH', takenAt: '2026-10-01' }],
      ['HB', { code: 'HB', name: 'Hb', value: 10.1, flag: 'LOW', takenAt: '2026-10-01' }],
    ]);
    const pcos = scoreScreening('PCOS', { ...allNo('PCOS'), irregular: true }, { labs });
    expect(pcos.band).toBe('HIGH');
    expect(pcos.reasons.join(' ')).toMatch(/testosterone/i);

    const anemia = scoreScreening('ANEMIA', allNo('ANEMIA'), { labs });
    expect(anemia.band).toBe('HIGH');
    expect(anemia.reasons[0]).toMatch(/haemoglobin/i);
  });

  it('requires the full DSM-5 pattern for a high PMDD result', () => {
    const answers = { ...allNo('PMDD'), irritable: true, depressed: true, focus: true, energy: true, appetite: true };
    expect(scoreScreening('PMDD', answers).band).toBe('MODERATE');
    const high = scoreScreening('PMDD', { ...answers, timing: true, impact: true });
    expect(high.band).toBe('HIGH');
    expect(high.nextSteps.join(' ')).toMatch(/14416/);
  });

  it('reports unanswered questions and always includes a disclaimer', () => {
    expect(missingAnswers('THYROID', { tired: true })).toContain('neck');
    expect(scoreScreening('THYROID', allNo('THYROID')).disclaimer).toMatch(/not a diagnosis/);
  });
});

describe('Talk-to-Log offline parser', () => {
  it('understands Hinglish with pain scores and intensity', () => {
    const draft = extractLogHeuristic('Cramps 7/10 since morning, bahut thakaan');
    expect(draft.painLevel).toBe(7);
    expect(draft.symptoms).toEqual(
      expect.arrayContaining([
        { code: 'cramps', severity: 2 },
        { code: 'fatigue', severity: 3 },
      ]),
    );
    expect(draft.energy).toBe(1);
  });

  it('respects negation in English and Hindi word order', () => {
    const draft = extractLogHeuristic('No cramps today but a headache. Pet dard nahi hai');
    const codes = draft.symptoms.map((s) => s.code);
    expect(codes).toContain('headache');
    expect(codes).not.toContain('cramps');
  });

  it('detects period start, flow and relative day', () => {
    const started = extractLogHeuristic('Periods aa gaye aaj, heavy flow');
    expect(started.periodStarted).toBe(true);
    expect(started.flow).toBe('HEAVY');
    expect(started.dayOffset).toBe(0);

    const yesterday = extractLogHeuristic('kal raat neend nahi aayi, slept 4 hours');
    expect(yesterday.dayOffset).toBe(-1);
    expect(yesterday.sleepHours).toBe(4);
    expect(yesterday.symptoms.map((s) => s.code)).toContain('insomnia');
  });

  it('reads Devanagari and positive moods', () => {
    expect(extractLogHeuristic('आज सिरदर्द और थकान है').symptoms.map((s) => s.code).sort()).toEqual(['fatigue', 'headache']);
    const good = extractLogHeuristic('Feeling happy and energetic today!');
    expect(good.mood).toBe(4);
    expect(good.energy).toBe(4);
    expect(extractLogHeuristic('no bleeding today').flow).toBeNull();
  });
});

describe('lab decoding', () => {
  it('matches printed test names to the catalog', () => {
    expect(matchLabAnalyte('Haemoglobin (Hb)')?.code).toBe('HB');
    expect(matchLabAnalyte('HbA1c')?.code).toBe('HBA1C');
    expect(matchLabAnalyte('Glycosylated Haemoglobin')?.code).toBe('HBA1C');
    expect(matchLabAnalyte('Mean Corpuscular Hemoglobin (MCH)')).toBeUndefined();
    expect(matchLabAnalyte('Total Iron Binding Capacity')).toBeUndefined();
    expect(matchLabAnalyte('Vitamin D (25-OH)')?.code).toBe('VITD');
    expect(matchLabAnalyte('Glucose PP')).toBeUndefined();
    expect(matchLabAnalyte('Fasting Blood Sugar')?.code).toBe('GLUCOSE_FASTING');
  });

  it('prefers the report range and converts units for the catalog range', () => {
    const hb = interpretLabResult({ name: 'Haemoglobin', value: 10.2, unit: 'g/dL', refLow: 12, refHigh: 15.5 });
    expect(hb).toMatchObject({ code: 'HB', flag: 'LOW', rangeSource: 'REPORT' });
    expect(hb.explanation).toMatch(/anaemia/);

    const vitD = interpretLabResult({ name: 'Vitamin D', value: 35, unit: 'nmol/L' });
    expect(vitD).toMatchObject({ code: 'VITD', flag: 'LOW', rangeSource: 'CATALOG', refLow: null });

    expect(interpretLabResult({ name: 'TSH', value: 3, unit: 'furlongs' }).flag).toBe('UNKNOWN');
  });

  it('parses rows from digital lab report text', () => {
    const text = [
      'CITY DIAGNOSTICS        Reported on: 12/10/2026',
      'Haemoglobin 10.2 g/dL 12.0 - 15.5',
      'Mean Corpuscular Hemoglobin (MCH) 24.1 pg 27 - 32',
      'TSH (Ultrasensitive) 2.1 µIU/mL 0.4 - 4.5',
      'Vitamin D (25-OH) 14.2 ng/mL 30-100',
      'Vitamin B12 180 pg/mL 200 - 900',
      'HbA1c 5.4 % < 5.7',
    ].join('\n');
    const results = parseLabText(text);
    const byName = Object.fromEntries(results.map((r) => [matchLabAnalyte(r.name)?.code, r]));
    expect(Object.keys(byName).sort()).toEqual(['B12', 'HB', 'HBA1C', 'TSH', 'VITD']);
    expect(byName.HB).toMatchObject({ value: 10.2, unit: 'g/dL', refLow: 12, refHigh: 15.5 });
    expect(byName.VITD).toMatchObject({ value: 14.2, refLow: 30, refHigh: 100 });
    expect(byName.B12?.value).toBe(180);
    expect(byName.HBA1C).toMatchObject({ value: 5.4, refHigh: 5.7, refLow: null });
    expect(byName.TSH?.unit).toBe('µIU/mL');
  });

  it('finds the report date in Indian formats', () => {
    expect(parseReportDate('Reported on: 12/10/2026', '2026-10-24')).toBe('2026-10-12');
    expect(parseReportDate('Collected 05-Oct-2026 09:12', '2026-10-24')).toBe('2026-10-05');
    expect(parseReportDate('Valid till 12/12/2030', '2026-10-24')).toBeNull();
  });
});

describe('safety', () => {
  it('detects crisis language in English and Hinglish', () => {
    expect(detectSafetyConcern('I just want to die')?.category).toBe('SELF_HARM');
    expect(detectSafetyConcern('kabhi kabhi marna chahti hoon')?.category).toBe('SELF_HARM');
    expect(detectSafetyConcern('I am soaking a pad every hour and feel dizzy')?.category).toBe('MEDICAL_EMERGENCY');
    expect(detectSafetyConcern('my husband hits me when he is angry')?.category).toBe('VIOLENCE');
    expect(detectSafetyConcern('I have bad cramps today')).toBeNull();
  });

  it('points to the right Indian helplines', () => {
    expect(detectSafetyConcern('thinking about suicide')?.helplines.map((h) => h.number)).toContain('14416');
  });

  it('redacts identifiers before text reaches an AI provider', () => {
    const redacted = redactPII('Call me at +91 98765 43210 or priya@mail.com. Aadhaar 1234 5678 9012.');
    expect(redacted).toContain('[phone]');
    expect(redacted).toContain('[email]');
    expect(redacted).toContain('[id-number]');
    expect(redacted).not.toMatch(/98765|priya@|5678/);
  });
});

describe('schemas', () => {
  it('requires explicit consent at onboarding', () => {
    expect(onboardingSchema.safeParse({ lifeStage: 'CYCLE', language: 'en' }).success).toBe(false);
    expect(onboardingSchema.safeParse({ lifeStage: 'CYCLE', language: 'hinglish', consent: true }).success).toBe(true);
  });

  it('rejects unknown symptoms in logs', () => {
    expect(upsertLogSchema.safeParse({ symptoms: [{ code: 'cramps', severity: 3 }] }).success).toBe(true);
    expect(upsertLogSchema.safeParse({ symptoms: [{ code: 'made_up' }] }).success).toBe(false);
    expect(upsertLogSchema.safeParse({ unknownField: 1 }).success).toBe(false);
  });

  it('sanitises imperfect AI output instead of failing', () => {
    const parsed = logDraftSchema.parse({
      dayOffset: 3,
      flow: 'GUSHING',
      periodStarted: 'yes',
      symptoms: [{ code: 'cramps', severity: 3 }, { code: 'hallucinated' }],
      painLevel: 7,
      mood: null,
      energy: 9,
      sleepHours: null,
      notes: 'ok',
    });
    expect(parsed).toMatchObject({ dayOffset: 0, flow: null, periodStarted: false, painLevel: 7, energy: null });
    expect(parsed.symptoms).toEqual([{ code: 'cramps', severity: 3 }]);
  });
});

describe('draft helpers', () => {
  it('summarises drafts and tells questions from logs', async () => {
    const { describeLogDraft, isEmptyDraft, looksLikeQuestion } = await import('../src');
    const draft = extractLogHeuristic('periods aa gaye, bahut cramps, 7/10');
    expect(describeLogDraft(draft)).toBe('period started, strong cramps, pain 7/10');
    expect(isEmptyDraft(extractLogHeuristic('hello cherri'))).toBe(true);
    expect(looksLikeQuestion('What causes cramps?')).toBe(true);
    expect(looksLikeQuestion('kya ye normal hai')).toBe(true);
    expect(looksLikeQuestion('cramps since morning')).toBe(false);
  });
});

describe('language detection', () => {
  it('tells English, Hindi and Hinglish apart', async () => {
    const { detectLanguage } = await import('../src');
    expect(detectLanguage('Aaj subah se bahut cramps hain, kya ye normal hai?')).toBe('hinglish');
    expect(detectLanguage('आज बहुत दर्द है')).toBe('hi');
    expect(detectLanguage('I have cramps and a headache today')).toBe('en');
    expect(detectLanguage('Is it okay to exercise on my period?')).toBe('en');
  });
});

describe('grounding AI drafts', () => {
  it('drops values the user never said', async () => {
    const { groundDraft } = await import('../src');
    const aiDraft = {
      dayOffset: 0,
      flow: 'NONE' as const,
      periodStarted: false,
      symptoms: [{ code: 'cramps' as const, severity: 3 }],
      painLevel: 2,
      mood: 5,
      energy: 2,
      sleepHours: 7,
      notes: null,
    };
    const grounded = groundDraft(aiDraft, 'Aaj bahut cramps hain aur thakaan bhi, kya karun?');
    expect(grounded).toMatchObject({ flow: null, painLevel: null, mood: null, sleepHours: null, energy: 2 });
    expect(grounded.symptoms).toEqual(aiDraft.symptoms);
  });

  it('keeps values the user did express', async () => {
    const { groundDraft } = await import('../src');
    const draft = { dayOffset: 0, flow: 'HEAVY' as const, periodStarted: true, symptoms: [], painLevel: 7, mood: 2, energy: null, sleepHours: 5, notes: null };
    expect(groundDraft(draft, 'periods aa gaye, pain 7/10, mood off, slept 5 hours')).toMatchObject({ flow: 'HEAVY', periodStarted: true, painLevel: 7, mood: 2, sleepHours: 5 });
  });
});
