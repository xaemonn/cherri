import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { idParamSchema, manualLabReportSchema, type ManualLabReportInput } from '@cherri/shared';
import { CurrentUser, ZodPipe, type AuthUser } from '../common/http';
import { LabsService } from './labs.service';

const MAX_FILE_BYTES = 8 * 1024 * 1024;

@Controller('labs')
export class LabsController {
  constructor(private readonly labs: LabsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.labs.list(user.id);
  }

  @Get('trends')
  trends(@CurrentUser() user: AuthUser) {
    return this.labs.trends(user.id);
  }

  @Post('upload')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES } }))
  upload(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException({ code: 'FILE_REQUIRED', message: 'Attach the report in the "file" field.' });
    return this.labs.upload(user.id, file);
  }

  @Post('manual')
  manual(@CurrentUser() user: AuthUser, @Body(new ZodPipe(manualLabReportSchema)) body: ManualLabReportInput) {
    return this.labs.manual(user.id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('id', new ZodPipe(idParamSchema)) id: string): Promise<void> {
    await this.labs.remove(user.id, id);
  }
}
