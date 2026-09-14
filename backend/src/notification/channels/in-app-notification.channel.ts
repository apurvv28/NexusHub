import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationPayload } from './notification-channel.interface';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class InAppNotificationChannel implements NotificationChannel {
  readonly name = 'in_app';
  private readonly logger = new Logger(InAppNotificationChannel.name);

  constructor(private readonly db: DatabaseService) {}

  async send(workspaceId: string, userId: string, payload: NotificationPayload): Promise<boolean> {
    try {
      await this.db.executeWithTenantContext(workspaceId, async (client) => {
        await client.query(
          `INSERT INTO notifications (id, workspace_id, user_id, type, title, body, metadata)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6);`,
          [
            workspaceId,
            userId,
            payload.type,
            payload.title,
            payload.body,
            JSON.stringify(payload.metadata || {}),
          ],
        );
      });

      this.logger.log(`Dispatched In-App notification to user ${userId} (Workspace ${workspaceId})`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send In-App notification: ${(err as Error).message}`);
      return false;
    }
  }
}
