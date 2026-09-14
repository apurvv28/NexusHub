import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { AddReactionDto } from './dto/add-reaction.dto';

export interface MessageEntity {
  id: string;
  workspace_id: string;
  channel_id: string;
  sender_id: string;
  parent_message_id?: string;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Create a message or threaded reply within strict workspace RLS context
   */
  async createMessage(
    workspaceId: string,
    senderId: string,
    dto: CreateMessageDto,
  ): Promise<MessageEntity> {
    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      const msgRes = await client.query<MessageEntity>(
        `INSERT INTO messages (id, workspace_id, channel_id, sender_id, parent_message_id, content)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
         RETURNING *;`,
        [workspaceId, dto.channelId, senderId, dto.parentMessageId || null, dto.content],
      );

      const message = msgRes.rows[0];

      if (dto.parentMessageId) {
        await client.query(
          `INSERT INTO threads (id, workspace_id, root_message_id, reply_count, last_reply_at)
           VALUES (gen_random_uuid(), $1, $2, 1, CURRENT_TIMESTAMP)
           ON CONFLICT (root_message_id)
           DO UPDATE SET reply_count = threads.reply_count + 1, last_reply_at = CURRENT_TIMESTAMP;`,
          [workspaceId, dto.parentMessageId],
        );
      }

      this.logger.log(`Created message ${message.id} in channel ${dto.channelId} (workspace ${workspaceId})`);
      return message;
    });
  }

  /**
   * Edit a message with immutable audit logging
   */
  async editMessage(
    workspaceId: string,
    userId: string,
    messageId: string,
    newContent: string,
  ): Promise<MessageEntity> {
    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      const existingRes = await client.query<MessageEntity>(
        `SELECT * FROM messages WHERE id = $1 AND workspace_id = $2;`,
        [messageId, workspaceId],
      );

      if (existingRes.rows.length === 0) {
        throw new NotFoundException(`Message ${messageId} not found`);
      }

      const existingMsg = existingRes.rows[0];
      if (existingMsg.sender_id !== userId) {
        throw new ForbiddenException(`Only the sender can edit this message`);
      }

      // Record immutable audit log entry
      await client.query(
        `INSERT INTO message_audit_logs (id, workspace_id, message_id, user_id, action, old_content, new_content)
         VALUES (gen_random_uuid(), $1, $2, $3, 'EDIT', $4, $5);`,
        [workspaceId, messageId, userId, existingMsg.content, newContent],
      );

      // Update message
      const updatedRes = await client.query<MessageEntity>(
        `UPDATE messages SET content = $1, is_edited = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING *;`,
        [newContent, messageId],
      );

      this.logger.log(`Edited message ${messageId} (workspace ${workspaceId})`);
      return updatedRes.rows[0];
    });
  }

  /**
   * Delete a message with immutable audit logging
   */
  async deleteMessage(
    workspaceId: string,
    userId: string,
    messageId: string,
  ): Promise<{ success: boolean; messageId: string }> {
    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      const existingRes = await client.query<MessageEntity>(
        `SELECT * FROM messages WHERE id = $1 AND workspace_id = $2;`,
        [messageId, workspaceId],
      );

      if (existingRes.rows.length === 0) {
        throw new NotFoundException(`Message ${messageId} not found`);
      }

      const existingMsg = existingRes.rows[0];

      // Record immutable audit log entry
      await client.query(
        `INSERT INTO message_audit_logs (id, workspace_id, message_id, user_id, action, old_content)
         VALUES (gen_random_uuid(), $1, $2, $3, 'DELETE', $4);`,
        [workspaceId, messageId, userId, existingMsg.content],
      );

      // Delete message
      await client.query(`DELETE FROM messages WHERE id = $1;`, [messageId]);

      this.logger.log(`Deleted message ${messageId} (workspace ${workspaceId})`);
      return { success: true, messageId };
    });
  }

  /**
   * Get channel message history
   */
  async getChannelMessages(
    workspaceId: string,
    channelId: string,
    limit = 50,
    beforeId?: string,
  ): Promise<MessageEntity[]> {
    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      let queryText = `
        SELECT * FROM messages
        WHERE channel_id = $1 AND parent_message_id IS NULL
      `;
      const params: any[] = [channelId];

      if (beforeId) {
        queryText += ` AND created_at < (SELECT created_at FROM messages WHERE id = $2)`;
        params.push(beforeId);
      }

      queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1};`;
      params.push(limit);

      const res = await client.query<MessageEntity>(queryText, params);
      return res.rows;
    });
  }

  /**
   * Get thread replies
   */
  async getThreadReplies(workspaceId: string, rootMessageId: string): Promise<MessageEntity[]> {
    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      const res = await client.query<MessageEntity>(
        `SELECT * FROM messages WHERE parent_message_id = $1 ORDER BY created_at ASC;`,
        [rootMessageId],
      );
      return res.rows;
    });
  }

  /**
   * Add an emoji reaction
   */
  async addReaction(workspaceId: string, userId: string, dto: AddReactionDto) {
    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      const res = await client.query(
        `INSERT INTO reactions (id, workspace_id, message_id, user_id, emoji_code)
         VALUES (gen_random_uuid(), $1, $2, $3, $4)
         ON CONFLICT (message_id, user_id, emoji_code) DO NOTHING
         RETURNING *;`,
        [workspaceId, dto.messageId, userId, dto.emojiCode],
      );
      return res.rows[0] || { message: 'Reaction already exists' };
    });
  }

  /**
   * Remove an emoji reaction
   */
  async removeReaction(workspaceId: string, userId: string, messageId: string, emojiCode: string) {
    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      await client.query(
        `DELETE FROM reactions WHERE workspace_id = $1 AND message_id = $2 AND user_id = $3 AND emoji_code = $4;`,
        [workspaceId, messageId, userId, emojiCode],
      );
      return { success: true };
    });
  }

  /**
   * Postgres Full-Text Search across channel messages in tenant context
   */
  async searchMessages(
    workspaceId: string,
    query: string,
    channelId?: string,
    senderId?: string,
    limit = 20,
  ): Promise<MessageEntity[]> {
    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      let sql = `
        SELECT * FROM messages
        WHERE workspace_id = $1 AND content ILIKE $2
      `;
      const params: any[] = [workspaceId, `%${query}%`];

      if (channelId) {
        params.push(channelId);
        sql += ` AND channel_id = $${params.length}`;
      }

      if (senderId) {
        params.push(senderId);
        sql += ` AND sender_id = $${params.length}`;
      }

      params.push(limit);
      sql += ` ORDER BY created_at DESC LIMIT $${params.length};`;

      const res = await client.query<MessageEntity>(sql, params);
      return res.rows;
    });
  }
}
