import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Put, Req } from '@nestjs/common';
import {
  healthBackgroundSchema,
  onboardingSchema,
  pinSchema,
  unlockSchema,
  updateProfileSchema,
  type HealthBackgroundInput,
  type OnboardingInput,
  type PinInput,
  type UnlockInput,
  type UpdateProfileInput,
} from '@cherri/shared';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { clientIp, CurrentUser, ZodPipe, type AuthUser } from '../common/http';
import { UsersService } from './users.service';

const deleteAccountSchema = z.object({ confirm: z.literal('DELETE', { message: 'Type DELETE to confirm' }) });

@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@CurrentUser() user: AuthUser) {
    return this.users.me(user.id);
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body(new ZodPipe(updateProfileSchema)) body: UpdateProfileInput) {
    return this.users.update(user.id, body);
  }

  @Post('onboarding')
  @HttpCode(200)
  onboard(@CurrentUser() user: AuthUser, @Body(new ZodPipe(onboardingSchema)) body: OnboardingInput) {
    return this.users.onboard(user.id, body);
  }

  @Put('pin')
  setPin(@CurrentUser() user: AuthUser, @Body(new ZodPipe(pinSchema)) body: PinInput) {
    return this.users.setPin(user.id, body);
  }

  @Delete('pin')
  removePin(@CurrentUser() user: AuthUser) {
    return this.users.removePin(user.id);
  }

  /** A 4-digit PIN is guessable, so attempts are tightly limited. */
  @Post('unlock')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  unlock(@CurrentUser() user: AuthUser, @Body(new ZodPipe(unlockSchema)) body: UnlockInput) {
    return this.users.unlock(user.id, body);
  }

  /** Menarche age, family history, allergies and past surgeries, for the doctor report. */
  @Get('background')
  background(@CurrentUser() user: AuthUser) {
    return this.users.background(user.id);
  }

  @Put('background')
  updateBackground(@CurrentUser() user: AuthUser, @Body(new ZodPipe(healthBackgroundSchema)) body: HealthBackgroundInput) {
    return this.users.updateBackground(user.id, body);
  }

  @Get('export')
  export(@CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.users.exportData(user.id, clientIp(req));
  }

  @Delete()
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Body(new ZodPipe(deleteAccountSchema)) _body: unknown, @Req() req: Request): Promise<void> {
    await this.users.deleteAccount(user.id, clientIp(req));
  }
}
