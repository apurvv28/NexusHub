import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationPayload } from './notification-channel.interface';

@Injectable()
export class PushNotificationChannel implements NotificationChannel {
  readonly name = 'push';
  private readonly logger = new Logger(PushNotificationChannel.name);

  async send(workspaceId: string, userId: string, payload: NotificationPayload): Promise<boolean> {
    // Mobile/Web Push notification dispatcher (FCM/APNs format)
    this.logger.log(
      `[Push Notification Dispatcher] Fanning out push message to user ${userId}: "${payload.title}"`,
    );
    return true;
  }
}
