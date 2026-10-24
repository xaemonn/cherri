import { Module } from '@nestjs/common';
import { TrackingModule } from '../tracking/tracking.module';
import { DemoController } from './demo.controller';

@Module({
  imports: [TrackingModule],
  controllers: [DemoController],
})
export class DemoModule {}
