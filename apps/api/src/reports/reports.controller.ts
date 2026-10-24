import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { createReportSchema, idParamSchema, type CreateReportInput } from '@cherri/shared';
import type { Request } from 'express';
import { z } from 'zod';
import { clientIp, CurrentUser, Public, ZodPipe, type AuthUser } from '../common/http';
import { ReportsService } from './reports.service';

const previewQuery = z.object({
  rangeDays: z.coerce.number().int().min(30).max(365).default(180),
  includeNotes: z.stringbool().default(false),
});
const tokenParam = new ZodPipe(z.string().regex(/^[A-Za-z0-9_-]{20,64}$/, 'Invalid link'));

@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('reports/preview')
  preview(@CurrentUser() user: AuthUser, @Query(new ZodPipe(previewQuery)) query: { rangeDays: number; includeNotes: boolean }) {
    return this.reports.preview(user.id, query);
  }

  /** The report as an HL7 FHIR R4 bundle (notes are left out: they are free text for her doctor's eyes). */
  @Get('reports/fhir')
  fhir(@CurrentUser() user: AuthUser, @Query(new ZodPipe(previewQuery)) query: { rangeDays: number }) {
    return this.reports.fhir(user.id, query.rangeDays);
  }

  @Post('reports')
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(createReportSchema)) body: CreateReportInput, @Req() req: Request) {
    return this.reports.createShare(user.id, body, clientIp(req));
  }

  @Get('reports')
  list(@CurrentUser() user: AuthUser) {
    return this.reports.list(user.id);
  }

  @Get('reports/:id/accesses')
  accesses(@CurrentUser() user: AuthUser, @Param('id', new ZodPipe(idParamSchema)) id: string) {
    return this.reports.accesses(user.id, id);
  }

  @Delete('reports/:id')
  @HttpCode(204)
  async revoke(@CurrentUser() user: AuthUser, @Param('id', new ZodPipe(idParamSchema)) id: string, @Req() req: Request): Promise<void> {
    await this.reports.revoke(user.id, id, clientIp(req));
  }

  @Public()
  @Get('share/:token')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  view(@Param('token', tokenParam) token: string, @Req() req: Request) {
    return this.reports.view(token, { ip: clientIp(req), userAgent: req.headers['user-agent'] });
  }
}
