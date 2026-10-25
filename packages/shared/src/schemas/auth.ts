import { z } from 'zod';

const email = z.email({ message: 'Enter a valid email' }).max(254).transform((e) => e.toLowerCase().trim());
const password = z.string().min(8, 'Password must be at least 8 characters').max(128);
const name = z.string().trim().min(1).max(60);

export const registerSchema = z.object({ email, password, name: name.optional() });
export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
export const refreshSchema = z.object({ refreshToken: z.string().min(20).max(200) });
export const guestSchema = z.object({ name: name.optional() });
export const upgradeGuestSchema = z.object({ email, password });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type GuestInput = z.infer<typeof guestSchema>;
export type UpgradeGuestInput = z.infer<typeof upgradeGuestSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
}
