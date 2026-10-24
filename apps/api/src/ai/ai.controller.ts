import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  chatRequestSchema,
  idParamSchema,
  mythCheckRequestSchema,
  parseLogRequestSchema,
  type ChatAction,
  type ChatRequest,
  type ChatStreamEvent,
  type Citation,
  type MythCheckRequest,
  type ParseLogRequest,
} from '@cherri/shared';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { CurrentUser, ZodPipe, type AuthUser } from '../common/http';
import { AssistService } from './assist.service';
import { ChatService } from './chat/chat.service';

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const AUDIO_EXTENSION = /\.(m4a|mp3|mp4|wav|webm|ogg|oga|aac|flac|3gp|caf|mpeg|mpga)$/i;
const transcribeQuery = z.object({ language: z.enum(['en', 'hi', 'kn']).optional() });

@Controller('ai')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private readonly chat: ChatService,
    private readonly assist: AssistService,
  ) {}

  /**
   * Chat with Cherri, the AI companion. Streams Server-Sent Events by default (`event: token`, `action`,
   * `citations`, `done`, ...). Pass `?stream=false` for a single JSON response.
   */
  @Post('chat')
  async sendMessage(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(chatRequestSchema)) body: ChatRequest,
    @Query('stream') stream: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const prepared = await this.chat.prepare(user.id, body);

    if (stream === 'false') {
      const reply: string[] = [];
      const actions: ChatAction[] = [];
      let citations: Citation[] = [];
      let safety: Extract<ChatStreamEvent, { type: 'safety' }> | null = null;
      let done: Extract<ChatStreamEvent, { type: 'done' }> | null = null;
      await this.chat.respond(prepared, (event) => {
        if (event.type === 'token') reply.push(event.text);
        else if (event.type === 'action') actions.push(event.action);
        else if (event.type === 'citations') citations = event.citations;
        else if (event.type === 'safety') safety = event;
        else if (event.type === 'done') done = event;
      });
      res.json({ sessionId: prepared.session.id, reply: reply.join(''), actions, citations, safety, ...(done ?? {}) });
      return;
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let open = true;
    req.on('close', () => (open = false));
    const send = (event: ChatStreamEvent) => {
      if (open) res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    };
    try {
      await this.chat.respond(prepared, send);
    } catch (error) {
      this.logger.error('Chat stream failed', error instanceof Error ? error.stack : error);
      send({ type: 'error', message: 'Cherri hit a snag. Please try again.' });
    } finally {
      res.end();
    }
  }

  @Get('sessions')
  sessions(@CurrentUser() user: AuthUser) {
    return this.chat.listSessions(user.id);
  }

  @Get('sessions/:id')
  sessionMessages(@CurrentUser() user: AuthUser, @Param('id', new ZodPipe(idParamSchema)) id: string) {
    return this.chat.messages(user.id, id);
  }

  @Delete('sessions/:id')
  @HttpCode(204)
  async deleteSession(@CurrentUser() user: AuthUser, @Param('id', new ZodPipe(idParamSchema)) id: string): Promise<void> {
    await this.chat.deleteSession(user.id, id);
  }

  /** Talk-to-Log: "cramps 7/10, bahut thakaan" → a structured log (draft, or saved with commit=true). */
  @Post('parse-log')
  @HttpCode(200)
  parseLog(@CurrentUser() user: AuthUser, @Body(new ZodPipe(parseLogRequestSchema)) body: ParseLogRequest) {
    return this.assist.parseLog(user.id, body.text, body);
  }

  @Post('transcribe')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: MAX_AUDIO_BYTES } }))
  async transcribe(@UploadedFile() file: Express.Multer.File | undefined, @Query(new ZodPipe(transcribeQuery)) query: { language?: string }) {
    if (!file) throw new BadRequestException({ code: 'AUDIO_REQUIRED', message: 'Attach an audio file in the "audio" field.' });
    // Phones don't always label recordings with an audio MIME type, so the extension counts too.
    if (!/^(audio|video)\//.test(file.mimetype) && !AUDIO_EXTENSION.test(file.originalname ?? '')) {
      throw new BadRequestException({ code: 'UNSUPPORTED_AUDIO', message: 'Please upload an audio recording.' });
    }
    return this.assist.transcribe(file.buffer, file.originalname || 'voice-note.webm', query.language);
  }

  @Post('myth-check')
  @HttpCode(200)
  mythCheck(@Body(new ZodPipe(mythCheckRequestSchema)) body: MythCheckRequest) {
    return this.assist.checkMyth(body.claim);
  }
}
