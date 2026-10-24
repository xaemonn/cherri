import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import type { HealthResponse } from '@cherri/shared';
import { LlmGateway } from './ai/llm/llm.gateway';
import { PrismaService } from './common/prisma.service';
import { Public } from './common/http';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: LlmGateway,
  ) {}

  @Get()
  async check(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ code: 'DB_DOWN', message: 'Database unreachable' });
    }
    return {
      status: 'ok',
      time: new Date().toISOString(),
      ai: {
        providers: this.gateway.providerNames,
        chat: this.gateway.supports('chat'),
        vision: this.gateway.supports('vision'),
        offlineFallback: true,
      },
    };
  }
}
