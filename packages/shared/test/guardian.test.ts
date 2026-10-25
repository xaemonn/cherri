import { describe, expect, it } from 'vitest';
import {
  addDays,
  clinicalTags,
  conceptionRisk,
  detectConsultEmergency,
  detectRedFlags,
  ecOptions,
  generateDemoData,
  medicineGuidance,
  missedPillAdvice,
  pbacCycles,
  pbacDayScore,
  pbacTotals,
  pregnancyTestDate,
  type ClinicalSnapshot,
} from '../src';

const TODAY = '2026-10-25';

describe('PBAC blood-loss chart', () => {
  it('scores pads, tampons, clots and flooding with Higham’s points', () => {
    expect(pbacDayScore({ padsLight: 2, padsModerate: 1, padsSoaked: 1 })).toBe(2 + 5 + 20);
    expect(pbacDayScore({ tamponsSoaked: 2, clotsSmall: 1, clotsLarge: 1, flooding: 1 })).toBe(20 + 1 + 5 + 5);
    expect(pbacDayScore(null)).toBe(0);
  });

  it('classifies a cycle over 100 points or 80 mL as heavy', () => {
    expect(pbacTotals([{ padsSoaked: 5 }]).heavy).toBe(false);
    expect(pbacTotals([{ padsSoaked: 5 }, { padsModerate: 1 }]).heavy).toBe(true);
    expect(pbacTotals([{ cupMl: 60 }, { cupMl: 30 }])).toMatchObject({ cupMl: 90, heavy: true });
    expect(pbacTotals([{ cupMl: 40 }, { padsModerate: 6 }])).toMatchObject({ score: 30, estimatedMl: 64, heavy: false });
  });

  it('flags the demo’s heavy periods and replaces the vaguer heavy-flow flag', () => {
    const demo = generateDemoData(TODAY);
    const cycles = pbacCycles(demo.periods, demo.logs, TODAY);
    expect(cycles.length).toBe(2);
    expect(cycles.at(-1)!.heavy).toBe(true);
    const codes = detectRedFlags({ today: TODAY, lifeStage: 'CYCLE', age: 21, periods: demo.periods, logs: demo.logs, labs: [] }).map((f) => f.code);
    expect(codes).toContain('PBAC_HEAVY');
    expect(codes).not.toContain('HEAVY_BLEEDING');
  });
});

describe('medicine & food guardian', () => {
  it('gives timing rules by medicine and catches clashes', () => {
    const guide = medicineGuidance([{ name: 'Thyronorm 50' }, { name: 'Orofer XT (iron)' }, { name: 'Shelcal 500' }, { name: 'Meftal-Spas' }, { name: 'Brufen 400' }]);
    expect(guide.medicines[0]).toMatchObject({ classes: ['LEVOTHYROXINE'], when: expect.stringMatching(/empty stomach/) });
    expect(guide.medicines[0]!.rules.map((r) => r.detail).join(' ')).toMatch(/45 to 60 minutes/);
    expect(guide.medicines[1]!.rules.map((r) => r.title).join(' ')).toMatch(/No chai, coffee, milk/);
    const messages = guide.conflicts.map((c) => c.message).join(' ');
    expect(messages).toMatch(/Calcium blocks iron absorption. Space them at least 4 hours apart/);
    expect(guide.conflicts.find((c) => c.severity === 'DANGER')?.message).toMatch(/both NSAID/);
  });

  it('warns about NSAIDs in pregnancy', () => {
    expect(medicineGuidance([{ name: 'Ibuprofen' }], { pregnant: true }).conflicts[0]!.message).toMatch(/pregnancy/);
  });

  it('follows the FSRH missed-pill rules', () => {
    expect(missedPillAdvice({ pillType: 'COMBINED', hoursLate: 10, packWeek: 2 })).toMatchObject({ backupDays: 0, takeTwoToday: true });
    expect(missedPillAdvice({ pillType: 'COMBINED', hoursLate: 30, packWeek: 2 })).toMatchObject({ backupDays: 0 });
    const twoMissed = missedPillAdvice({ pillType: 'COMBINED', hoursLate: 50, packWeek: 1, recentSex: true });
    expect(twoMissed).toMatchObject({ backupDays: 7, emergencyContraception: 'RECOMMENDED' });
    expect(missedPillAdvice({ pillType: 'COMBINED', hoursLate: 60, packWeek: 3 }).steps.join(' ')).toMatch(/skipping the break/);
    expect(missedPillAdvice({ pillType: 'PROGESTOGEN_ONLY', hoursLate: 4 })).toMatchObject({ backupDays: 2 });
    expect(missedPillAdvice({ pillType: 'DESOGESTREL', hoursLate: 10 })).toMatchObject({ backupDays: 0 });
  });
});

