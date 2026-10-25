import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { idParamSchema, trustedContactSchema, type TrustedContactInput } from '@cherri/shared';
import { CurrentUser, ZodPipe, type AuthUser } from '../common/http';
import { ContactsService } from './contacts.service';

@Controller('contacts')
export class SafetyController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.contacts.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(trustedContactSchema)) body: TrustedContactInput) {
    return this.contacts.create(user.id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('id', new ZodPipe(idParamSchema)) id: string): Promise<void> {
    await this.contacts.remove(user.id, id);
  }
}
