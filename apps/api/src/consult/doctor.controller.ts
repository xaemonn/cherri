import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CONSULT_STATUSES, doctorMessageSchema, type ConsultStatus } from '@cherri/shared';
import type { z } from 'zod';
import { CurrentUser, ZodPipe, type AuthUser } from '../common/http';
import { ConsultService } from './consult.service';
import { DoctorGuard } from './doctor.guard';

/** The doctor portal: triage inbox and replies. */
@Controller('doctor/consultations')
@UseGuards(DoctorGuard)
export class DoctorController {
  constructor(private readonly consults: ConsultService) {}

  @Get()
  inbox(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    const filter = CONSULT_STATUSES.includes(status as ConsultStatus) ? (status as ConsultStatus) : undefined;
    return this.consults.inbox(user.id, filter);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.consults.getForDoctor(user.id, id);
  }

  @Post(':id/messages')
  reply(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body(new ZodPipe(doctorMessageSchema)) body: z.output<typeof doctorMessageSchema>) {
    return this.consults.doctorMessage(user.id, id, body.body, body.tests);
  }

  @Post(':id/in-person')
  @HttpCode(200)
  recommendVisit(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.consults.recommendVisit(user.id, id);
  }

  @Post(':id/resolve')
  @HttpCode(200)
  resolve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.consults.resolve(user.id, id);
  }
}
