import { Body, ConflictException, Controller, ForbiddenException, HttpCode, Inject, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { CryptoService } from '../common/crypto.service';
import { CurrentUser, ZodPipe, type AuthUser } from '../common/http';
import { PrismaService } from '../common/prisma.service';
import { ENV, type Env } from '../config/env';
import { HealthDataService } from '../tracking/health-data.service';
import { seedDemoHistory } from './demo-seeder';

const loadDemoSchema = z.object({ persona: z.enum(['ananya', 'meera']).default('ananya') }).default({ persona: 'ananya' });

/** "Try it with demo data": fills an empty account with Ananya's or Meera's story so judges can explore instantly. */
@Controller('demo')
export class DemoController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly data: HealthDataService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Post('load')
  @HttpCode(201)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async load(@CurrentUser() user: AuthUser, @Body(new ZodPipe(loadDemoSchema)) body: z.output<typeof loadDemoSchema>) {
    if (!this.env.DEMO_MODE) throw new ForbiddenException({ code: 'DEMO_DISABLED', message: 'Demo data is turned off on this server.' });

    const [periods, logs] = await Promise.all([
      this.prisma.period.count({ where: { userId: user.id } }),
      this.prisma.dailyLog.count({ where: { userId: user.id } }),
    ]);
    if (periods + logs > 0) {
      throw new ConflictException({ code: 'ACCOUNT_NOT_EMPTY', message: 'Demo data can only be loaded into a fresh account.' });
    }
    const today = this.data.today(await this.data.getUser(user.id));
    return seedDemoHistory(this.prisma, (text) => this.crypto.encrypt(text), user.id, today, body.persona);
  }
}
