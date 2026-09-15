import { Controller, Post, Get, Body, Param, Headers } from '@nestjs/common';
import { CalendarService, RSVPStatus } from './calendar.service';

@Controller('calendar/events')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post()
  async createEvent(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: {
      channelId: string;
      title: string;
      startTime: string;
      endTime: string;
      description?: string;
      location?: string;
      externalProvider?: 'google' | 'outlook' | 'native';
    },
  ) {
    const eventItem = await this.calendarService.createEvent(
      workspaceId || 'ws_default',
      body.channelId,
      userId || 'user_default',
      body.title,
      new Date(body.startTime),
      new Date(body.endTime),
      body.description,
      body.location,
      body.externalProvider || 'native',
    );
    return { success: true, event: eventItem };
  }

  @Get('channel/:channelId')
  async getChannelEvents(
    @Headers('x-workspace-id') workspaceId: string,
    @Param('channelId') channelId: string,
  ) {
    const events = await this.calendarService.getChannelEvents(workspaceId || 'ws_default', channelId);
    return { success: true, events };
  }

  @Post(':id/rsvp')
  async rsvp(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
    @Body() body: { status: RSVPStatus },
  ) {
    const updatedEvent = await this.calendarService.rsvpEvent(
      workspaceId || 'ws_default',
      id,
      userId || 'user_default',
      body.status,
    );
    return { success: true, event: updatedEvent };
  }
}
