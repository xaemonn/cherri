import type { User } from '@prisma/client';
import { fromUTCDate, type PublicUser } from '@cherri/shared';

export type { PublicUser };

export function ageOf(user: Pick<User, 'birthYear'>, today: string): number | null {
  return user.birthYear ? Number(today.slice(0, 4)) - user.birthYear : null;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    isGuest: user.isGuest,
    name: user.name,
    birthYear: user.birthYear,
    age: ageOf(user, new Date().toISOString()),
    lifeStage: user.lifeStage,
    language: user.language,
    companionTone: user.companionTone,
    avgCycleLength: user.avgCycleLength,
    avgPeriodLength: user.avgPeriodLength,
    conditions: user.conditions,
    timezone: user.timezone,
    dueDate: user.dueDate ? fromUTCDate(user.dueDate) : null,
    deliveryDate: user.deliveryDate ? fromUTCDate(user.deliveryDate) : null,
    role: user.role,
    hasPin: user.pinHash !== null,
    onboarded: user.onboardedAt !== null,
    createdAt: user.createdAt.toISOString(),
  };
}
