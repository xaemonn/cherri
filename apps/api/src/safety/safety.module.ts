import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { SafetyController } from './safety.controller';

@Module({
  controllers: [SafetyController],
  providers: [ContactsService],
})
export class SafetyModule {}
