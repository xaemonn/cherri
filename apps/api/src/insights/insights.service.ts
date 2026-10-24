import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import {
  addDays,
  ANTENATAL_STEPS,
  babySize,
  bloodPressureReadings,
  buildWrapped,
  careStepStatus,
  currentStreak,
  detectRedFlags,
  diffDays,
  findPatterns,
  fromUTCDate,
  gestationalAge,
  MATERNAL_SCHEMES,
  moodShifts,
  nextPmsmaDay,
  PHASE_GUIDES,
  POSTNATAL_STEPS,
  postpartumAge,
  predictCycle,
  PREDICTABLE_LIFE_STAGES,
  summarizeSymptoms,
  weightReadings,
  type Condition,
  type CyclePrediction,
  type GestationalAge,
  type ISODate,
  type LabRecord,
  type LogRecord,
  type MoodShift,
  type MotherhoodResponse,
  type MotherhoodStatus,
  type PatternReport,
  type PeriodRecord,
  type PostpartumAge,
  type RedFlag,
  type CycleResponse,
  type DashboardResponse,
  type InsightsResponse,
  type ScreeningType,
  type Suggestion,
  type WrappedResponse,
} from '@cherri/shared';
import { CryptoService } from '../common/crypto.service';
import { PrismaService } from '../common/prisma.service';
import { HealthDataService } from '../tracking/health-data.service';
import { LogsService } from '../tracking/logs.service';
import { ageOf } from '../users/user.mapper';

export interface HealthSnapshot {
  user: User;
  today: ISODate;
  age: number | null;
  periods: PeriodRecord[];
  logs: LogRecord[];
  labs: LabRecord[];
  prediction: CyclePrediction | null;
  expectedCycleLength: number;
  patterns: PatternReport;
  redFlags: RedFlag[];
  /** Set when she is pregnant and has given a due date. */
  pregnancy: GestationalAge | null;
  /** Set when she is postpartum and has given the birth date. */
  postpartum: PostpartumAge | null;
}

const CONDITION_SCREENING: Partial<Record<Condition, ScreeningType>> = {
  PCOS: 'PCOS',
  ENDOMETRIOSIS: 'ENDOMETRIOSIS',
  ANEMIA: 'ANEMIA',
  THYROID: 'THYROID',
  PMDD: 'PMDD',
};

