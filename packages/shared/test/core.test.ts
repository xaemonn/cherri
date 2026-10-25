import { describe, expect, it } from 'vitest';
import {
  addDays,
  diffDays,
  fisherExactGreater,
  isISODate,
  normalCdf,
  phaseForDay,
  predictCycle,
  computeCycleStats,
  todayIn,
  type PeriodRecord,
} from '../src';

describe('dates', () => {
  it('does calendar arithmetic across month boundaries', () => {
    expect(addDays('2026-02-27', 2)).toBe('2026-03-01');
    expect(diffDays('2026-03-01', '2026-02-27')).toBe(2);
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('validates real dates only', () => {
    expect(isISODate('2026-10-24')).toBe(true);
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isISODate('24-10-2026')).toBe(false);
  });

  it('resolves "today" in the user timezone', () => {
    // 20:00 UTC is already 01:30 the next day in India.
    expect(todayIn('Asia/Kolkata', new Date('2026-10-24T20:00:00Z'))).toBe('2026-10-25');
    expect(todayIn('UTC', new Date('2026-10-24T20:00:00Z'))).toBe('2026-10-24');
  });
});

describe('math', () => {
  it('computes the one-sided Fisher exact test (lady tasting tea)', () => {
    expect(fisherExactGreater(3, 1, 1, 3)).toBeCloseTo(17 / 70, 6);
    expect(fisherExactGreater(0, 4, 4, 0)).toBeCloseTo(1, 6);
  });

  it('approximates the normal CDF', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
  });
});

function regularPeriods(count: number, length = 28, from = '2026-01-01'): PeriodRecord[] {
  return Array.from({ length: count }, (_, i) => ({ startDate: addDays(from, i * length) }));
}

describe('phases', () => {
  it('maps cycle days to phases for a 28-day cycle', () => {
    expect(phaseForDay(1, 28, 5)).toBe('MENSTRUAL');
    expect(phaseForDay(10, 28, 5)).toBe('FOLLICULAR');
    expect(phaseForDay(14, 28, 5)).toBe('OVULATORY');
    expect(phaseForDay(20, 28, 5)).toBe('LUTEAL');
    expect(phaseForDay(35, 28, 5)).toBe('LUTEAL');
  });
});

describe('cycle prediction', () => {
  it('returns no prediction without data', () => {
    const p = predictCycle([], { today: '2026-06-01' });
    expect(p.hasData).toBe(false);
    expect(p.nextPeriod).toBeNull();
  });

  it('predicts a regular 28-day cycle and the current phase', () => {
    const periods = regularPeriods(7); // last start 2026-06-18
    const p = predictCycle(periods, { today: '2026-06-28', typicalCycleLength: 28 });
    expect(p.nextPeriod?.date).toBe('2026-07-16');
    expect(p.current?.day).toBe(11);
    expect(p.current?.phase).toBe('FOLLICULAR');
    expect(p.nextPeriod?.confidence).toBeGreaterThan(0.7);
    expect(p.upcoming).toHaveLength(3);
    expect(p.upcoming[1]?.periodStart).toBe('2026-08-13');
  });

  it('gets more confident with every logged cycle', () => {
    const today = '2026-06-28';
    const confidence = (n: number) =>
      predictCycle(regularPeriods(n, 30, addDays('2026-06-20', -(n - 1) * 30)), { today }).nextPeriod!.confidence;
    expect(confidence(1)).toBeLessThan(confidence(2));
    expect(confidence(2)).toBeLessThan(confidence(4));
    expect(confidence(4)).toBeLessThan(confidence(7));
  });

  it('learns her real cycle length over the onboarding guess', () => {
    const periods = regularPeriods(7, 34);
    const p = predictCycle(periods, { today: addDays(periods.at(-1)!.startDate, 3), typicalCycleLength: 28 });
    expect(p.model.meanCycleLength).toBeGreaterThan(33);
    expect(p.model.meanCycleLength).toBeLessThanOrEqual(34);
  });

  it('uses the onboarding cycle length as the prior when there is one period', () => {
    const p = predictCycle([{ startDate: '2026-06-01' }], { today: '2026-06-05', typicalCycleLength: 32 });
    expect(p.nextPeriod?.date).toBe('2026-07-03');
  });

  it('flags a late period and keeps forecasting forward', () => {
    const periods = regularPeriods(4);
    const last = periods.at(-1)!.startDate;
    const today = addDays(last, 35);
    const p = predictCycle(periods, { today });
    expect(p.nextPeriod?.isLate).toBe(true);
    expect(p.nextPeriod?.daysLate).toBe(7);
    expect(p.upcoming[0]!.periodStart >= today).toBe(true);
  });

  it('classifies regularity and ignores implausible gaps', () => {
    const irregular = [36, 41, 34, 45, 38].reduce<PeriodRecord[]>(
      (acc, len) => [...acc, { startDate: addDays(acc.at(-1)!.startDate, len) }],
      [{ startDate: '2026-01-01' }],
    );
    const stats = computeCycleStats(irregular);
    expect(stats.regularity).toBe('IRREGULAR');
    expect(stats.variability).toBe(11);

    const withGap = [...regularPeriods(3), { startDate: addDays('2026-01-01', 56 + 120) }];
    expect(computeCycleStats(withGap).cycleLengths).toEqual([28, 28]);
  });
});
