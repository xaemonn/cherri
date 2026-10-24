import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  guestSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  upgradeGuestSchema,
  type GuestInput,
  type LoginInput,
  type RefreshInput,
  type RegisterInput,
  type UpgradeGuestInput,
} from '@cherri/shared';
import type { Request } from 'express';
import { clientIp, CurrentUser, Public, ZodPipe, type AuthUser } from '../common/http';
import { AuthService } from './auth.service';

const meta = (req: Request) => ({ ip: clientIp(req), userAgent: req.headers['user-agent'] });

@Controller('auth')
@Throttle({ default: { limit: 10, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body(new ZodPipe(registerSchema)) body: RegisterInput, @Req() req: Request) {
    return this.auth.register(body, meta(req));
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodPipe(loginSchema)) body: LoginInput, @Req() req: Request) {
    return this.auth.login(body, meta(req));
  }

  @Public()
  @Post('guest')
  guest(@Body(new ZodPipe(guestSchema)) body: GuestInput, @Req() req: Request) {
    return this.auth.createGuest(body, meta(req));
  }

  @Post('upgrade')
  upgrade(@CurrentUser() user: AuthUser, @Body(new ZodPipe(upgradeGuestSchema)) body: UpgradeGuestInput, @Req() req: Request) {
    return this.auth.upgradeGuest(user.id, body, meta(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  refresh(@Body(new ZodPipe(refreshSchema)) body: RefreshInput, @Req() req: Request) {
    return this.auth.refresh(body.refreshToken, meta(req));
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Body(new ZodPipe(refreshSchema)) body: RefreshInput): Promise<void> {
    await this.auth.logout(body.refreshToken);
  }
}
