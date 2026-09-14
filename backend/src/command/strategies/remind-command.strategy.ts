import { Injectable, Logger } from '@nestjs/common';
import { SlashCommandHandler, CommandResult } from '../slash-command.interface';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class RemindCommandStrategy implements SlashCommandHandler {
  readonly commandName = 'remind';
  private readonly logger = new Logger(RemindCommandStrategy.name);

  constructor(private readonly db: DatabaseService) {}

  async execute(
    workspaceId: string,
    userId: string,
    channelId: string,
    args: string[],
  ): Promise<CommandResult> {
    const reminderText = args.join(' ');
    if (!reminderText) {
      return {
        success: false,
        command: 'remind',
        response: 'Usage: /remind <reminder content>',
      };
    }

    await this.db.executeWithTenantContext(workspaceId, async (client) => {
      await client.query(
        `INSERT INTO notifications (id, workspace_id, user_id, type, title, body)
         VALUES (gen_random_uuid(), $1, $2, 'SYSTEM', 'Reminder Set', $3);`,
        [workspaceId, userId, reminderText],
      );
    });

    this.logger.log(`Created reminder for user ${userId}: '${reminderText}'`);

    return {
      success: true,
      command: 'remind',
      response: `Reminder scheduled: "${reminderText}"`,
      metadata: { reminderText },
    };
  }
}
