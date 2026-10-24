import { Module } from '@nestjs/common';
import { HealthDataService } from './health-data.service';
import { LogsService } from './logs.service';
import { PeriodsService } from './periods.service';
import { TrackingController } from './tracking.controller';

@Module({
  controllers: [TrackingController],
  providers: [HealthDataService, LogsService, PeriodsService],
  exports: [HealthDataService, LogsService, PeriodsService],
})
export class TrackingModule {}
