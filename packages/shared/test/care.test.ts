import { describe, expect, it } from 'vitest';
import {
  addDays,
  assessDangerSigns,
  babySize,
  careStepStatus,
  ANTENATAL_STEPS,
  detectLanguage,
  detectRedFlags,
  detectSafetyConcern,
  dueDateFromLmp,
  extractLogHeuristic,
  gestationalAge,
  generatePregnancyDemoData,
  groundDraft,
  groundStory,
  meanArterialPressure,
  MIND_CHECKS,
  missingMindAnswers,
  nextPmsmaDay,
  postpartumAge,
  preventiveChecksFor,
  scoreMindCheck,
  structureStoryHeuristic,
  toFhirBundle,
  type DoctorReport,
  type LogRecord,
  type PeriodRecord,
} from '../src';

const TODAY = '2026-10-25';
const day = (offset: number) => addDays(TODAY, offset);
const log = (offset: number, extra: Partial<LogRecord> = {}): LogRecord => ({ date: day(offset), symptoms: [], ...extra });

describe('pregnancy timeline', () => {
  it('counts weeks and days from the due date', () => {
    const due = dueDateFromLmp(day(-212));
    expect(gestationalAge(due, TODAY)).toMatchObject({ weeks: 30, days: 2, trimester: 3, daysToGo: 68 });
    expect(gestationalAge(day(200), TODAY)).toMatchObject({ weeks: 11, trimester: 1 });
    expect(gestationalAge(day(400), TODAY)).toBeNull();
    expect(gestationalAge(day(-60), TODAY)).toBeNull();
  });

  it('tracks the weeks after birth', () => {
    expect(postpartumAge(day(-20), TODAY)).toEqual({ days: 20, weeks: 2, postnatal: true });
    expect(postpartumAge(day(-50), TODAY)?.postnatal).toBe(false);
  });

  it('knows the baby size, the care plan and the next PMSMA day', () => {
    expect(babySize(30)?.name).toMatch(/cabbage/);
    expect(babySize(3)).toBeNull();
    const ogtt = ANTENATAL_STEPS.find((s) => s.id === 'gdm')!;
    expect([careStepStatus(ogtt, 20), careStepStatus(ogtt, 26), careStepStatus(ogtt, 30)]).toEqual(['NEXT', 'NOW', 'DONE']);
    expect(nextPmsmaDay('2026-10-05')).toBe('2026-10-09');
    expect(nextPmsmaDay('2026-10-25')).toBe('2026-11-09');
    expect(nextPmsmaDay('2026-12-15')).toBe('2027-01-09');
  });
});

describe('danger-sign check', () => {
  it('sends her to hospital on any red sign', () => {
    const result = assessDangerSigns('PREGNANCY', { bleeding: 'YES', fever: 'YES' }, 30);
    expect(result.level).toBe('RED');
    expect(result.signs.map((s) => s.id)).toEqual(['bleeding', 'fever']);
    expect(result.call).toContain('102');
  });

  it('treats "not sure" about a red sign as at least amber', () => {
    expect(assessDangerSigns('PREGNANCY', { headache_vision: 'UNSURE' }, 30).level).toBe('AMBER');
    expect(assessDangerSigns('PREGNANCY', { swelling: 'YES' }, 30).level).toBe('AMBER');
    const none = assessDangerSigns('PREGNANCY', { bleeding: 'NO' }, 30);
    expect(none.level).toBe('GREEN');
    expect(none.headline).not.toMatch(/safe|fine/i);
  });

  it('only asks about baby movements from 20 weeks, and points to mental health support', () => {
    expect(assessDangerSigns('PREGNANCY', { movement: 'YES' }, 12).level).toBe('GREEN');
    const postnatal = assessDangerSigns('POSTPARTUM', { pp_harm: 'YES' });
    expect(postnatal.level).toBe('RED');
    expect(postnatal.call).toContain('14416');
  });
});

