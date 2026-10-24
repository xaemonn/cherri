import { Catch, HttpException, HttpStatus, Logger, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

interface ErrorBody {
  error: { status: number; code: string; message: string; details?: unknown };
}

/** Every error leaves the API in one predictable shape, and internals never leak. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    // Intentional HTTP errors (like a 503 "AI offline") are expected; only log real crashes.
    if (body.error.status === 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }
    // A streaming response (SSE) may already have started; just end it.
    if (response.headersSent) {
      response.end();
      return;
    }
    response.status(body.error.status).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const payload = typeof res === 'string' ? { message: res } : (res as Record<string, unknown>);
      return {
        error: {
          status,
          code: typeof payload.code === 'string' ? payload.code : HttpStatus[status] ?? 'ERROR',
          message: Array.isArray(payload.message) ? payload.message.join(', ') : String(payload.message ?? exception.message),
          ...(payload.details !== undefined && { details: payload.details }),
        },
      };
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') return { error: { status: 409, code: 'CONFLICT', message: 'That already exists.' } };
      if (exception.code === 'P2025') return { error: { status: 404, code: 'NOT_FOUND', message: 'Not found.' } };
    }
    return { error: { status: 500, code: 'INTERNAL_ERROR', message: 'Something went wrong on our side. Please try again.' } };
  }
}
