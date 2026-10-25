import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { CareModule } from './care/care.module';
import { CoreModule } from './common/core.module';
import { AllExceptionsFilter } from './common/exception.filter';
import { RequestLoggerMiddleware } from './common/request-logger.middleware';
import { ENV, type Env } from './config/env';
import { DemoModule } from './demo/demo.module';
import { HealthController } from './health.controller';
import { InsightsModule } from './insights/insights.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { LabsModule } from './labs/labs.module';
import { ReportsModule } from './reports/reports.module';
import { SafetyModule } from './safety/safety.module';
import { ScreeningsModule } from './screenings/screenings.module';
import { TrackingModule } from './tracking/tracking.module';
import { UsersModule } from './users/users.module';
import { VisitModule } from './visit/visit.module';

@Module({
  imports: [
    CoreModule,
    ThrottlerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        throttlers: [{ ttl: 60_000, limit: 120 }],
        skipIf: () => env.NODE_ENV === 'test',
      }),
    }),
    AuthModule,
    UsersModule,
    TrackingModule,
    InsightsModule,
    ScreeningsModule,
    KnowledgeModule,
    AiModule,
    LabsModule,
    ReportsModule,
    VisitModule,
    SafetyModule,
    CareModule,
    DemoModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('{*splat}');
  }
}
