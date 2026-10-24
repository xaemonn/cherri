import { Module } from '@nestjs/common';
import { TrackingModule } from '../tracking/tracking.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TrackingModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
