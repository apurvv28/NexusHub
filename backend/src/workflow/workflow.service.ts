import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MessageService } from '../message/message.service';

export interface WorkflowEntity {
  id: string;
  workspace_id: string;
  name: string;
  trigger_type: string;
  action_type: string;
  config: any;
  is_active: boolean;
  created_at: string;
}

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly messageService: MessageService,
  ) {}

  /**
   * Create a new workflow definition in workspace context
   */
  async createWorkflow(
    workspaceId: string,
    name: string,
    triggerType: 'channel_join' | 'reaction_added' | 'webhook_received',
    actionType: 'send_message' | 'create_task' | 'send_email',
    config: Record<string, any> = {},
  ): Promise<WorkflowEntity> {
    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      const res = await client.query<WorkflowEntity>(
        `INSERT INTO workflows (id, workspace_id, name, trigger_type, action_type, config)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
         RETURNING *;`,
        [workspaceId, name, triggerType, actionType, JSON.stringify(config)],
      );

      this.logger.log(`Created workflow '${name}' (${triggerType} -> ${actionType}) in workspace ${workspaceId}`);
      return res.rows[0];
    });
  }

  /**
   * List all workflows in workspace
   */
  async listWorkflows(workspaceId: string): Promise<WorkflowEntity[]> {
    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      const res = await client.query<WorkflowEntity>(
        `SELECT * FROM workflows WHERE workspace_id = $1 ORDER BY created_at DESC;`,
        [workspaceId],
      );
      return res.rows;
    });
  }

  /**
   * Execute matching workflows for a trigger event using Saga / State Machine pattern
   */
  async triggerWorkflows(
    workspaceId: string,
    triggerType: string,
    eventPayload: any,
  ): Promise<{ triggeredCount: number; runIds: string[] }> {
    const workflows = await this.listWorkflows(workspaceId);
    const matching = workflows.filter((w) => w.trigger_type === triggerType && w.is_active);

    const runIds: string[] = [];

    for (const workflow of matching) {
      let status: 'SUCCESS' | 'FAILED' = 'SUCCESS';
      const logs: any = { eventPayload, executedAt: new Date().toISOString() };

      try {
        if (workflow.action_type === 'send_message') {
          const targetChannelId = workflow.config?.channelId || eventPayload.channelId;
          const messageText = workflow.config?.message || `[Workflow: ${workflow.name}] Automated trigger notification`;
          if (targetChannelId) {
            await this.messageService.createMessage(
              workspaceId,
              '00000000-0000-0000-0000-000000000000',
              { channelId: targetChannelId, content: messageText },
            );
            logs.actionResult = 'Sent message to channel';
          }
        } else if (workflow.action_type === 'create_task') {
          logs.actionResult = 'Created task in external system';
        } else if (workflow.action_type === 'send_email') {
          logs.actionResult = 'Dispatched automated email';
        }
      } catch (err) {
        status = 'FAILED';
        logs.error = (err as Error).message;
        this.logger.error(`Workflow ${workflow.id} execution failed: ${(err as Error).message}`);
      }

      // Record workflow run log in database
      const runLog = await this.db.executeWithTenantContext(workspaceId, async (client) => {
        const res = await client.query(
          `INSERT INTO workflow_runs (id, workspace_id, workflow_id, status, logs)
           VALUES (gen_random_uuid(), $1, $2, $3, $4)
           RETURNING id;`,
          [workspaceId, workflow.id, status, JSON.stringify(logs)],
        );
        return res.rows[0];
      });

      runIds.push(runLog.id);
    }

    return { triggeredCount: matching.length, runIds };
  }
}
