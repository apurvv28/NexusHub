import { Injectable, Logger } from '@nestjs/common';
import { HuddleService } from './huddle.service';
import { CaptionEvent } from './interfaces/huddle.interface';

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  constructor(private readonly huddleService: HuddleService) {}

  /**
   * Processes incoming real-time audio chunk and converts to live speech caption event
   */
  processAudioChunk(
    huddleId: string,
    workspaceId: string,
    channelId: string,
    speakerUserId: string,
    speakerName: string,
    text: string,
    isFinal: boolean = true,
  ): CaptionEvent {
    this.logger.log(`[TranscriptionService] Live caption [${speakerName}]: ${text}`);

    const captionEvent: CaptionEvent = {
      huddleId,
      workspaceId,
      channelId,
      speakerUserId,
      speakerName,
      text,
      timestamp: new Date(),
      isFinal,
    };

    // If final sentence chunk, append to huddle transcript log
    if (isFinal) {
      this.huddleService.appendTranscript(huddleId, speakerUserId, speakerName, text);
    }

    return captionEvent;
  }

  /**
   * Helper to format transcript log into readable plain text script for LLM input
   */
  formatTranscriptForLLM(huddleId: string): string {
    const session = this.huddleService.getHuddleById(huddleId);
    if (!session || session.transcriptLog.length === 0) {
      return 'No audio dialogue was recorded during this huddle.';
    }

    return session.transcriptLog
      .map((entry) => `[${entry.speakerName}]: ${entry.text}`)
      .join('\n');
  }
}
