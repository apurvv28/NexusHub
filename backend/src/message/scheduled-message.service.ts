import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MessageService } from './message.service';

export interface ScheduledMessageItem {
  id: string;
  workspaceId: string;
  channelId: string;
  senderId: string;
  content: string;
  scheduledAt: Date;
  status: 'pending' | 'delivered' | 'canceled';
  createdAt: Date;
}

@Injectable()
export class ScheduledMessageService {
  private readonly logger = new Logger(ScheduledMessageService.name);
  private scheduledStore: Map<string, ScheduledMessageItem> = new Map();

  constructor(
    private readonly dbService?: DatabaseService,
    private readonly messageService?: MessageService,
  ) {}

  /**
   * Schedule a message to be posted at a future timestamp
   */
  async scheduleMessage(
    workspaceId: string,
    senderId: string,
    channelId: string,
    content: string,
    scheduledAt: Date,
  ): Promise<ScheduledMessageItem> {
    if (new Date(scheduledAt).getTime() <= Date.now()) {
      throw new Error('Scheduled time must be in the future.');
    }

    const id = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const item: ScheduledMessageItem = {
      id,
      workspaceId,
      channelId,
      senderId,
      content,
      scheduledAt: new Date(scheduledAt),
      status: 'pending',
      createdAt: new Date(),
    };

    this.scheduledStore.set(id, item);
    this.logger.log(`[ScheduledMessageService] Message ${id} scheduled for workspace ${workspaceId} at ${item.scheduledAt.toISOString()}`);

    // Persist to DB if dbService is present
    if (this.dbService) {
      try {
        await this.dbService.query(
          `INSERT INTO scheduled_messages (id, workspace_id, channel_id, sender_id, content, scheduled_at, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending')
           ON CONFLICT (id) DO NOTHING`,
          [id, workspaceId, channelId, senderId, content, item.scheduledAt],
        );
      } catch (err: any) {
        this.logger.warn(`[ScheduledMessageService] DB insert skipped: ${err.message}`);
      }
    }

    return item;
  }

  /**
   * Get pending scheduled messages for user/workspace
   */
  async getScheduledMessages(workspaceId: string, senderId: string): Promise<ScheduledMessageItem[]> {
    const list = Array.from(this.scheduledStore.values()).filter(
      (m) => m.workspaceId === workspaceId && m.senderId === senderId && m.status === 'pending',
    );
    return list;
  }

  /**
   * Cancel a scheduled message
   */
  async cancelScheduledMessage(workspaceId: string, id: string, userId: string): Promise<boolean> {
    const item = this.scheduledStore.get(id);
    if (!item) {
      throw new NotFoundException(`Scheduled message ${id} not found.`);
    }

    if (item.workspaceId !== workspaceId) {
      throw new ForbiddenException(`Workspace mismatch.`);
    }

    if (item.senderId !== userId) {
      throw new ForbiddenException(`Only the creator can cancel this scheduled message.`);
    }

    item.status = 'canceled';
    this.logger.log(`[ScheduledMessageService] Scheduled message ${id} canceled.`);
    return true;
  }

  /**
   * Execute dispatch of due scheduled messages
   */
  async dispatchDueMessages(): Promise<number> {
    const now = Date.now();
    let dispatchedCount = 0;

    for (const item of this.scheduledStore.values()) {
      if (item.status === 'pending' && new Date(item.scheduledAt).getTime() <= now) {
        item.status = 'delivered';
        dispatchedCount++;

        if (this.messageService) {
          try {
            await this.messageService.createMessage(item.workspaceId, item.senderId, {
              channelId: item.channelId,
              content: item.content,
            });
            this.logger.log(`[ScheduledMessageService] Dispatched scheduled message ${item.id} to channel ${item.channelId}`);
          } catch (err: any) {
            this.logger.error(`[ScheduledMessageService] Dispatch error for ${item.id}: ${err.message}`);
          }
        }
      }
    }

    return dispatchedCount;
  }
}
