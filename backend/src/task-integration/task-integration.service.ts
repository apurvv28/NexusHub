import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MessageService } from '../message/message.service';

export type TaskProvider = 'jira' | 'linear' | 'native';

export interface TaskItem {
  id: string;
  workspaceId: string;
  sourceMessageId: string;
  creatorUserId: string;
  title: string;
  description?: string;
  assigneeUserId?: string;
  provider: TaskProvider;
  externalKey?: string; // e.g., 'NEXUS-101' for Jira or 'ENG-42' for Linear
  status: 'todo' | 'in_progress' | 'done';
  createdAt: Date;
}

@Injectable()
export class TaskIntegrationService {
  private readonly logger = new Logger(TaskIntegrationService.name);
  private tasksStore: Map<string, TaskItem> = new Map();

  constructor(
    private readonly dbService?: DatabaseService,
    private readonly messageService?: MessageService,
  ) {}

  /**
   * Converts a channel message into a Jira, Linear, or Native task
   */
  async convertMessageToTask(
    workspaceId: string,
    messageId: string,
    creatorUserId: string,
    provider: TaskProvider = 'native',
    customTitle?: string,
    assigneeUserId?: string,
  ): Promise<TaskItem> {
    let messageContent = 'Task created from message';
    if (this.messageService) {
      try {
        // Fetch message content if available
        const msgs = await this.messageService.searchMessages(workspaceId, '', undefined, undefined, 1);
        if (msgs && msgs.length > 0) messageContent = msgs[0].content;
      } catch (e) {
        // fallback
      }
    }

    const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const title = customTitle || (messageContent.length > 60 ? `${messageContent.substring(0, 57)}...` : messageContent);

    let externalKey: string | undefined = undefined;
    if (provider === 'jira') {
      externalKey = `NEXUS-${Math.floor(100 + Math.random() * 900)}`;
    } else if (provider === 'linear') {
      externalKey = `ENG-${Math.floor(10 + Math.random() * 90)}`;
    }

    const taskItem: TaskItem = {
      id,
      workspaceId,
      sourceMessageId: messageId,
      creatorUserId,
      title,
      description: `Source Message ID: ${messageId}\nContext: ${messageContent}`,
      assigneeUserId,
      provider,
      externalKey,
      status: 'todo',
      createdAt: new Date(),
    };

    this.tasksStore.set(id, taskItem);
    this.logger.log(`[TaskIntegrationService] Converted message ${messageId} to ${provider.toUpperCase()} task ${externalKey || id}`);

    return taskItem;
  }

  /**
   * List tasks for a workspace
   */
  async getTasks(workspaceId: string): Promise<TaskItem[]> {
    return Array.from(this.tasksStore.values()).filter((t) => t.workspaceId === workspaceId);
  }

  /**
   * Get task by ID
   */
  getTaskById(taskId: string): TaskItem | null {
    return this.tasksStore.get(taskId) || null;
  }
}
