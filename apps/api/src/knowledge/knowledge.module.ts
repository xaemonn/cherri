import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { KnowledgeService } from './knowledge.service';

@Module({
  controllers: [ContentController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
