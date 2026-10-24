import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { CryptoService } from './crypto.service';
import { PrismaService } from './prisma.service';

export type AuditAction =
  | 'REGISTER'
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'GUEST_CREATED'
  | 'GUEST_UPGRADED'
  | 'REFRESH_REUSE_DETECTED'
  | 'DATA_EXPORTED'
  | 'ACCOUNT_DELETED'
  | 'SHARE_CREATED'
  | 'SHARE_VIEWED'
  | 'SHARE_REVOKED';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  /** Never throws: an audit failure must not break the user's request. */
  async record(action: AuditAction, options: { userId?: string | null; ip?: string; meta?: Prisma.InputJsonValue } = {}) {
    try {
      await this.prisma.auditLog.create({
        data: { action, userId: options.userId ?? null, ipHash: this.crypto.hashIp(options.ip), meta: options.meta },
      });
    } catch (error) {
      this.logger.error(`Failed to write audit log ${action}`, error instanceof Error ? error.stack : String(error));
    }
  }
}
