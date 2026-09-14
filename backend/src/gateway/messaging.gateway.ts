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
import { MessageService } from '../message/message.service';
import { CreateMessageDto } from '../message/dto/create-message.dto';
import { AddReactionDto } from '../message/dto/add-reaction.dto';
import { PresenceService, UserStatus } from '../presence/presence.service';
import { TypingIndicatorService, TypingEvent } from '../presence/typing.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/realtime',
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagingGateway.name);

  constructor(
    private readonly messageService: MessageService,
    private readonly presenceService: PresenceService,
    private readonly typingIndicatorService: TypingIndicatorService,
  ) {}

  handleConnection(client: Socket) {
    const workspaceId = client.handshake.query.workspaceId || client.handshake.headers['x-workspace-id'];
    this.logger.log(`Client connected: ${client.id} (Workspace: ${workspaceId || 'unassigned'})`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Subscribe client to a specific channel room scoped by tenant
   */
  @SubscribeMessage('joinChannel')
  handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { workspaceId: string; channelId: string },
  ) {
    const roomName = `workspace_${payload.workspaceId}:channel_${payload.channelId}`;
    client.join(roomName);
    this.logger.log(`Client ${client.id} joined room ${roomName}`);
    return { status: 'joined', room: roomName };
  }

  /**
   * Handle real-time message send & fan-out
   */
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { workspaceId: string; senderId: string; dto: CreateMessageDto },
  ) {
    const message = await this.messageService.createMessage(
      payload.workspaceId,
      payload.senderId,
      payload.dto,
    );

    const roomName = `workspace_${payload.workspaceId}:channel_${payload.dto.channelId}`;
    this.server.to(roomName).emit('message.sent', message);

    return message;
  }

  /**
   * Handle real-time emoji reaction fan-out
   */
  @SubscribeMessage('addReaction')
  async handleAddReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { workspaceId: string; channelId: string; userId: string; dto: AddReactionDto },
  ) {
    const reaction = await this.messageService.addReaction(
      payload.workspaceId,
      payload.userId,
      payload.dto,
    );

    const roomName = `workspace_${payload.workspaceId}:channel_${payload.channelId}`;
    this.server.to(roomName).emit('reaction.updated', reaction);

    return reaction;
  }

  /**
   * Handle ephemeral typing indicators
   */
  @SubscribeMessage('user.typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TypingEvent,
  ) {
    const { roomName, payload: formattedPayload } = this.typingIndicatorService.processTypingEvent(payload);
    client.to(roomName).emit('user.typing', formattedPayload);
    return { status: 'broadcasted' };
  }

  /**
   * Handle user presence heartbeat (5s TTL refresh)
   */
  @SubscribeMessage('user.presence_heartbeat')
  async handlePresenceHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { workspaceId: string; userId: string; status?: UserStatus },
  ) {
    await this.presenceService.setHeartbeat(
      payload.workspaceId,
      payload.userId,
      payload.status || 'online',
    );
    return { status: 'heartbeat_received' };
  }
}
