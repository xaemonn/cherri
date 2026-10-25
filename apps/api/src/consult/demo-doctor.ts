import type { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

export const DEMO_DOCTOR_EMAIL = 'doctor@cherri.app';
export const DEMO_DOCTOR_PASSWORD = 'cherri-doctor-2026';

/** A verified demo gynaecologist so the doctor portal can be tried end to end. Idempotent. */
export async function ensureDemoDoctor(prisma: Pick<PrismaClient, 'user'>): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_DOCTOR_EMAIL } });
  if (existing) return;
  await prisma.user.create({
    data: {
      email: DEMO_DOCTOR_EMAIL,
      passwordHash: await hash(DEMO_DOCTOR_PASSWORD),
      name: 'Dr. Kavya Rao',
      role: 'DOCTOR',
      onboardedAt: new Date(),
      consentAt: new Date(),
      doctorProfile: { create: { name: 'Dr. Kavya Rao (demo)', specialty: 'GYNAECOLOGIST', registrationNo: 'DEMO-KMC-2026', verified: true } },
    },
  });
}
