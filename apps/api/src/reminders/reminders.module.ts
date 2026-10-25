import { Module } from '@nestjs/common';
import { TrackingModule } from '../tracking/tracking.module';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';

@Module({
  imports: [TrackingModule],
  controllers: [RemindersController],
  providers: [RemindersService],
})
export class RemindersModule {}
