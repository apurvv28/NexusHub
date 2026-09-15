import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { HuddleService } from './huddle.service';
import { TranscriptionService } from './transcription.service';
import { HuddleRecapService } from './huddle-recap.service';
import { WebRTCSignalingPayload } from './interfaces/huddle.interface';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
export class HuddleGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(HuddleGateway.name);

  constructor(
    private readonly huddleService: HuddleService,
    private readonly transcriptionService: TranscriptionService,
    private readonly recapService: HuddleRecapService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`[HuddleGateway] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[HuddleGateway] Client disconnected: ${client.id}`);
  }

  /**
   * Start a WebRTC huddle in a channel
   */
  @SubscribeMessage('huddle:start')
  async handleStartHuddle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { workspaceId: string; channelId: string; userId: string; title?: string },
  ) {
    const session = await this.huddleService.startHuddle(
      payload.workspaceId,
      payload.channelId,
      payload.userId,
      payload.title,
    );

    const channelRoom = `workspace_${payload.workspaceId}:channel_${payload.channelId}`;
    this.server.to(channelRoom).emit('huddle:created', {
      huddleId: session.id,
      channelId: session.channelId,
      hostUserId: session.hostUserId,
      title: session.title,
    });

    return { status: 'success', session };
  }

  /**
   * Join an active WebRTC huddle room
   */
  @SubscribeMessage('huddle:join')
  async handleJoinHuddle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { huddleId: string; workspaceId: string; userId: string; userName: string },
  ) {
    const session = await this.huddleService.joinHuddle(
      payload.huddleId,
      payload.workspaceId,
      payload.userId,
      payload.userName,
      client.id,
    );

    const roomName = `huddle_${payload.huddleId}`;
    client.join(roomName);

    // Notify room participants of new peer joined
    client.to(roomName).emit('huddle:peer-joined', {
      huddleId: payload.huddleId,
      userId: payload.userId,
      userName: payload.userName,
      socketId: client.id,
    });

    const participantsArray = Array.from(session.participants.values());
    return { status: 'joined', huddleId: payload.huddleId, participants: participantsArray };
  }

  /**
   * WebRTC Signaling: SDP Offer relay
   */
  @SubscribeMessage('huddle:offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WebRTCSignalingPayload,
  ) {
    const roomName = `huddle_${payload.huddleId}`;
    if (payload.targetUserId) {
      client.to(roomName).emit('huddle:offer', payload);
    } else {
      client.to(roomName).emit('huddle:offer', payload);
    }
    return { status: 'relayed' };
  }

  /**
   * WebRTC Signaling: SDP Answer relay
   */
  @SubscribeMessage('huddle:answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WebRTCSignalingPayload,
  ) {
    const roomName = `huddle_${payload.huddleId}`;
    client.to(roomName).emit('huddle:answer', payload);
    return { status: 'relayed' };
  }

  /**
   * WebRTC Signaling: ICE Candidate relay
   */
  @SubscribeMessage('huddle:ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WebRTCSignalingPayload,
  ) {
    const roomName = `huddle_${payload.huddleId}`;
    client.to(roomName).emit('huddle:ice-candidate', payload);
    return { status: 'relayed' };
  }

  /**
   * Toggle participant audio mute, video, or screen sharing state
   */
  @SubscribeMessage('huddle:toggle-media')
  handleToggleMedia(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      huddleId: string;
      userId: string;
      isMuted?: boolean;
      isVideoOn?: boolean;
      isScreenSharing?: boolean;
    },
  ) {
    const updatedP = this.huddleService.updateParticipantState(payload.huddleId, payload.userId, {
      isMuted: payload.isMuted,
      isVideoOn: payload.isVideoOn,
      isScreenSharing: payload.isScreenSharing,
    });

    const roomName = `huddle_${payload.huddleId}`;
    this.server.to(roomName).emit('huddle:media-updated', {
      huddleId: payload.huddleId,
      userId: payload.userId,
      isMuted: updatedP?.isMuted,
      isVideoOn: updatedP?.isVideoOn,
      isScreenSharing: updatedP?.isScreenSharing,
    });

    return { status: 'updated', participant: updatedP };
  }

  /**
   * Stream live audio chunk -> generate subtitle caption & broadcast over WS
   */
  @SubscribeMessage('huddle:audio-chunk')
  handleAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      huddleId: string;
      workspaceId: string;
      channelId: string;
      speakerUserId: string;
      speakerName: string;
      text: string;
      isFinal?: boolean;
    },
  ) {
    const captionEvent = this.transcriptionService.processAudioChunk(
      payload.huddleId,
      payload.workspaceId,
      payload.channelId,
      payload.speakerUserId,
      payload.speakerName,
      payload.text,
      payload.isFinal ?? true,
    );

    const roomName = `huddle_${payload.huddleId}`;
    this.server.to(roomName).emit('huddle:caption', captionEvent);

    return { status: 'caption_broadcasted', captionEvent };
  }

  /**
   * Participant leaves huddle session
   */
  @SubscribeMessage('huddle:leave')
  async handleLeaveHuddle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { huddleId: string; workspaceId: string; userId: string },
  ) {
    const roomName = `huddle_${payload.huddleId}`;
    client.leave(roomName);

    const { session, isRoomEmpty } = await this.huddleService.leaveHuddle(
      payload.huddleId,
      payload.workspaceId,
      payload.userId,
    );

    this.server.to(roomName).emit('huddle:peer-left', {
      huddleId: payload.huddleId,
      userId: payload.userId,
    });

    if (isRoomEmpty) {
      this.logger.log(`[HuddleGateway] Room ${payload.huddleId} empty. Triggering automated post-huddle recap...`);
      const recap = await this.recapService.generateAndPostRecap(payload.huddleId, payload.workspaceId);
      this.server.to(roomName).emit('huddle:ended', { huddleId: payload.huddleId, recap });
    }

    return { status: 'left', isRoomEmpty };
  }

  /**
   * Host ends huddle session
   */
  @SubscribeMessage('huddle:end')
  async handleEndHuddle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { huddleId: string; workspaceId: string; userId: string },
  ) {
    const session = await this.huddleService.endHuddle(payload.huddleId, payload.workspaceId);
    const roomName = `huddle_${payload.huddleId}`;

    const recap = await this.recapService.generateAndPostRecap(payload.huddleId, payload.workspaceId);
    this.server.to(roomName).emit('huddle:ended', { huddleId: payload.huddleId, recap });

    return { status: 'ended', recap };
  }
}
