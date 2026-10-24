import { Module } from '@nestjs/common';
import { ENV, type Env } from '../config/env';
import { InsightsModule } from '../insights/insights.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { TrackingModule } from '../tracking/tracking.module';
import { AiController } from './ai.controller';
import { AssistService } from './assist.service';
import { ChatService } from './chat/chat.service';
import { ChatToolsService } from './chat/tools';
import { LlmGateway } from './llm/llm.gateway';
import { LLM_PROVIDERS } from './llm/llm.types';
import { buildProviders } from './llm/providers';

@Module({
  imports: [TrackingModule, InsightsModule, KnowledgeModule],
  controllers: [AiController],
  providers: [
    { provide: LLM_PROVIDERS, inject: [ENV], useFactory: (env: Env) => buildProviders(env) },
    LlmGateway,
    ChatService,
    ChatToolsService,
    AssistService,
  ],
  exports: [LlmGateway],
})
export class AiModule {}
