import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { InAppNotificationChannel } from './channels/in-app-notification.channel';
import { EmailSESNotificationChannel } from './channels/email-ses-notification.channel';
import { PushNotificationChannel } from './channels/push-notification.channel';

@Module({
  controllers: [NotificationController],
  providers: [
    InAppNotificationChannel,
    EmailSESNotificationChannel,
    PushNotificationChannel,
    {
      provide: 'NOTIFICATION_CHANNELS',
      useFactory: (inApp: InAppNotificationChannel, email: EmailSESNotificationChannel, push: PushNotificationChannel) => [
        inApp,
        email,
        push,
      ],
      inject: [InAppNotificationChannel, EmailSESNotificationChannel, PushNotificationChannel],
    },
    NotificationService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
