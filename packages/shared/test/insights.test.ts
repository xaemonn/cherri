import { describe, expect, it } from 'vitest';
import {
  addDays,
  currentStreak,
  detectRedFlags,
  findPatterns,
  generateDemoData,
  interpretLabResult,
  longestStreak,
  predictCycle,
  summarizeSymptoms,
  buildWrapped,
  type LabRecord,
  type LogRecord,
  type PeriodRecord,
} from '../src';

const TODAY = '2026-10-24';
const demo = generateDemoData(TODAY);
const options = { today: TODAY, expectedCycleLength: 39, defaultPeriodLength: 5 };
const demoLabs: LabRecord[] = demo.labReport.results.map((r) => {
  const interpreted = interpretLabResult(r);
  return { ...interpreted, takenAt: demo.labReport.takenAt };
});

describe('demo data', () => {
  it('is deterministic and realistic', () => {
    expect(generateDemoData(TODAY)).toEqual(demo);
    expect(demo.periods).toHaveLength(6);
    expect(demo.logs.length).toBeGreaterThan(150);
    expect(demo.logs.at(-1)?.date).toBe(TODAY);
  });
});

describe('Pattern Radar', () => {
  const report = findPatterns(demo.logs, demo.periods, options);

  it('finds premenstrual headaches and mood changes', () => {
    expect(report.ready).toBe(true);
    const headache = report.patterns.find((p) => p.feature === 'headache');
    expect(headache?.window).toBe('PREMENSTRUAL');
    expect(headache?.message).toMatch(/week before your period/);

    const mood = report.patterns.find((p) => ['low_mood', 'irritability', 'low_mood_score'].includes(p.feature));
    expect(mood).toBeDefined();
    expect(mood?.hint?.screening).toBe('PMDD');
  });

  it('finds strong pain during periods and suggests the endometriosis check', () => {
    const pain = report.patterns.find((p) => p.feature === 'high_pain');
    expect(pain?.window).toBe('MENSTRUAL');
    expect(pain?.hint?.screening).toBe('ENDOMETRIOSIS');
  });

  it('only reports significant patterns, surprising ones before textbook ones', () => {
    for (const p of report.patterns) expect(p.pValue).toBeLessThan(0.05);
    const expectedFlags = report.patterns.map((p) => p.expected);
    expect(expectedFlags).toEqual([...expectedFlags].sort((a, b) => Number(a) - Number(b)));
    const all = findPatterns(demo.logs, demo.periods, { ...options, limit: 50 });
    expect(all.patterns.find((p) => p.feature === 'cramps')?.expected).toBe(true);
  });

  it('waits for enough data before guessing', () => {
    const early = findPatterns(demo.logs.slice(0, 20), demo.periods.slice(0, 1), options);
    expect(early.ready).toBe(false);
    expect(early.needs?.cycles).toBeGreaterThan(0);
  });

  it('finds nothing in random noise', () => {
    const periods: PeriodRecord[] = [0, 28, 56, 84].map((d) => ({ startDate: addDays('2026-01-01', d) }));
    const logs: LogRecord[] = Array.from({ length: 84 }, (_, i) => ({
      date: addDays('2026-01-01', i),
      // Same symptom every 3rd day regardless of phase: no cycle relationship.
      symptoms: i % 3 === 0 ? [{ code: 'acne', severity: 1 }] : [],
    }));
    const noise = findPatterns(logs, periods, { today: '2026-03-27', expectedCycleLength: 28, defaultPeriodLength: 5 });
    expect(noise.ready).toBe(true);
    expect(noise.patterns.find((p) => p.feature === 'acne')).toBeUndefined();
  });
});

describe('red flags', () => {
  it('flags the demo persona’s long cycles, heavy painful periods and low haemoglobin', () => {
    const prediction = predictCycle(demo.periods, { today: TODAY, typicalCycleLength: 32 });
    const flags = detectRedFlags({ today: TODAY, lifeStage: 'CYCLE', age: 21, periods: demo.periods, logs: demo.logs, labs: demoLabs, prediction });
    const codes = flags.map((f) => f.code);
    expect(codes).toEqual(
      expect.arrayContaining(['INFREQUENT_PERIODS', 'IRREGULAR_CYCLES', 'HEAVY_BLEEDING', 'SEVERE_PERIOD_PAIN', 'LOW_HAEMOGLOBIN', 'LOW_VITAMIN_D']),
    );
    expect(codes).not.toContain('NO_PERIOD_90_DAYS');
  });

  it('stays quiet for a healthy regular cycle', () => {
    const periods = [0, 28, 56, 84].map((d) => ({ startDate: addDays('2026-01-01', d), endDate: addDays('2026-01-01', d + 4) }));
    const flags = detectRedFlags({ today: '2026-04-05', lifeStage: 'CYCLE', periods, logs: [], labs: [] });
    expect(flags).toEqual([]);
  });

  it('puts urgent flags first', () => {
    const flags = detectRedFlags({
      today: '2026-04-05',
      lifeStage: 'MENOPAUSE',
      periods: [],
      logs: [{ date: '2026-04-01', flow: 'SPOTTING', symptoms: [] }],
      labs: [{ code: 'VITD', name: 'Vitamin D', value: 12, flag: 'LOW', takenAt: '2026-03-01' }],
    });
    expect(flags[0]?.code).toBe('POSTMENOPAUSAL_BLEEDING');
    expect(flags[0]?.severity).toBe('URGENT');
  });

  it('flags 90+ days without a period', () => {
    const flags = detectRedFlags({ today: '2026-06-01', lifeStage: 'CYCLE', periods: [{ startDate: '2026-02-20' }], logs: [], labs: [] });
    expect(flags.map((f) => f.code)).toContain('NO_PERIOD_90_DAYS');
  });
});

describe('summaries', () => {
  it('ranks symptoms and finds their peak phase', () => {
    const summary = summarizeSymptoms(demo.logs, demo.periods, { ...options, days: 90 });
    expect(summary[0]?.days).toBeGreaterThanOrEqual(summary[1]?.days ?? 0);
    const headache = summary.find((s) => s.code === 'headache');
    expect(headache?.peakPhase).toBe('LUTEAL');
  });

  it('counts streaks', () => {
    expect(currentStreak(['2026-10-22', '2026-10-23', '2026-10-24'], '2026-10-24')).toBe(3);
    expect(currentStreak(['2026-10-22', '2026-10-23'], '2026-10-24')).toBe(2);
    expect(currentStreak(['2026-10-20'], '2026-10-24')).toBe(0);
    expect(longestStreak(['2026-01-01', '2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07'])).toBe(3);
  });

  it('builds a Cycle Wrapped recap', () => {
    const wrapped = buildWrapped(demo.logs, demo.periods, { ...options, days: 90 });
    expect(wrapped.daysLogged).toBeGreaterThan(60);
    expect(wrapped.topSymptoms).toHaveLength(3);
    expect(wrapped.toughPhase).toBe('MENSTRUAL');
    expect(wrapped.powerPhase).not.toBe('MENSTRUAL');
  });
});
