import {
  BadRequestException,
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
  type PipeTransform,
} from '@nestjs/common';
import type { Request } from 'express';
import type { z } from 'zod';

export interface AuthUser {
  id: string;
  isGuest: boolean;
}

export type AuthedRequest = Request & { user?: AuthUser };

/** Validates and transforms input with a shared zod schema. */
export class ZodPipe<T extends z.ZodType> implements PipeTransform<unknown, z.output<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Some fields are missing or invalid.',
        details: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    return result.data;
  }
}

export const IS_PUBLIC = 'isPublic';
/** Opt a route out of the global JWT guard. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
  if (!user) throw new Error('CurrentUser used on a route without authentication');
  return user;
});

export function clientIp(req: Request): string | undefined {
  return req.ip ?? req.socket.remoteAddress ?? undefined;
}