describe('emergency contraception triage', () => {
  it('rates conception risk from her cycle day', () => {
    expect(conceptionRisk({ cycleDay: 13, cycleLength: 28, irregular: false })).toMatchObject({ risk: 'HIGH', ovulationDay: 14, fertileStart: 9, fertileEnd: 15 });
    expect(conceptionRisk({ cycleDay: 3, cycleLength: 28, irregular: false }).risk).toBe('LOW');
    expect(conceptionRisk({ cycleDay: 3, cycleLength: 28, irregular: true }).risk).toBe('MODERATE');
    expect(conceptionRisk({ cycleDay: null, cycleLength: 28, irregular: false }).risk).toBe('MODERATE');
  });

  it('counts down each option’s window', () => {
    const early = ecOptions(10);
    expect(early.find((o) => o.id === 'LNG')).toMatchObject({ available: true, hoursLeft: 62, efficacy: expect.stringMatching(/95%/) });
    const late = ecOptions(90);
    expect(late.find((o) => o.id === 'LNG')).toMatchObject({ available: false, hoursLeft: 0 });
    expect(late.find((o) => o.id === 'UPA')).toMatchObject({ available: true, hoursLeft: 30 });
    expect(late.find((o) => o.id === 'CU_IUD')!.efficacy).toMatch(/99%/);
    expect(pregnancyTestDate('2026-10-01')).toBe(addDays('2026-10-01', 21));
  });
});

describe('doctor consults', () => {
  it('traps emergency messages instead of queueing them', () => {
    expect(detectConsultEmergency('I am bleeding through 2 pads an hour')?.title).toBe('CRITICAL SYMPTOMS DETECTED');
    expect(detectConsultEmergency('severe sharp one-sided pain since morning')?.kind).toBe('MEDICAL');
    expect(detectConsultEmergency('I passed out in the bathroom')).not.toBeNull();
    expect(detectConsultEmergency('I cannot bear the pain anymore')).not.toBeNull();
    expect(detectConsultEmergency('I want to die')?.kind).toBe('SELF_HARM');
    expect(detectConsultEmergency('My ferritin was 9, should I take iron?')).toBeNull();
  });

  it('tags the inbox from the snapshot', () => {
    const snapshot = {
      redFlags: [],
      labs: [{ name: 'Ferritin', value: 9, unit: 'ng/mL', flag: 'LOW', takenAt: TODAY, previous: null }],
      screenings: [{ title: 'PCOS check', band: 'HIGH', date: TODAY }],
      mindChecks: [],
      pregnancy: null,
      bloodLoss: { score: 140, heavy: true },
    } as unknown as ClinicalSnapshot;
    expect(clinicalTags(snapshot, [], 'LAB_REVIEW')).toEqual(['PCOS · irregular cycles', 'Low ferritin / anaemia', 'Heavy bleeding · PBAC 140']);
    expect(clinicalTags({ ...snapshot, labs: [], screenings: [], bloodLoss: null }, [], 'LAB_REVIEW')).toEqual(['Routine lab check']);
  });
});
