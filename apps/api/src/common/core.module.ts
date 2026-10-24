import { Global, Module } from '@nestjs/common';
import { ENV, loadEnv } from '../config/env';
import { AuditService } from './audit.service';
import { CryptoService } from './crypto.service';
import { PrismaService } from './prisma.service';

/** App-wide singletons: validated config, database, encryption and audit trail. */
@Global()
@Module({
  providers: [{ provide: ENV, useFactory: () => loadEnv() }, PrismaService, CryptoService, AuditService],
  exports: [ENV, PrismaService, CryptoService, AuditService],
})
export class CoreModule {}
