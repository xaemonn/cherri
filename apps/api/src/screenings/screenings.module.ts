import { Module } from '@nestjs/common';
import { InsightsModule } from '../insights/insights.module';
import { TrackingModule } from '../tracking/tracking.module';
import { MindController } from './mind.controller';
import { MindService } from './mind.service';
import { ScreeningsController } from './screenings.controller';
import { ScreeningsService } from './screenings.service';

@Module({
  imports: [TrackingModule, InsightsModule],
  controllers: [ScreeningsController, MindController],
  providers: [ScreeningsService, MindService],
  exports: [ScreeningsService, MindService],
})
export class ScreeningsModule {}