@Injectable()
export class InsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly data: HealthDataService,
    private readonly logsService: LogsService,
  ) {}

  /** Everything the insight engines know about one user, computed in one pass. */
  async snapshot(userId: string): Promise<HealthSnapshot> {
    const user = await this.data.getUser(userId);
    const today = this.data.today(user);
    const [rawPeriods, logs, labs] = await Promise.all([
      this.data.periods(userId),
      this.data.logs(userId, addDays(today, -400), today),
      this.data.labs(userId),
    ]);
    const periods = this.data.resolvePeriodEnds(rawPeriods, logs, today);

    const predictable = PREDICTABLE_LIFE_STAGES.includes(user.lifeStage);
    const prediction = predictable
      ? predictCycle(periods, { today, typicalCycleLength: user.avgCycleLength, typicalPeriodLength: user.avgPeriodLength })
      : null;
    const expectedCycleLength = Math.round(prediction?.model.meanCycleLength ?? user.avgCycleLength);
    const age = ageOf(user, today);
    const pregnancy = user.lifeStage === 'PREGNANCY' && user.dueDate ? gestationalAge(fromUTCDate(user.dueDate), today) : null;
    const postpartum = user.lifeStage === 'POSTPARTUM' && user.deliveryDate ? postpartumAge(fromUTCDate(user.deliveryDate), today) : null;

    return {
      user,
      today,
      age,
      periods,
      logs,
      labs,
      prediction,
      expectedCycleLength,
      patterns: findPatterns(logs, periods, { today, expectedCycleLength, defaultPeriodLength: user.avgPeriodLength }),
      redFlags: detectRedFlags({
        today,
        lifeStage: user.lifeStage,
        age,
        menarcheAge: user.menarcheAge,
        pregnancyWeeks: pregnancy?.weeks ?? null,
        postpartumDays: postpartum?.days ?? null,
        periods,
        logs,
        labs,
        prediction,
      }),
      pregnancy,
      postpartum,
    };
  }

  /** Pregnancy or postnatal care: where she is, what comes next, and her blood pressure and weight. */
  async motherhood(userId: string): Promise<MotherhoodResponse> {
    const snap = await this.snapshot(userId);
    const since = addDays(snap.today, -280);
    return {
      today: snap.today,
      lifeStage: snap.user.lifeStage,
      status: this.motherhoodStatus(snap),
      bloodPressure: bloodPressureReadings(snap.logs).filter((r) => r.date >= since),
      weight: weightReadings(snap.logs).filter((w) => w.date >= since),
      flags: snap.redFlags,
      schemes: MATERNAL_SCHEMES,
    };
  }

  private motherhoodStatus(snap: HealthSnapshot): MotherhoodStatus | null {
    const latestBp = bloodPressureReadings(snap.logs).at(-1) ?? null;
    if (snap.pregnancy) {
      const weeks = snap.pregnancy.weeks;
      return {
        stage: 'PREGNANCY',
        age: snap.pregnancy,
        baby: babySize(weeks),
        steps: ANTENATAL_STEPS.map((step) => ({ ...step, status: careStepStatus(step, weeks) })),
        nextPmsma: nextPmsmaDay(snap.today),
        latestBp,
      };
    }
    if (snap.postpartum && snap.user.deliveryDate) {
      const days = snap.postpartum.days;
      return {
        stage: 'POSTPARTUM',
        deliveryDate: fromUTCDate(snap.user.deliveryDate),
        age: snap.postpartum,
        steps: POSTNATAL_STEPS.map((step) => ({ ...step, status: careStepStatus(step, days) })),
        latestBp,
      };
    }
    return null;
  }

  async dashboard(userId: string): Promise<DashboardResponse> {
    const snap = await this.snapshot(userId);
    const { user, today, prediction } = snap;
    const todayLog = await this.logsService.get(userId, today);
    const current = prediction?.current;

    return {
      user: { name: user.name, lifeStage: user.lifeStage, isGuest: user.isGuest, companionTone: user.companionTone },
      today,
      cycle: current
        ? {
            day: current.day,
            phase: current.phase,
            isPeriod: current.isPeriod,
            expectedLength: current.expectedLength,
            periodLength: Math.round(prediction.stats.avgPeriodLength ?? user.avgPeriodLength),
            guide: PHASE_GUIDES[current.phase],
            nextPeriod: prediction.nextPeriod,
            fertileWindow: { start: current.fertileStart, end: current.fertileEnd, ovulation: current.ovulation },
            confidenceNote: this.confidenceNote(prediction),
          }
        : null,
      todayLog,
      streak: currentStreak(snap.logs.map((l) => l.date), today),
      patterns: snap.patterns.patterns.slice(0, 3),
      patternsReady: snap.patterns.ready,
      redFlags: snap.redFlags.slice(0, 3),
      suggestions: await this.suggestions(snap, todayLog !== null),
      motherhood: this.motherhoodStatus(snap),
    };
  }

  async cycle(userId: string): Promise<CycleResponse> {
    const snap = await this.snapshot(userId);
    return {
      today: snap.today,
      lifeStage: snap.user.lifeStage,
      prediction: snap.prediction,
      periods: [...snap.periods].reverse().slice(0, 24),
      guides: PHASE_GUIDES,
    };
  }

  async insights(userId: string): Promise<InsightsResponse> {
    const snap = await this.snapshot(userId);
    return {
      today: snap.today,
      patterns: snap.patterns,
      redFlags: snap.redFlags,
      symptoms: summarizeSymptoms(snap.logs, snap.periods, {
        today: snap.today,
        expectedCycleLength: snap.expectedCycleLength,
        defaultPeriodLength: snap.user.avgPeriodLength,
        days: 90,
      }),
      stats: snap.prediction?.stats ?? null,
      moodShifts: await this.moodShifts(snap),
    };
  }

  /** Medicines she started after which her logged mood dropped (e.g. a new hormonal pill). */
  async moodShifts(snap: HealthSnapshot): Promise<MoodShift[]> {
    const meds = await this.prisma.medication.findMany({
      where: { userId: snap.user.id, startedOn: { not: null } },
      select: { name: true, startedOn: true },
    });
    const started = meds.map((m) => ({ name: this.crypto.decrypt(m.name), startedOn: fromUTCDate(m.startedOn!) }));
    return moodShifts(snap.logs, started, snap.today);
  }

  async wrapped(userId: string, days: number): Promise<WrappedResponse> {
    const snap = await this.snapshot(userId);
    const since = new Date(Date.now() - days * 86_400_000);
    const [labsDecoded, screeningsTaken] = await Promise.all([
      this.prisma.labReport.count({ where: { userId, createdAt: { gte: since } } }),
      this.prisma.screening.count({ where: { userId, createdAt: { gte: since } } }),
    ]);
    const stats = buildWrapped(snap.logs, snap.periods, {
      today: snap.today,
      expectedCycleLength: snap.expectedCycleLength,
      defaultPeriodLength: snap.user.avgPeriodLength,
      days,
    });
    const power = stats.powerPhase ? PHASE_GUIDES[stats.powerPhase] : null;
    return {
      ...stats,
      patternsFound: snap.patterns.patterns.length,
      labsDecoded,
      screeningsTaken,
      powerPhaseVibe: power ? `${power.emoji} ${power.vibe}` : null,
      headline:
        stats.daysLogged === 0
          ? 'Your story starts with your first log.'
          : `${stats.daysLogged} days logged. ${power ? `Your power phase: ${power.vibe}.` : 'Keep going to unlock your power phase.'}`,
    };
  }

  private confidenceNote(prediction: CyclePrediction): string {
    const cycles = prediction.model.basedOnCycles;
    const pct = Math.round((prediction.nextPeriod?.confidence ?? 0) * 100);
    if (cycles === 0) return `${pct}% confident. Based on what you told us. Log your next period and this gets sharper.`;
    return `${pct}% confident, learned from ${cycles} of your cycle${cycles === 1 ? '' : 's'}.`;
  }

  private async suggestions(snap: HealthSnapshot, loggedToday: boolean): Promise<Suggestion[]> {
    const recent = await this.prisma.screening.findMany({
      where: { userId: snap.user.id, createdAt: { gte: new Date(Date.now() - 90 * 86_400_000) } },
      select: { type: true },
    });
    const done = new Set(recent.map((s) => s.type));
    const suggestions: Suggestion[] = [];
    if (snap.redFlags.some((f) => f.severity === 'URGENT') && (snap.pregnancy || snap.postpartum)) {
      suggestions.push({ type: 'DANGER_CHECK', title: 'Take the 1-minute danger-sign check', reason: 'Something you logged needs a doctor soon. The check tells you how soon.' });
    }
    if (!loggedToday) suggestions.push({ type: 'LOG_TODAY', title: 'How are you feeling today?', reason: 'A 10-second log keeps your insights sharp.' });
    const lastBp = bloodPressureReadings(snap.logs).at(-1);
    if ((snap.pregnancy && snap.pregnancy.weeks >= 20) || snap.postpartum?.postnatal) {
      if (!lastBp || diffDays(snap.today, lastBp.date) > 7) {
        suggestions.push({ type: 'LOG_BP', title: 'Log your blood pressure', reason: 'A weekly reading helps catch pre-eclampsia early, even when you feel fine.' });
      }
    }
    if (snap.redFlags.length > 0 && (await this.prisma.symptomStory.count({ where: { userId: snap.user.id } })) === 0) {
      suggestions.push({ type: 'VISIT_PREP', title: 'Get ready for your doctor visit', reason: 'Tell your story and list your medicines, so your report says it all.' });
    }

    const suggestScreening = (screening: ScreeningType, reason: string) => {
      if (done.has(screening) || suggestions.some((s) => s.screening === screening)) return;
      suggestions.push({ type: 'SCREENING', screening, title: `Take the ${screening === 'PMDD' ? 'PMS / PMDD' : screening.toLowerCase()} check`, reason });
    };
    for (const p of snap.patterns.patterns) if (p.hint?.screening) suggestScreening(p.hint.screening, p.hint.note);
    for (const f of snap.redFlags) {
      const screening = f.relatedCondition && CONDITION_SCREENING[f.relatedCondition];
      if (screening) suggestScreening(screening, f.title);
    }
    if (snap.labs.length === 0 && snap.redFlags.some((f) => f.relatedCondition === 'ANEMIA')) {
      suggestions.push({ type: 'UPLOAD_LABS', title: 'Got a blood report?', reason: 'Upload it and Cherri will explain every value.' });
    }
    return suggestions.slice(0, 4);
  }
}
