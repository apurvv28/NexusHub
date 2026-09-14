import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationPayload } from './notification-channel.interface';

@Injectable()
export class EmailSESNotificationChannel implements NotificationChannel {
  readonly name = 'email_ses';
  private readonly logger = new Logger(EmailSESNotificationChannel.name);

  async send(workspaceId: string, userId: string, payload: NotificationPayload): Promise<boolean> {
    // AWS SES / Dev email transport simulator
    this.logger.log(
      `[AWS SES Transport] Sending email notification to user ${userId} (Workspace ${workspaceId}): "${payload.title}"`,
    );
    return true;
  }
}