describe('maternal red flags', () => {
  const pregnant = (logs: LogRecord[], weeks = 30) =>
    detectRedFlags({ today: TODAY, lifeStage: 'PREGNANCY', pregnancyWeeks: weeks, periods: [], logs, labs: [] }).map((f) => f.code);

  it('escalates by blood pressure level and warning signs', () => {
    expect(meanArterialPressure(120, 80)).toBe(93);
    expect(pregnant([log(-1, { systolic: 165, diastolic: 100 })])).toContain('SEVERE_HYPERTENSION');
    expect(pregnant([log(-1, { systolic: 142, diastolic: 92 })])).toContain('HIGH_BP_MATERNAL');
    expect(pregnant([log(-1, { systolic: 142, diastolic: 92, symptoms: [{ code: 'headache', severity: 2 }] })])).toContain('PREECLAMPSIA_WARNING_SIGNS');
    expect(pregnant([log(-1, { systolic: 128, diastolic: 82 })])).toEqual([]);
  });

  it('notices blood pressure rising from her own baseline', () => {
    const logs = [-40, -36, -32].map((o) => log(o, { systolic: 108, diastolic: 68 })).concat(log(-1, { systolic: 134, diastolic: 86 }));
    expect(pregnant(logs)).toContain('BP_RISING');
  });

  it('flags reduced movements, leaking fluid and pregnancy anaemia', () => {
    expect(pregnant([log(0, { symptoms: [{ code: 'reduced_fetal_movement', severity: 2 }] })])).toContain('REDUCED_FETAL_MOVEMENTS');
    expect(pregnant([log(0, { symptoms: [{ code: 'fluid_leak', severity: 2 }] })])).toContain('FLUID_LEAK');
    const labs = [{ code: 'HB', name: 'Haemoglobin', value: 10.4, flag: 'LOW' as const, takenAt: day(-5) }];
    const codes = detectRedFlags({ today: TODAY, lifeStage: 'PREGNANCY', periods: [], logs: [], labs }).map((f) => f.code);
    expect(codes).toContain('PREGNANCY_ANAEMIA');
    expect(codes).not.toContain('LOW_HAEMOGLOBIN');
  });

  it('flags the demo pregnancy as pre-eclampsia warning signs', () => {
    const meera = generatePregnancyDemoData(TODAY);
    const due = meera.profile.dueDate!;
    const codes = detectRedFlags({ today: TODAY, lifeStage: 'PREGNANCY', pregnancyWeeks: gestationalAge(due, TODAY)!.weeks, periods: [], logs: meera.logs, labs: [] }).map((f) => f.code);
    expect(codes[0]).toBe('PREECLAMPSIA_WARNING_SIGNS');
  });

  it('checks blood pressure and postnatal mood outside pregnancy', () => {
    const cycling = detectRedFlags({ today: TODAY, lifeStage: 'CYCLE', periods: [], logs: [log(-10, { systolic: 146, diastolic: 94 }), log(-2, { systolic: 150, diastolic: 96 })], labs: [] });
    expect(cycling.map((f) => f.code)).toContain('HIGH_BP');
    const lowDays = [-1, -2, -4, -6, -8].map((o) => log(o, { symptoms: [{ code: 'low_mood', severity: 2 }] }));
    const postnatal = detectRedFlags({ today: TODAY, lifeStage: 'POSTPARTUM', postpartumDays: 30, periods: [], logs: lowDays, labs: [] });
    expect(postnatal.map((f) => f.code)).toContain('POSTNATAL_LOW_MOOD');
  });
});

describe('age-aware cycle rules', () => {
  const periodsEvery = (lengths: number[]): PeriodRecord[] => {
    const starts = [day(-lengths.reduce((a, b) => a + b, 0) - 5)];
    for (const length of lengths) starts.push(addDays(starts.at(-1)!, length));
    return starts.map((startDate) => ({ startDate, endDate: addDays(startDate, 4) }));
  };
  const codes = (age: number, menarcheAge: number | null, lengths: number[], lifeStage: 'CYCLE' | 'PERIMENOPAUSE' = 'CYCLE') =>
    detectRedFlags({ today: TODAY, lifeStage, age, menarcheAge, periods: periodsEvery(lengths), logs: [], labs: [] });

  it('uses the 2023 PCOS guideline limits by years since the first period', () => {
    expect(codes(15, 13, [40, 42, 41]).map((f) => f.code)).not.toContain('INFREQUENT_PERIODS');
    const adult = codes(25, 12, [40, 42, 41]).find((f) => f.code === 'INFREQUENT_PERIODS');
    expect(adult?.relatedCondition).toBe('PCOS');
    expect(codes(13, 13, [50, 20, 55]).map((f) => f.code)).not.toContain('INFREQUENT_PERIODS');
  });

  it('frames changing cycles after 45 as the menopause transition, not PCOS', () => {
    const flags = codes(46, 13, [40, 45, 38, 62]);
    expect(flags.find((f) => f.code === 'INFREQUENT_PERIODS')?.relatedCondition).toBeUndefined();
    expect(flags.map((f) => f.code)).toContain('MENOPAUSE_TRANSITION');
  });
});

