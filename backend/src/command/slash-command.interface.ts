export interface CommandResult {
  success: boolean;
  command: string;
  response: string;
  metadata?: Record<string, any>;
}

export interface SlashCommandHandler {
  readonly commandName: string;
  execute(
    workspaceId: string,
    userId: string,
    channelId: string,
    args: string[],
  ): Promise<CommandResult>;
}
