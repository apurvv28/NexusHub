import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export type RSVPStatus = 'yes' | 'no' | 'maybe';

export interface CalendarEventItem {
  id: string;
  workspaceId: string;
  channelId: string;
  creatorUserId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  externalProvider?: 'google' | 'outlook' | 'native';
  rsvps: Map<string, RSVPStatus>; // userId -> RSVPStatus
  createdAt: Date;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  private eventsStore: Map<string, CalendarEventItem> = new Map();

  constructor(private readonly dbService?: DatabaseService) {}

  /**
   * Create a new calendar event in a channel
   */
  async createEvent(
    workspaceId: string,
    channelId: string,
    creatorUserId: string,
    title: string,
    startTime: Date,
    endTime: Date,
    description?: string,
    location?: string,
    externalProvider: 'google' | 'outlook' | 'native' = 'native',
  ): Promise<CalendarEventItem> {
    const id = `cal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const eventItem: CalendarEventItem = {
      id,
      workspaceId,
      channelId,
      creatorUserId,
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      location,
      externalProvider,
      rsvps: new Map(),
      createdAt: new Date(),
    };

    // Auto RSVP creator as 'yes'
    eventItem.rsvps.set(creatorUserId, 'yes');

    this.eventsStore.set(id, eventItem);
    this.logger.log(`[CalendarService] Created event ${id} "${title}" in workspace ${workspaceId} channel ${channelId}`);

    // Persist to DB if dbService present
    if (this.dbService) {
      try {
        await this.dbService.query(
          `INSERT INTO calendar_events (id, workspace_id, channel_id, creator_id, title, description, start_time, end_time, location, external_provider)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO NOTHING`,
          [id, workspaceId, channelId, creatorUserId, title, description, startTime, endTime, location, externalProvider],
        );
      } catch (err: any) {
        this.logger.warn(`[CalendarService] DB insert skipped: ${err.message}`);
      }
    }

    return eventItem;
  }

  /**
   * Record RSVP response for a user on a calendar event
   */
  async rsvpEvent(
    workspaceId: string,
    eventId: string,
    userId: string,
    status: RSVPStatus,
  ): Promise<CalendarEventItem> {
    const event = this.eventsStore.get(eventId);
    if (!event) {
      throw new NotFoundException(`Calendar event ${eventId} not found.`);
    }

    if (event.workspaceId !== workspaceId) {
      throw new ForbiddenException(`Workspace mismatch.`);
    }

    event.rsvps.set(userId, status);
    this.logger.log(`[CalendarService] User ${userId} updated RSVP to '${status}' for event ${eventId}`);
    return event;
  }

  /**
   * Get events for a channel
   */
  async getChannelEvents(workspaceId: string, channelId: string): Promise<CalendarEventItem[]> {
    return Array.from(this.eventsStore.values()).filter(
      (e) => e.workspaceId === workspaceId && e.channelId === channelId,
    );
  }

  /**
   * Get event by ID
   */
  getEventById(eventId: string): CalendarEventItem | null {
    return this.eventsStore.get(eventId) || null;
  }
}
