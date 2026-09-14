import { Injectable, Logger } from '@nestjs/common';
import { SlashCommandHandler, CommandResult } from '../slash-command.interface';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class TopicCommandStrategy implements SlashCommandHandler {
  readonly commandName = 'topic';
  private readonly logger = new Logger(TopicCommandStrategy.name);

  constructor(private readonly db: DatabaseService) {}

  async execute(
    workspaceId: string,
    userId: string,
    channelId: string,
    args: string[],
  ): Promise<CommandResult> {
    const topic = args.join(' ');
    if (!topic) {
      return {
        success: false,
        command: 'topic',
        response: 'Usage: /topic <new channel topic>',
      };
    }

    await this.db.executeWithTenantContext(workspaceId, async (client) => {
      await client.query(
        `UPDATE channels SET topic = $1 WHERE workspace_id = $2 AND id = $3;`,
        [topic, workspaceId, channelId],
      );
    });

    this.logger.log(`Updated topic for channel ${channelId} to '${topic}'`);

    return {
      success: true,
      command: 'topic',
      response: `Channel topic updated to: "${topic}"`,
      metadata: { channelId, topic },
    };
  }
}
