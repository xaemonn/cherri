import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SCREENING_TYPES, screeningSubmitSchema, type ScreeningSubmitInput, type ScreeningType } from '@cherri/shared';
import { z } from 'zod';
import { CurrentUser, ZodPipe, type AuthUser } from '../common/http';
import { ScreeningsService } from './screenings.service';

const typeParam = new ZodPipe(z.enum(SCREENING_TYPES, { message: `Screening must be one of ${SCREENING_TYPES.join(', ')}` }));

@Controller('screenings')
export class ScreeningsController {
  constructor(private readonly screenings: ScreeningsService) {}

  @Get()
  overview(@CurrentUser() user: AuthUser) {
    return this.screenings.overview(user.id);
  }

  @Get('history')
  history(@CurrentUser() user: AuthUser) {
    return this.screenings.history(user.id);
  }

  @Get(':type')
  detail(@CurrentUser() user: AuthUser, @Param('type', typeParam) type: ScreeningType) {
    return this.screenings.detail(user.id, type);
  }

  @Post(':type')
  submit(
    @CurrentUser() user: AuthUser,
    @Param('type', typeParam) type: ScreeningType,
    @Body(new ZodPipe(screeningSubmitSchema)) body: ScreeningSubmitInput,
  ) {
    return this.screenings.submit(user.id, type, body.answers);
  }
}
