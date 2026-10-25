import { Inject, Logger, Module, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ENV, type Env } from '../config/env';
import { InsightsModule } from '../insights/insights.module';
import { ReportsModule } from '../reports/reports.module';
import { ConsultController } from './consult.controller';
import { ConsultService } from './consult.service';
import { ensureDemoDoctor } from './demo-doctor';
import { DoctorController } from './doctor.controller';
import { DoctorGuard } from './doctor.guard';

@Module({
  imports: [ReportsModule, InsightsModule],
  controllers: [ConsultController, DoctorController],
  providers: [ConsultService, DoctorGuard],
})
export class ConsultModule implements OnModuleInit {
  private readonly logger = new Logger(ConsultModule.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.env.DEMO_MODE || this.env.NODE_ENV === 'test') return;
    await ensureDemoDoctor(this.prisma).catch((error: unknown) => this.logger.warn(`Demo doctor not created: ${String(error)}`));
  }
}
