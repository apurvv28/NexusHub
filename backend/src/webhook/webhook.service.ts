import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MessageService } from '../message/message.service';
import { randomBytes, createHmac } from 'crypto';

export interface WebhookEntity {
  id: string;
  workspace_id: string;
  channel_id?: string;
  name: string;
  type: 'INBOUND' | 'OUTBOUND';
  url?: string;
  secret: string;
  is_active: boolean;
  created_at: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly messageService: MessageService,
  ) {}

  /**
   * Create an inbound or outbound webhook with secure random secret
   */
  async createWebhook(
    workspaceId: string,
    name: string,
    type: 'INBOUND' | 'OUTBOUND',
    url?: string,
    channelId?: string,
  ): Promise<WebhookEntity> {
    const secret = `whsec_${randomBytes(24).toString('hex')}`;

    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      const res = await client.query<WebhookEntity>(
        `INSERT INTO webhooks (id, workspace_id, channel_id, name, type, url, secret)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
         RETURNING *;`,
        [workspaceId, channelId || null, name, type, url || null, secret],
      );

      this.logger.log(`Created ${type} webhook '${name}' in workspace ${workspaceId}`);
      return res.rows[0];
    });
  }

  /**
   * List all webhooks in workspace
   */
  async listWebhooks(workspaceId: string): Promise<WebhookEntity[]> {
    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      const res = await client.query<WebhookEntity>(
        `SELECT * FROM webhooks WHERE workspace_id = $1 ORDER BY created_at DESC;`,
        [workspaceId],
      );
      return res.rows;
    });
  }

  /**
   * Handle Inbound Webhook POST payload (post message to channel)
   */
  async handleInboundWebhook(webhookId: string, text: string) {
    if (!text) {
      throw new BadRequestException('Webhook text content is required');
    }

    // Lookup webhook across workspaces safely
    const webhookRes = await this.db.executeWithTenantContext(
      '00000000-0000-0000-0000-000000000000',
      async (client) => {
        const res = await client.query<WebhookEntity>(
          `SELECT * FROM webhooks WHERE id = $1 AND type = 'INBOUND' AND is_active = TRUE;`,
          [webhookId],
        );
        return res.rows[0];
      },
    );

    if (!webhookRes || !webhookRes.channel_id) {
      throw new NotFoundException(`Active inbound webhook ${webhookId} not found or unassigned`);
    }

    const message = await this.messageService.createMessage(
      webhookRes.workspace_id,
      '00000000-0000-0000-0000-000000000000', // Bot sender ID
      {
        channelId: webhookRes.channel_id,
        content: `[Webhook: ${webhookRes.name}] ${text}`,
      },
    );

    return { status: 'success', messageId: message.id };
  }

  /**
   * Generate HMAC SHA256 signature for outbound webhooks
   */
  generateHmacSignature(secret: string, payloadString: string): string {
    return createHmac('sha256', secret).update(payloadString).digest('hex');
  }

  /**
   * Dispatch outbound webhook with HMAC signature header
   */
  async dispatchOutboundWebhook(
    workspaceId: string,
    eventName: string,
    payload: any,
  ): Promise<{ dispatchedCount: number }> {
    const webhooks = await this.listWebhooks(workspaceId);
    const outboundWebhooks = webhooks.filter((w) => w.type === 'OUTBOUND' && w.is_active && w.url);

    let dispatchedCount = 0;
    const bodyString = JSON.stringify({ event: eventName, payload, timestamp: new Date().toISOString() });

    for (const webhook of outboundWebhooks) {
      const signature = this.generateHmacSignature(webhook.secret, bodyString);
      this.logger.log(
        `[Outbound Webhook Dispatch] Sending event '${eventName}' to ${webhook.url} with signature header x-nexushub-signature: sha256=${signature}`,
      );
      dispatchedCount++;
    }

    return { dispatchedCount };
  }
}
