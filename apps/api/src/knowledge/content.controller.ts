import { Controller, Get, Param } from '@nestjs/common';
import { INDIA_CARE_RESOURCES, INDIA_HELPLINES, MYTHS, PHASE_GUIDES, SCREENINGS } from '@cherri/shared';
import { Public } from '../common/http';
import { KnowledgeService } from './knowledge.service';

/** Public educational content: no account needed, so the landing page and Learn hub can use it. */
@Public()
@Controller('content')
export class ContentController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get('articles')
  articles() {
    return this.knowledge.list();
  }

  @Get('articles/:id')
  article(@Param('id') id: string) {
    return this.knowledge.get(id);
  }

  @Get('myths')
  myths() {
    return MYTHS;
  }

  @Get('phases')
  phases() {
    return PHASE_GUIDES;
  }

  @Get('screenings')
  screenings() {
    return Object.values(SCREENINGS);
  }

  @Get('help')
  help() {
    return { helplines: INDIA_HELPLINES, resources: INDIA_CARE_RESOURCES };
  }
}
