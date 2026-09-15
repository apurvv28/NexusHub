import { Module } from '@nestjs/common';
import { HuddleService } from './huddle.service';
import { TranscriptionService } from './transcription.service';
import { HuddleRecapService } from './huddle-recap.service';
import { HuddleGateway } from './huddle.gateway';
import { DatabaseModule } from '../database/database.module';
import { MessageModule } from '../message/message.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [DatabaseModule, MessageModule, AIModule],
  providers: [HuddleService, TranscriptionService, HuddleRecapService, HuddleGateway],
  exports: [HuddleService, TranscriptionService, HuddleRecapService, HuddleGateway],
})
export class HuddleModule {}
