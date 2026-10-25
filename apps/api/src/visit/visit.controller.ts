import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  idParamSchema,
  medicationInputSchema,
  medicationUpdateSchema,
  saveStorySchema,
  storyStructureRequestSchema,
  type MedicationInput,
  type MedicationUpdate,
  type SaveStoryInput,
  type StoryStructureRequest,
} from '@cherri/shared';
import { CurrentUser, ZodPipe, type AuthUser } from '../common/http';
import { MedicationsService } from './medications.service';
import { StoryService } from './story.service';

/** Visit prep: her medicines and her symptom story, both feeding the doctor report. */
@Controller()
export class VisitController {
  constructor(
    private readonly medications: MedicationsService,
    private readonly stories: StoryService,
  ) {}

  @Get('medications')
  listMedications(@CurrentUser() user: AuthUser) {
    return this.medications.list(user.id);
  }

  @Post('medications')
  createMedication(@CurrentUser() user: AuthUser, @Body(new ZodPipe(medicationInputSchema)) body: MedicationInput) {
    return this.medications.create(user.id, body);
  }

  @Patch('medications/:id')
  updateMedication(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodPipe(idParamSchema)) id: string,
    @Body(new ZodPipe(medicationUpdateSchema)) body: MedicationUpdate,
  ) {
    return this.medications.update(user.id, id, body);
  }

  @Delete('medications/:id')
  @HttpCode(204)
  async removeMedication(@CurrentUser() user: AuthUser, @Param('id', new ZodPipe(idParamSchema)) id: string): Promise<void> {
    await this.medications.remove(user.id, id);
  }

  @Get('story')
  async story(@CurrentUser() user: AuthUser) {
    return { story: await this.stories.get(user.id) };
  }

  /** Structure free text into a history; nothing is stored until she saves it. */
  @Post('story/structure')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  structureStory(@Body(new ZodPipe(storyStructureRequestSchema)) body: StoryStructureRequest) {
    return this.stories.structure(body.text);
  }

  @Put('story')
  saveStory(@CurrentUser() user: AuthUser, @Body(new ZodPipe(saveStorySchema)) body: SaveStoryInput) {
    return this.stories.save(user.id, body);
  }

  @Delete('story')
  @HttpCode(204)
  async removeStory(@CurrentUser() user: AuthUser): Promise<void> {
    await this.stories.remove(user.id);
  }
}
