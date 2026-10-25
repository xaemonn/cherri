import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { MIND_CHECK_TYPES, mindCheckSubmitSchema, type MindCheckSubmitInput, type MindCheckType } from '@cherri/shared';
import { z } from 'zod';
import { CurrentUser, ZodPipe, type AuthUser } from '../common/http';
import { MindService } from './mind.service';

const typeParam = new ZodPipe(z.enum(MIND_CHECK_TYPES, { message: `Check must be one of ${MIND_CHECK_TYPES.join(', ')}` }));

@Controller('mind-checks')
export class MindController {
  constructor(private readonly mind: MindService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.mind.list(user.id);
  }

  @Post(':type')
  submit(@CurrentUser() user: AuthUser, @Param('type', typeParam) type: MindCheckType, @Body(new ZodPipe(mindCheckSubmitSchema)) body: MindCheckSubmitInput) {
    return this.mind.submit(user.id, type, body.answers);
  }
}
