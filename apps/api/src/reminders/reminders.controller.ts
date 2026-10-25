import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { reminderSchema, type ReminderInput } from '@cherri/shared';
import { CurrentUser, ZodPipe, type AuthUser } from '../common/http';
import { RemindersService } from './reminders.service';

@Controller('reminders')
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.reminders.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(reminderSchema)) body: ReminderInput) {
    return this.reminders.create(user.id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async dismiss(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.reminders.dismiss(user.id, id);
  }
}
