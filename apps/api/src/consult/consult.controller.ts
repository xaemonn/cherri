import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { consultMessageSchema, createConsultSchema } from '@cherri/shared';
import type { z } from 'zod';
import { CurrentUser, ZodPipe, type AuthUser } from '../common/http';
import { ConsultService } from './consult.service';

/** Her side of the async doctor chat. */
@Controller('consultations')
export class ConsultController {
  constructor(private readonly consults: ConsultService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.consults.list(user.id);
  }

  @Get('preview')
  async preview(@CurrentUser() user: AuthUser) {
    return (await this.consults.snapshot(user.id)).snapshot;
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(createConsultSchema)) body: z.output<typeof createConsultSchema>) {
    return this.consults.create(user.id, body);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.consults.getForPatient(user.id, id);
  }

  @Post(':id/messages')
  send(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body(new ZodPipe(consultMessageSchema)) body: z.output<typeof consultMessageSchema>) {
    return this.consults.patientMessage(user.id, id, body.body, body.source);
  }

  /** She confirms she is safe (or has had care) and the paused chat resumes. */
  @Post(':id/emergency-ack')
  @HttpCode(200)
  acknowledge(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.consults.acknowledgeEmergency(user.id, id);
  }
}
