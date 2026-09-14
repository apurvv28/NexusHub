import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseInterceptors,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { TenantInterceptor } from '../tenant/tenant.interceptor';

@Controller('api/v1/messages')
@UseInterceptors(TenantInterceptor)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  async createMessage(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') senderId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messageService.createMessage(workspaceId, senderId || '00000000-0000-0000-0000-000000000000', dto);
  }

  @Put(':messageId')
  async editMessage(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
    @Param('messageId') messageId: string,
    @Body('content') content: string,
  ) {
    return this.messageService.editMessage(workspaceId, userId || '00000000-0000-0000-0000-000000000000', messageId, content);
  }

  @Delete(':messageId')
  async deleteMessage(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messageService.deleteMessage(workspaceId, userId || '00000000-0000-0000-0000-000000000000', messageId);
  }

  @Get('channel/:channelId')
  async getChannelMessages(
    @Headers('x-workspace-id') workspaceId: string,
    @Param('channelId') channelId: string,
    @Query('limit') limit?: number,
    @Query('before') before?: string,
  ) {
    return this.messageService.getChannelMessages(workspaceId, channelId, limit ? Number(limit) : 50, before);
  }

  @Get('thread/:rootMessageId')
  async getThreadReplies(
    @Headers('x-workspace-id') workspaceId: string,
    @Param('rootMessageId') rootMessageId: string,
  ) {
    return this.messageService.getThreadReplies(workspaceId, rootMessageId);
  }

  @Post('reaction')
  async addReaction(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: AddReactionDto,
  ) {
    return this.messageService.addReaction(workspaceId, userId || '00000000-0000-0000-0000-000000000000', dto);
  }

  @Delete('reaction')
  async removeReaction(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
    @Query('messageId') messageId: string,
    @Query('emojiCode') emojiCode: string,
  ) {
    return this.messageService.removeReaction(
      workspaceId,
      userId || '00000000-0000-0000-0000-000000000000',
      messageId,
      emojiCode,
    );
  }

  @Get('search')
  async searchMessages(
    @Headers('x-workspace-id') workspaceId: string,
    @Query('q') query: string,
    @Query('channelId') channelId?: string,
    @Query('senderId') senderId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.messageService.searchMessages(
      workspaceId,
      query || '',
      channelId,
      senderId,
      limit ? Number(limit) : 20,
    );
  }
}
