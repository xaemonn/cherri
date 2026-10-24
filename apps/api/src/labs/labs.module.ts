import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { TrackingModule } from '../tracking/tracking.module';
import { LabExtractorService } from './lab-extractor.service';
import { LabsController } from './labs.controller';
import { LabsService } from './labs.service';

@Module({
  imports: [AiModule, TrackingModule],
  controllers: [LabsController],
  providers: [LabsService, LabExtractorService],
})
export class LabsModule {}