describe('Kannada and spoken vitals', () => {
  it('reads Kannada symptoms, intensity and negation', () => {
    const draft = extractLogHeuristic('ಇವತ್ತು ತುಂಬಾ ತಲೆನೋವು ಮತ್ತು ಸುಸ್ತು');
    expect(draft.symptoms).toEqual(expect.arrayContaining([{ code: 'headache', severity: 3 }, { code: 'fatigue', severity: 2 }]));
    expect(extractLogHeuristic('ತಲೆನೋವು ಇಲ್ಲ').symptoms).toEqual([]);
    expect(extractLogHeuristic('ನನಗೆ ತಲೆತಿರುಗುತ್ತಿದೆ').symptoms.map((s) => s.code)).toEqual(['dizziness']);
    expect(detectLanguage('ನನಗೆ ಹೊಟ್ಟೆ ನೋವು ಇದೆ')).toBe('kn');
    expect(detectSafetyConcern('ನನಗೆ ಸಾಯಬೇಕು ಅನ್ನಿಸುತ್ತಿದೆ')?.category).toBe('SELF_HARM');
    expect(detectSafetyConcern('my baby is not moving since morning')?.category).toBe('MEDICAL_EMERGENCY');
  });

  it('logs blood pressure and weight she reads out, never a made-up reading', () => {
    expect(extractLogHeuristic('BP 142/92 today, weight 64.5 kg, pain 3/10')).toMatchObject({ systolic: 142, diastolic: 92, weightKg: 64.5, painLevel: 3 });
    expect(extractLogHeuristic('cramps 7/10')).toMatchObject({ systolic: null, diastolic: null });
    const aiDraft = { dayOffset: 0, flow: null, periodStarted: false, symptoms: [], painLevel: null, mood: null, energy: null, sleepHours: null, notes: null };
    expect(groundDraft({ ...aiDraft, systolic: 150, diastolic: 95 }, 'my bp was 142/92')).toMatchObject({ systolic: null, diastolic: null });
    expect(groundDraft({ ...aiDraft, systolic: 142, diastolic: 92, weightKg: 70 }, 'my bp was 142/92')).toMatchObject({ systolic: 142, diastolic: 92, weightKg: null });
  });
});

describe('symptom story', () => {
  const STORY =
    'My periods have been irregular since I was 16. The cramps are 8/10 and I miss college every month. Meftal helps a little but a hot water bag helps more. ' +
    'The pain gets worse when I stand for long. I am worried it could be PCOS. I want to know which tests I should get.';

  it('organises her words like a doctor takes a history', () => {
    const story = structureStoryHeuristic(STORY);
    expect(story).toMatchObject({ since: 'since I was 16', severity: '8/10', pattern: 'every month' });
    expect(story.mainConcern).toBe('My periods have been irregular since I was 16.');
    expect(story.tried).toEqual(expect.arrayContaining(['meftal', 'hot water bag']));
    expect(story.triggers[0]).toMatch(/worse when I stand/);
    expect(story.impact).toMatch(/miss college/);
    expect(story.worries).toMatch(/worried/);
    expect(story.goals).toMatch(/which tests/);
    expect(story.symptoms).toContain('cramps');
  });

  it('reads where it hurts, but not how she lies down', () => {
    expect(structureStoryHeuristic('Sharp pain in my lower belly every month. Lying on my left side helps.').location).toBe('lower belly');
    expect(structureStoryHeuristic('Headaches every evening. Lying on my left side helps.').location).toBeNull();
  });

  it('drops AI details her words do not support', () => {
    const grounded = groundStory(
      { ...structureStoryHeuristic(STORY), severity: '9/10', impact: 'She has PCOS and misses college', worries: 'Worried it could be PCOS' },
      STORY,
    );
    expect(grounded.severity).toBeNull();
    expect(grounded.impact).toBeNull();
    expect(grounded.worries).toBe('Worried it could be PCOS');
  });
});

