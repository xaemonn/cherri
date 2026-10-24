import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, ZodPipe, type AuthUser } from '../common/http';
import { InsightsService } from './insights.service';

const wrappedQuery = z.object({ days: z.coerce.number().int().min(30).max(365).default(90) });

@Controller()
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.insights.dashboard(user.id);
  }

  @Get('cycle')
  cycle(@CurrentUser() user: AuthUser) {
    return this.insights.cycle(user.id);
  }

  /** Pregnancy and postnatal care: weeks, care plan, blood pressure and weight trends, schemes. */
  @Get('motherhood')
  motherhood(@CurrentUser() user: AuthUser) {
    return this.insights.motherhood(user.id);
  }

  @Get('insights')
  overview(@CurrentUser() user: AuthUser) {
    return this.insights.insights(user.id);
  }

  @Get('wrapped')
  wrapped(@CurrentUser() user: AuthUser, @Query(new ZodPipe(wrappedQuery)) query: { days: number }) {
    return this.insights.wrapped(user.id, query.days);
  }
}
