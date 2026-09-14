import { Injectable, Logger } from '@nestjs/common';

export interface TypingEvent {
  workspaceId: string;
  channelId: string;
  userId: string;
  username: string;
  isTyping: boolean;
}

@Injectable()
export class TypingIndicatorService {
  private readonly logger = new Logger(TypingIndicatorService.name);

  /**
   * Process typing indicator event payload
   */
  processTypingEvent(event: TypingEvent): { roomName: string; payload: TypingEvent } {
    const roomName = `workspace_${event.workspaceId}:channel_${event.channelId}`;
    this.logger.debug(`User ${event.userId} typing in room ${roomName}: ${event.isTyping}`);
    return {
      roomName,
      payload: event,
    };
  }
}
