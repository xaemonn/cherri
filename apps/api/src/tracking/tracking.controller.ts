import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import {
  createPeriodSchema,
  dateRangeQuerySchema,
  idParamSchema,
  isoDateSchema,
  SYMPTOMS,
  updatePeriodSchema,
  upsertLogSchema,
  type CreatePeriodInput,
  type UpdatePeriodInput,
  type UpsertLogInput,
} from '@cherri/shared';
import { CurrentUser, Public, ZodPipe, type AuthUser } from '../common/http';
import { LogsService } from './logs.service';
import { PeriodsService } from './periods.service';

@Controller()
export class TrackingController {
  constructor(
    private readonly logs: LogsService,
    private readonly periods: PeriodsService,
  ) {}

  @Public()
  @Get('symptoms')
  symptomCatalog() {
    return SYMPTOMS.map(({ keywords: _keywords, ...symptom }) => symptom);
  }

  @Get('logs')
  listLogs(@CurrentUser() user: AuthUser, @Query(new ZodPipe(dateRangeQuerySchema)) query: { from?: string; to?: string }) {
    return this.logs.list(user.id, query.from, query.to);
  }

  @Get('logs/:date')
  async getLog(@CurrentUser() user: AuthUser, @Param('date', new ZodPipe(isoDateSchema)) date: string) {
    return { log: await this.logs.get(user.id, date) };
  }

  @Put('logs/:date')
  upsertLog(
    @CurrentUser() user: AuthUser,
    @Param('date', new ZodPipe(isoDateSchema)) date: string,
    @Body(new ZodPipe(upsertLogSchema)) body: UpsertLogInput,
  ) {
    return this.logs.upsert(user.id, date, body);
  }

  @Delete('logs/:date')
  @HttpCode(204)
  async deleteLog(@CurrentUser() user: AuthUser, @Param('date', new ZodPipe(isoDateSchema)) date: string): Promise<void> {
    await this.logs.remove(user.id, date);
  }

  @Get('periods')
  listPeriods(@CurrentUser() user: AuthUser) {
    return this.periods.list(user.id);
  }

  @Post('periods')
  createPeriod(@CurrentUser() user: AuthUser, @Body(new ZodPipe(createPeriodSchema)) body: CreatePeriodInput) {
    return this.periods.create(user.id, body);
  }

  @Patch('periods/:id')
  updatePeriod(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodPipe(idParamSchema)) id: string,
    @Body(new ZodPipe(updatePeriodSchema)) body: UpdatePeriodInput,
  ) {
    return this.periods.update(user.id, id, body);
  }

  @Delete('periods/:id')
  @HttpCode(204)
  async deletePeriod(@CurrentUser() user: AuthUser, @Param('id', new ZodPipe(idParamSchema)) id: string): Promise<void> {
    await this.periods.remove(user.id, id);
  }
}
