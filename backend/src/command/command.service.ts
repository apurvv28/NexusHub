import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { SlashCommandHandler, CommandResult } from './slash-command.interface';

@Injectable()
export class CommandService {
  private readonly logger = new Logger(CommandService.name);

  constructor(
    @Inject('SLASH_COMMAND_HANDLERS')
    private readonly handlers: SlashCommandHandler[],
  ) {}

  /**
   * Parse input line (e.g., "/topic New channel topic") and route to strategy handler
   */
  async executeCommand(
    workspaceId: string,
    userId: string,
    channelId: string,
    inputLine: string,
  ): Promise<CommandResult> {
    if (!inputLine || !inputLine.startsWith('/')) {
      throw new BadRequestException("Command string must start with '/' (e.g. /topic)");
    }

    const parts = inputLine.substring(1).trim().split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const handler = this.handlers.find(
      (h) => h.commandName.replace(/^\//, '').toLowerCase() === commandName,
    );

    if (!handler) {
      return {
        success: false,
        command: commandName,
        response: `Unknown command '/${commandName}'. Available commands: ${this.handlers.map((h) => '/' + h.commandName).join(', ')}`,
      };
    }

    this.logger.log(`Executing slash command '/${commandName}' for user ${userId} in channel ${channelId}`);
    return handler.execute(workspaceId, userId, channelId, args);
  }
}
