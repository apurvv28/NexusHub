import { Injectable, Logger } from '@nestjs/common';
import { SlashCommandHandler, CommandResult } from '../slash-command.interface';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class InviteCommandStrategy implements SlashCommandHandler {
  readonly commandName = 'invite';
  private readonly logger = new Logger(InviteCommandStrategy.name);

  constructor(private readonly db: DatabaseService) {}

  async execute(
    workspaceId: string,
    userId: string,
    channelId: string,
    args: string[],
  ): Promise<CommandResult> {
    const targetUser = args[0];
    if (!targetUser) {
      return {
        success: false,
        command: 'invite',
        response: 'Usage: /invite <userId or email>',
      };
    }

    this.logger.log(`User ${userId} invited ${targetUser} to channel ${channelId}`);

    return {
      success: true,
      command: 'invite',
      response: `Invited user "${targetUser}" to channel.`,
      metadata: { channelId, targetUser },
    };
  }
}
