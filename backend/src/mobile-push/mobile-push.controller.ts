import { Controller, Post, Get, Body, Headers } from '@nestjs/common';
import { MobilePushService, PlatformType } from './mobile-push.service';

@Controller('mobile-push')
export class MobilePushController {
  constructor(private readonly pushService: MobilePushService) {}

  @Post('register-device')
  async registerDevice(
    @Headers('x-workspace-id') workspaceId: string,
    @Body() body: { userId: string; deviceToken: string; platform: PlatformType; appVersion?: string },
  ) {
    const registration = await this.pushService.registerDeviceToken(
      workspaceId || 'ws_default',
      body.userId,
      body.deviceToken,
      body.platform,
      body.appVersion,
    );
    return { success: true, registration };
  }

  @Get('active-devices')
  async getActiveDevices(@Headers('x-user-id') userId: string) {
    const devices = await this.pushService.getUserDevices(userId || 'user_1');
    return { success: true, devices };
  }

  @Post('send-test-push')
  async sendTestPush(
    @Headers('x-workspace-id') workspaceId: string,
    @Body()
    body: {
      recipientUserId: string;
      title: string;
      bodyText: string;
      channelId: string;
      channelName: string;
      threadId?: string;
      senderName: string;
    },
  ) {
    const result = await this.pushService.sendPushNotification(workspaceId || 'ws_default', body.recipientUserId, {
      title: body.title,
      body: body.bodyText,
      channelId: body.channelId,
      channelName: body.channelName,
      threadId: body.threadId,
      senderName: body.senderName,
    });
    return { success: true, result };
  }
}
