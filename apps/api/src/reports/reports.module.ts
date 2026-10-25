import { Module } from '@nestjs/common';
import { InsightsModule } from '../insights/insights.module';
import { ScreeningsModule } from '../screenings/screenings.module';
import { VisitModule } from '../visit/visit.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [InsightsModule, ScreeningsModule, VisitModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
