import { Inject, Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { ENV, type Env } from '../config/env';

/** Logs method, path, status and timing. Bodies and query strings are never logged: they hold health data. */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  constructor(@Inject(ENV) private readonly env: Env) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (this.env.NODE_ENV === 'test') return next();
    const started = performance.now();
    res.on('finish', () => {
      const path = req.originalUrl.split('?')[0];
      const ms = Math.round(performance.now() - started);
      this.logger.log(`${req.method} ${path} ${res.statusCode} ${ms}ms`);
    });
    next();
  }
}
