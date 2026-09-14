import { Module } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { TypingIndicatorService } from './typing.service';

@Module({
  providers: [PresenceService, TypingIndicatorService],
  exports: [PresenceService, TypingIndicatorService],
})
export class PresenceModule {}
