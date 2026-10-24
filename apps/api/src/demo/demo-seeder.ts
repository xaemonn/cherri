import type { PrismaClient } from '@prisma/client';
import {
  generateDemoData,
  generatePregnancyDemoData,
  interpretLabResult,
  toUTCDate,
  type DemoPersona,
  type ISODate,
} from '@cherri/shared';

/**
 * Writes a demo history into an existing account: "Ananya" (≈7 months of cycles, periods and a
 * lab report) or "Meera" (30 weeks pregnant with rising blood pressure). Shared by the seed
 * script, the demo endpoint and tests.
 */
export async function seedDemoHistory(
  prisma: PrismaClient,
  encrypt: (plaintext: string) => string,
  userId: string,
  today: ISODate,
  persona: DemoPersona = 'ananya',
): Promise<{ periods: number; logs: number; labResults: number }> {
  const demo = persona === 'meera' ? generatePregnancyDemoData(today) : generateDemoData(today);
  const optional = (text: string | null | undefined) => (text ? encrypt(text) : null);

  await prisma.$transaction(
    async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          name: demo.profile.name,
          birthYear: demo.profile.birthYear,
          lifeStage: demo.profile.lifeStage,
          dueDate: demo.profile.dueDate ? toUTCDate(demo.profile.dueDate) : null,
          avgCycleLength: demo.profile.avgCycleLength,
          avgPeriodLength: demo.profile.avgPeriodLength,
          menarcheAge: demo.background.menarcheAge,
          familyHistory: demo.background.familyHistory,
          allergies: optional(demo.background.allergies),
          surgeries: optional(demo.background.surgeries),
          onboardedAt: new Date(),
          consentAt: new Date(),
        },
      });
      await tx.period.createMany({
        data: demo.periods.map((p) => ({ userId, startDate: toUTCDate(p.startDate), endDate: p.endDate ? toUTCDate(p.endDate) : null })),
      });
      for (const log of demo.logs) {
        await tx.dailyLog.create({
          data: {
            userId,
            date: toUTCDate(log.date),
            flow: log.flow ?? null,
            mood: log.mood,
            energy: log.energy,
            stress: log.stress,
            sleepHours: log.sleepHours,
            painLevel: log.painLevel,
            systolic: log.systolic ?? null,
            diastolic: log.diastolic ?? null,
            weightKg: log.weightKg ?? null,
            notes: log.notes ? encrypt(log.notes) : null,
            symptoms: { create: log.symptoms.map((s) => ({ code: s.code, severity: s.severity })) },
          },
        });
      }
      const takenAt = toUTCDate(demo.labReport.takenAt);
      await tx.labReport.create({
        data: {
          userId,
          source: 'UPLOAD_PDF',
          fileName: `${demo.profile.name.toLowerCase()}-lab-report.pdf`,
          labName: demo.labReport.labName,
          takenAt,
          extractor: 'demo',
          results: {
            create: demo.labReport.results.map((raw) => {
              const r = interpretLabResult(raw);
              return { userId, code: r.code, name: r.name, value: r.value, unit: r.unit ?? null, refLow: r.refLow ?? null, refHigh: r.refHigh ?? null, flag: r.flag, takenAt };
            }),
          },
        },
      });
      await tx.medication.createMany({
        data: demo.medications.map((m) => ({
          userId,
          name: encrypt(m.name),
          dose: optional(m.dose),
          schedule: optional(m.schedule),
          reason: optional(m.reason),
          startedOn: m.startedOn ? toUTCDate(m.startedOn) : null,
        })),
      });
      await tx.symptomStory.create({
        data: { userId, text: encrypt(demo.story.text), structured: encrypt(JSON.stringify(demo.story.structured)), source: 'MANUAL' },
      });
    },
    { timeout: 60_000 },
  );

  return { periods: demo.periods.length, logs: demo.logs.length, labResults: demo.labReport.results.length };
}
