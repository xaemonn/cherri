import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { MedicationsService } from './medications.service';
import { StoryService } from './story.service';
import { VisitController } from './visit.controller';

@Module({
  imports: [AiModule],
  controllers: [VisitController],
  providers: [MedicationsService, StoryService],
  exports: [MedicationsService, StoryService],
})
export class VisitModule {}
