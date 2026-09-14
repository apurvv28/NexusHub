import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Headers,
  UseInterceptors,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { TenantInterceptor } from '../tenant/tenant.interceptor';
import { NotificationPayload } from './channels/notification-channel.interface';

@Controller('api/v1/notifications')
@UseInterceptors(TenantInterceptor)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getUserNotifications(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.notificationService.getUserNotifications(workspaceId, userId || '00000000-0000-0000-0000-000000000000');
  }

  @Put(':id/read')
  async markAsRead(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationService.markAsRead(workspaceId, userId || '00000000-0000-0000-0000-000000000000', notificationId);
  }

  @Get('preferences')
  async getPreferences(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.notificationService.getPreferences(workspaceId, userId || '00000000-0000-0000-0000-000000000000');
  }

  @Put('preferences')
  async updatePreferences(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
    @Body() updates: any,
  ) {
    return this.notificationService.updatePreferences(
      workspaceId,
      userId || '00000000-0000-0000-0000-000000000000',
      updates,
    );
  }

  @Post('dispatch')
  async dispatchNotification(
    @Headers('x-workspace-id') workspaceId: string,
    @Body('userId') userId: string,
    @Body('payload') payload: NotificationPayload,
    @Body('channelId') channelId?: string,
  ) {
    return this.notificationService.dispatchNotification(workspaceId, userId, payload, channelId);
  }
}
