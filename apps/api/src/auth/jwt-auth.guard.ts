import { Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC, type AuthedRequest } from '../common/http';

interface AccessPayload {
  sub: string;
  guest: boolean;
}

/** Global guard: every route needs a valid access token unless marked @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Please sign in to continue.' });
    }
    try {
      const payload = await this.jwt.verifyAsync<AccessPayload>(token);
      request.user = { id: payload.sub, isGuest: payload.guest };
      return true;
    } catch {
      throw new UnauthorizedException({ code: 'TOKEN_INVALID', message: 'Your session has expired.' });
    }
  }
}
