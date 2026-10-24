import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import type { User } from '@prisma/client';
import type { AuthTokens, GuestInput, LoginInput, RegisterInput, UpgradeGuestInput } from '@cherri/shared';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../common/audit.service';
import { CryptoService } from '../common/crypto.service';
import { PrismaService } from '../common/prisma.service';
import { ENV, type Env } from '../config/env';
import { toPublicUser, type PublicUser } from '../users/user.mapper';

export interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

const invalidRefresh = () => new UnauthorizedException({ code: 'REFRESH_INVALID', message: 'Your session has expired. Please sign in again.' });

@Injectable()
export class AuthService {
  /** Verified against when the email is unknown, so response time doesn't reveal which emails exist. */
  private readonly dummyHash = hash('cherri-timing-equaliser');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async register(input: RegisterInput, meta: RequestMeta): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'An account with this email already exists.' });

    const user = await this.prisma.user.create({
      data: { email: input.email, passwordHash: await hash(input.password), name: input.name },
    });
    await this.audit.record('REGISTER', { userId: user.id, ip: meta.ip });
    return { user: toPublicUser(user), tokens: await this.issueTokens(user, meta) };
  }

  async login(input: LoginInput, meta: RequestMeta): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    let valid = false;
    if (user?.passwordHash) valid = await verify(user.passwordHash, input.password);
    else await verify(await this.dummyHash, input.password);

    if (!user || !valid) {
      await this.audit.record('LOGIN_FAILED', { userId: user?.id, ip: meta.ip });
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' });
    }
    await this.audit.record('LOGIN', { userId: user.id, ip: meta.ip });
    return { user: toPublicUser(user), tokens: await this.issueTokens(user, meta) };
  }

  async createGuest(input: GuestInput, meta: RequestMeta): Promise<AuthResult> {
    const user = await this.prisma.user.create({ data: { isGuest: true, name: input.name } });
    await this.audit.record('GUEST_CREATED', { userId: user.id, ip: meta.ip });
    return { user: toPublicUser(user), tokens: await this.issueTokens(user, meta) };
  }

  /** Turn an anonymous guest into a full account, keeping all their data. */
  async upgradeGuest(userId: string, input: UpgradeGuestInput, meta: RequestMeta): Promise<AuthResult> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.isGuest) throw new BadRequestException({ code: 'NOT_A_GUEST', message: 'This account already has an email.' });
    if (await this.prisma.user.findUnique({ where: { email: input.email } })) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'An account with this email already exists.' });
    }

    const [, upgraded] = await this.prisma.$transaction([
      this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.user.update({
        where: { id: userId },
        data: { email: input.email, passwordHash: await hash(input.password), isGuest: false },
      }),
    ]);
    await this.audit.record('GUEST_UPGRADED', { userId, ip: meta.ip });
    return { user: toPublicUser(upgraded), tokens: await this.issueTokens(upgraded, meta) };
  }

  /**
   * Refresh-token rotation: each token works once. Presenting an already-rotated token
   * means it was stolen or replayed, so the whole token family is revoked.
   */
  async refresh(refreshToken: string, meta: RequestMeta): Promise<AuthResult> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: CryptoService.sha256(refreshToken) },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) throw invalidRefresh();

    const rotated = await this.prisma.session.updateMany({
      where: { id: session.id, rotatedAt: null },
      data: { rotatedAt: new Date() },
    });
    if (rotated.count === 0) {
      await this.prisma.session.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.record('REFRESH_REUSE_DETECTED', { userId: session.userId, ip: meta.ip });
      throw new UnauthorizedException({ code: 'REFRESH_REUSED', message: 'For your safety you have been signed out. Please sign in again.' });
    }

    return { user: toPublicUser(session.user), tokens: await this.issueTokens(session.user, meta, session.familyId) };
  }

  async logout(refreshToken: string): Promise<void> {
    const session = await this.prisma.session.findUnique({ where: { tokenHash: CryptoService.sha256(refreshToken) } });
    if (!session) return;
    await this.prisma.session.updateMany({ where: { familyId: session.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  private async issueTokens(user: User, meta: RequestMeta, familyId: string = randomUUID()): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync({ sub: user.id, guest: user.isGuest }, { expiresIn: this.env.JWT_ACCESS_TTL_SECONDS });
    const refreshToken = CryptoService.randomToken();
    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: CryptoService.sha256(refreshToken),
        familyId,
        expiresAt: new Date(Date.now() + this.env.REFRESH_TTL_DAYS * 86_400_000),
        userAgent: meta.userAgent?.slice(0, 200),
      },
    });
    return { accessToken, refreshToken, expiresIn: this.env.JWT_ACCESS_TTL_SECONDS };
  }
}
