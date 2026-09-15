import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { HuddleSession, HuddleParticipant, HuddleRecapResult } from './interfaces/huddle.interface';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class HuddleService {
  private readonly logger = new Logger(HuddleService.name);
  private activeHuddles = new Map<string, HuddleSession>(); // huddleId -> HuddleSession

  constructor(private readonly dbService?: DatabaseService) {}

  /**
   * Starts a new WebRTC huddle in a channel
   */
  async startHuddle(
    workspaceId: string,
    channelId: string,
    hostUserId: string,
    title?: string,
  ): Promise<HuddleSession> {
    // Check if there is already an active huddle in this channel
    const existing = Array.from(this.activeHuddles.values()).find(
      (h) => h.workspaceId === workspaceId && h.channelId === channelId && h.status === 'active',
    );

    if (existing) {
      this.logger.log(`[HuddleService] Returning existing active huddle ${existing.id} for channel ${channelId}`);
      return existing;
    }

    const huddleId = `huddle_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const session: HuddleSession = {
      id: huddleId,
      workspaceId,
      channelId,
      hostUserId,
      title: title || 'Channel Huddle',
      status: 'active',
      startedAt: new Date(),
      participants: new Map(),
      transcriptLog: [],
    };

    this.activeHuddles.set(huddleId, session);
    this.logger.log(`[HuddleService] Created huddle ${huddleId} in workspace ${workspaceId} channel ${channelId}`);

    // Persist to Postgres if dbService is present
    if (this.dbService) {
      try {
        await this.dbService.query(
          `INSERT INTO huddles (id, workspace_id, channel_id, host_user_id, title, status, started_at)
           VALUES ($1, $2, $3, $4, $5, 'active', NOW())
           ON CONFLICT (id) DO NOTHING`,
          [huddleId, workspaceId, channelId, hostUserId, session.title],
        );
      } catch (err: any) {
        // Non-blocking fallback if huddles table is missing in mock DBs
        this.logger.warn(`[HuddleService] Postgres DB insert skipped: ${err.message}`);
      }
    }

    return session;
  }

  /**
   * Join user to active huddle
   */
  async joinHuddle(
    huddleId: string,
    workspaceId: string,
    userId: string,
    userName: string,
    socketId: string,
  ): Promise<HuddleSession> {
    const session = this.activeHuddles.get(huddleId);
    if (!session || session.status !== 'active') {
      throw new NotFoundException(`Active huddle ${huddleId} not found.`);
    }

    if (session.workspaceId !== workspaceId) {
      throw new UnauthorizedException(`Tenant isolation violation: Huddle belongs to different workspace.`);
    }

    const participant: HuddleParticipant = {
      userId,
      userName,
      socketId,
      joinedAt: new Date(),
      isMuted: false,
      isVideoOn: true,
      isScreenSharing: false,
    };

    session.participants.set(userId, participant);
    this.logger.log(`[HuddleService] User ${userId} (${userName}) joined huddle ${huddleId}`);
    return session;
  }

  /**
   * Leave user from huddle
   */
  async leaveHuddle(
    huddleId: string,
    workspaceId: string,
    userId: string,
  ): Promise<{ session: HuddleSession; isRoomEmpty: boolean }> {
    const session = this.activeHuddles.get(huddleId);
    if (!session) {
      throw new NotFoundException(`Huddle ${huddleId} not found.`);
    }

    if (session.workspaceId !== workspaceId) {
      throw new UnauthorizedException(`Workspace mismatch.`);
    }

    session.participants.delete(userId);
    this.logger.log(`[HuddleService] User ${userId} left huddle ${huddleId}`);

    const isRoomEmpty = session.participants.size === 0;
    if (isRoomEmpty) {
      session.status = 'ended';
      session.endedAt = new Date();
    }

    return { session, isRoomEmpty };
  }

  /**
   * Update participant media states (mute, video, screen share)
   */
  updateParticipantState(
    huddleId: string,
    userId: string,
    updates: Partial<Pick<HuddleParticipant, 'isMuted' | 'isVideoOn' | 'isScreenSharing'>>,
  ): HuddleParticipant | null {
    const session = this.activeHuddles.get(huddleId);
    if (!session) return null;

    const p = session.participants.get(userId);
    if (!p) return null;

    if (updates.isMuted !== undefined) p.isMuted = updates.isMuted;
    if (updates.isVideoOn !== undefined) p.isVideoOn = updates.isVideoOn;
    if (updates.isScreenSharing !== undefined) p.isScreenSharing = updates.isScreenSharing;

    return p;
  }

  /**
   * Get active huddle for channel
   */
  getActiveHuddle(workspaceId: string, channelId: string): HuddleSession | null {
    const session = Array.from(this.activeHuddles.values()).find(
      (h) => h.workspaceId === workspaceId && h.channelId === channelId && h.status === 'active',
    );
    return session || null;
  }

  /**
   * Get huddle by ID
   */
  getHuddleById(huddleId: string): HuddleSession | null {
    return this.activeHuddles.get(huddleId) || null;
  }

  /**
   * Append a line to the huddle transcript log
   */
  appendTranscript(huddleId: string, speakerUserId: string, speakerName: string, text: string) {
    const session = this.activeHuddles.get(huddleId);
    if (session) {
      session.transcriptLog.push({
        speakerUserId,
        speakerName,
        text,
        timestamp: new Date(),
      });
    }
  }

  /**
   * End huddle session explicitly
   */
  async endHuddle(huddleId: string, workspaceId: string): Promise<HuddleSession> {
    const session = this.activeHuddles.get(huddleId);
    if (!session) {
      throw new NotFoundException(`Huddle ${huddleId} not found.`);
    }

    if (session.workspaceId !== workspaceId) {
      throw new UnauthorizedException(`Workspace mismatch.`);
    }

    session.status = 'ended';
    session.endedAt = new Date();
    this.logger.log(`[HuddleService] Huddle ${huddleId} explicitly ended.`);
    return session;
  }
}