describe('mood check-ins (PHQ-9 / GAD-7)', () => {
  const all = (type: 'PHQ9' | 'GAD7', value: number) => Object.fromEntries(MIND_CHECKS[type].questions.map((q) => [q.id, value]));

  it('scores with the published bands', () => {
    expect(scoreMindCheck('PHQ9', { ...all('PHQ9', 1), self_harm: 0 })).toMatchObject({ score: 8, maxScore: 27, band: 'MILD', selfHarm: false });
    expect(scoreMindCheck('PHQ9', { ...all('PHQ9', 2), self_harm: 0 })).toMatchObject({ score: 16, band: 'MODERATELY_SEVERE' });
    expect(scoreMindCheck('GAD7', all('GAD7', 3))).toMatchObject({ score: 21, maxScore: 21, band: 'SEVERE' });
    expect(scoreMindCheck('GAD7', all('GAD7', 0))).toMatchObject({ band: 'MINIMAL', helplines: [] });
    expect(missingMindAnswers('GAD7', { nervous: 1 })).toHaveLength(6);
  });

  it('always offers crisis support when item 9 is answered, whatever the total', () => {
    const result = scoreMindCheck('PHQ9', { ...all('PHQ9', 0), self_harm: 1 });
    expect(result).toMatchObject({ score: 1, band: 'MINIMAL', selfHarm: true });
    expect(result.helplines.map((h) => h.number)).toEqual(expect.arrayContaining(['14416', '112']));
    expect(result.advice).toMatch(/14416/);
  });
});

describe('preventive check-ups', () => {
  it('lists what applies at her age', () => {
    expect(preventiveChecksFor(21).map((c) => c.id)).toEqual(['hpv_vaccine', 'haemoglobin']);
    expect(preventiveChecksFor(35).map((c) => c.id)).toEqual(['haemoglobin', 'cervical', 'breast', 'oral', 'bp_sugar']);
    expect(preventiveChecksFor(70).map((c) => c.id)).toEqual(['oral', 'bp_sugar', 'bone']);
  });
});

describe('FHIR export', () => {
  it('builds a FHIR R4 collection bundle with LOINC-coded observations', () => {
    const report = {
      version: 1,
      generatedAt: '2026-10-25T08:00:00.000Z',
      rangeStart: day(-179),
      rangeEnd: TODAY,
      patient: { firstName: 'Meera', age: 27, lifeStage: 'PREGNANCY', knownConditions: [] },
      cycle: null,
      pain: { averageDuringPeriod: null, maximum: null, daysAt6OrMore: 0 },
      symptoms: [],
      patterns: [],
      redFlags: [],
      screenings: [],
      labs: [{ name: 'Haemoglobin', value: 10.4, unit: 'g/dL', flag: 'LOW', takenAt: day(-12), previous: null, loinc: '718-7' }],
      questionsToAsk: [],
      notes: [],
      loggedDays: 60,
      disclaimer: '',
      vitals: { bloodPressure: [{ date: day(-1), systolic: 142, diastolic: 92 }], weight: [] },
      medications: [{ name: 'Calcium', dose: '500 mg', schedule: 'Twice a day', reason: 'Pregnancy', since: null }],
      pregnancy: { stage: 'PREGNANCY', weeks: 30, days: 2, trimester: 3, dueDate: day(68) },
    } satisfies DoctorReport;

    const bundle = toFhirBundle(report);
    expect(bundle).toMatchObject({ resourceType: 'Bundle', type: 'collection' });
    const resources = bundle.entry.map((e) => e.resource);
    expect(resources[0]).toMatchObject({ resourceType: 'Patient', gender: 'female', birthDate: '1999' });
    const bp = resources.find((r) => (r.code as { coding?: Array<{ code: string }> })?.coding?.[0]?.code === '85354-9')!;
    expect(bp.component).toHaveLength(2);
    const hb = resources.find((r) => (r.code as { coding?: Array<{ code: string }> })?.coding?.[0]?.code === '718-7')!;
    expect(hb.interpretation).toEqual([{ coding: [{ system: expect.any(String), code: 'L' }] }]);
    expect(resources.some((r) => r.resourceType === 'MedicationStatement')).toBe(true);
    const urls = bundle.entry.map((e) => e.fullUrl);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.every((u) => /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/.test(u))).toBe(true);
  });
});
