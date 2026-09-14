import { Injectable, Inject, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NotificationChannel, NotificationPayload } from './channels/notification-channel.interface';

export interface NotificationPreferenceEntity {
  workspace_id: string;
  user_id: string;
  channel_mutes: string[];
  keywords: string[];
  dnd_start?: string;
  dnd_end?: string;
  email_enabled: boolean;
  push_enabled: boolean;
}

export interface NotificationRecord {
  id: string;
  workspace_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  metadata: any;
  is_read: boolean;
  created_at: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly db: DatabaseService,
    @Inject('NOTIFICATION_CHANNELS')
    private readonly notificationChannels: NotificationChannel[],
  ) {}

  /**
   * Fetch notification preferences for a user in a workspace
   */
  async getPreferences(workspaceId: string, userId: string): Promise<NotificationPreferenceEntity> {
    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      const res = await client.query<NotificationPreferenceEntity>(
        `SELECT * FROM notification_preferences WHERE workspace_id = $1 AND user_id = $2;`,
        [workspaceId, userId],
      );

      if (res.rows.length === 0) {
        return {
          workspace_id: workspaceId,
          user_id: userId,
          channel_mutes: [],
          keywords: [],
          email_enabled: true,
          push_enabled: true,
        };
      }

      const pref = res.rows[0];
      return {
        ...pref,
        channel_mutes: typeof pref.channel_mutes === 'string' ? JSON.parse(pref.channel_mutes) : pref.channel_mutes || [],
        keywords: pref.keywords || [],
      };
    });
  }

  /**
   * Save/update user notification preferences
   */
  async updatePreferences(
    workspaceId: string,
    userId: string,
    updates: Partial<NotificationPreferenceEntity>,
  ): Promise<NotificationPreferenceEntity> {
    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      const current = await this.getPreferences(workspaceId, userId);
      const updated = { ...current, ...updates };

      await client.query(
        `INSERT INTO notification_preferences (workspace_id, user_id, channel_mutes, keywords, dnd_start, dnd_end, email_enabled, push_enabled, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
         ON CONFLICT (workspace_id, user_id)
         DO UPDATE SET
           channel_mutes = EXCLUDED.channel_mutes,
           keywords = EXCLUDED.keywords,
           dnd_start = EXCLUDED.dnd_start,
           dnd_end = EXCLUDED.dnd_end,
           email_enabled = EXCLUDED.email_enabled,
           push_enabled = EXCLUDED.push_enabled,
           updated_at = CURRENT_TIMESTAMP;`,
        [
          workspaceId,
          userId,
          JSON.stringify(updated.channel_mutes || []),
          updated.keywords || [],
          updated.dnd_start || null,
          updated.dnd_end || null,
          updated.email_enabled !== undefined ? updated.email_enabled : true,
          updated.push_enabled !== undefined ? updated.push_enabled : true,
        ],
      );

      return updated;
    });
  }

  /**
   * Evaluate whether a notification should be delivered based on mutes and DND schedule
   */
  shouldDeliver(
    prefs: NotificationPreferenceEntity,
    targetChannelId?: string,
    currentTimeString = new Date().toTimeString().slice(0, 5), // 'HH:MM'
  ): { deliver: boolean; reason?: string } {
    if (targetChannelId && prefs.channel_mutes && prefs.channel_mutes.includes(targetChannelId)) {
      return { deliver: false, reason: `Channel ${targetChannelId} is muted by user` };
    }

    if (prefs.dnd_start && prefs.dnd_end) {
      if (prefs.dnd_start <= prefs.dnd_end) {
        if (currentTimeString >= prefs.dnd_start && currentTimeString <= prefs.dnd_end) {
          return { deliver: false, reason: `User is in DND window (${prefs.dnd_start} - ${prefs.dnd_end})` };
        }
      } else {
        // Overnight DND (e.g. 22:00 - 08:00)
        if (currentTimeString >= prefs.dnd_start || currentTimeString <= prefs.dnd_end) {
          return { deliver: false, reason: `User is in overnight DND window (${prefs.dnd_start} - ${prefs.dnd_end})` };
        }
      }
    }

    return { deliver: true };
  }

  /**
   * Core notification dispatch pipeline adhering to Open/Closed Principle (OCP)
   */
  async dispatchNotification(
    workspaceId: string,
    userId: string,
    payload: NotificationPayload,
    targetChannelId?: string,
  ): Promise<{ success: boolean; dispatchedChannels: string[]; suppressedReason?: string }> {
    const prefs = await this.getPreferences(workspaceId, userId);
    const evalResult = this.shouldDeliver(prefs, targetChannelId);

    if (!evalResult.deliver) {
      this.logger.log(`Suppressed notification for user ${userId}: ${evalResult.reason}`);
      return { success: false, dispatchedChannels: [], suppressedReason: evalResult.reason };
    }

    const dispatchedChannels: string[] = [];

    for (const channel of this.notificationChannels) {
      if (channel.name === 'email_ses' && !prefs.email_enabled) continue;
      if (channel.name === 'push' && !prefs.push_enabled) continue;

      const sent = await channel.send(workspaceId, userId, payload);
      if (sent) {
        dispatchedChannels.push(channel.name);
      }
    }

    return {
      success: dispatchedChannels.length > 0,
      dispatchedChannels,
    };
  }

  /**
   * Fetch unread/all notifications for user
   */
  async getUserNotifications(workspaceId: string, userId: string): Promise<NotificationRecord[]> {
    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      const res = await client.query<NotificationRecord>(
        `SELECT * FROM notifications WHERE workspace_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 50;`,
        [workspaceId, userId],
      );
      return res.rows;
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(workspaceId: string, userId: string, notificationId: string) {
    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      await client.query(
        `UPDATE notifications SET is_read = TRUE WHERE workspace_id = $1 AND user_id = $2 AND id = $3;`,
        [workspaceId, userId, notificationId],
      );
      return { success: true };
    });
  }
}
