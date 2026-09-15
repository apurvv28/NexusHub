import { Controller, Post, Get, Delete, Body, Param, Headers, UseGuards } from '@nestjs/common';
import { ScheduledMessageService } from './scheduled-message.service';

@Controller('messages/scheduled')
export class ScheduledMessageController {
  constructor(private readonly scheduledService: ScheduledMessageService) {}

  @Post()
  async scheduleMessage(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { channelId: string; content: string; scheduledAt: string },
  ) {
    const scheduled = await this.scheduledService.scheduleMessage(
      workspaceId || 'ws_default',
      userId || 'user_default',
      body.channelId,
      body.content,
      new Date(body.scheduledAt),
    );
    return { success: true, scheduledMessage: scheduled };
  }

  @Get()
  async getScheduled(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
  ) {
    const list = await this.scheduledService.getScheduledMessages(
      workspaceId || 'ws_default',
      userId || 'user_default',
    );
    return { success: true, scheduledMessages: list };
  }

  @Delete(':id')
  async cancelScheduled(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
  ) {
    const success = await this.scheduledService.cancelScheduledMessage(
      workspaceId || 'ws_default',
      id,
      userId || 'user_default',
    );
    return { success };
  }
}
