import { Injectable, Logger } from '@nestjs/common';
import { SlashCommandHandler, CommandResult } from '../slash-command.interface';
import { RemindersService } from '../reminders.service';

@Injectable()
export class RemindCommandStrategy implements SlashCommandHandler {
  readonly commandName = 'remind';
  private readonly logger = new Logger(RemindCommandStrategy.name);

  constructor(private readonly remindersService: RemindersService) {}

  async execute(
    workspaceId: string,
    userId: string,
    channelId: string,
    args: string[],
  ): Promise<CommandResult> {
    const rawInput = args.join(' ');
    if (!rawInput.trim()) {
      return {
        success: false,
        command: '/remind',
        response: '⚠️ Usage: `/remind me to [action] in [time]` (e.g. `/remind me to review PR in 30 minutes`).',
      };
    }

    this.logger.log(`[RemindCommandStrategy] Executing /remind for user ${userId}: "${rawInput}"`);

    const reminder = await this.remindersService.createReminder(workspaceId, userId, rawInput);

    const formattedTime = new Date(reminder.remindAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      success: true,
      command: '/remind',
      response: `⏰ Reminder set! I'll remind **${reminder.target}** to "${reminder.action}" at **${formattedTime}**.`,
      metadata: { reminderId: reminder.id, remindAt: reminder.remindAt },
    };
  }
}
