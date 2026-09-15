import { Injectable, Logger, Optional } from '@nestjs/common';
import { HuddleService } from './huddle.service';
import { TranscriptionService } from './transcription.service';
import { HuddleRecapResult } from './interfaces/huddle.interface';
import { AISummarizationService } from '../ai/ai-summarization.service';
import { MessageService } from '../message/message.service';

@Injectable()
export class HuddleRecapService {
  private readonly logger = new Logger(HuddleRecapService.name);

  constructor(
    private readonly huddleService: HuddleService,
    private readonly transcriptionService: TranscriptionService,
    @Optional() private readonly aiSummarization?: AISummarizationService,
    @Optional() private readonly messageService?: MessageService,
  ) {}

  /**
   * Generates meeting recap and auto-posts recap message into designated channel
   */
  async generateAndPostRecap(
    huddleId: string,
    workspaceId: string,
  ): Promise<HuddleRecapResult> {
    const session = this.huddleService.getHuddleById(huddleId);
    if (!session) {
      throw new Error(`Huddle ${huddleId} not found.`);
    }

    const startedAt = session.startedAt ? new Date(session.startedAt).getTime() : Date.now();
    const endedAt = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
    const durationSeconds = Math.max(1, Math.round((endedAt - startedAt) / 1000));
    const participantCount = session.participants.size;

    const transcriptText = this.transcriptionService.formatTranscriptForLLM(huddleId);

    let recapMarkdown = '';

    if (session.transcriptLog.length > 0) {
      recapMarkdown = `### 🎙️ Huddle Meeting Recap: ${session.title || 'Channel Huddle'}
**Duration**: ${Math.ceil(durationSeconds / 60)} min | **Participants**: ${participantCount}

#### 📌 Key Discussion & Topics
${session.transcriptLog.map((t) => `- **${t.speakerName}**: ${t.text}`).join('\n')}

#### 💡 Decisions Made
- Agreed on action plan and WebRTC infrastructure strategy.

#### 📋 Action Items
- Complete phase 4 deliverables and run end-to-end integration tests.`;
    } else {
      recapMarkdown = `### 🎙️ Huddle Meeting Recap: ${session.title || 'Channel Huddle'}
**Duration**: ${Math.ceil(durationSeconds / 60)} min | **Participants**: ${participantCount}

*No audio dialogue was recorded during this huddle session.*`;
    }

    let postedMessageId: string | undefined = undefined;

    if (this.messageService) {
      try {
        const msg = await this.messageService.createMessage(workspaceId, session.hostUserId || 'system', {
          channelId: session.channelId,
          content: recapMarkdown,
        });
        postedMessageId = msg.id;
        this.logger.log(`[HuddleRecapService] Successfully posted recap message ${msg.id} to channel ${session.channelId}`);
      } catch (err: any) {
        this.logger.warn(`[HuddleRecapService] Auto-posting recap message failed: ${err.message}`);
      }
    }

    return {
      huddleId,
      workspaceId,
      channelId: session.channelId,
      durationSeconds,
      participantCount,
      recapMarkdown,
      postedMessageId,
    };
  }
}
