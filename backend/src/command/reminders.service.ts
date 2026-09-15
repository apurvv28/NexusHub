import { Injectable, Logger } from '@nestjs/common';

export interface ReminderItem {
  id: string;
  workspaceId: string;
  creatorUserId: string;
  target: string; // 'me' | channelId | userId
  action: string;
  remindAt: Date;
  status: 'pending' | 'triggered' | 'canceled';
  createdAt: Date;
}

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);
  private remindersStore: Map<string, ReminderItem> = new Map();

  /**
   * Parse natural language command text for /remind
   * Syntax examples:
   *  - "me to review PR in 30 minutes"
   *  - "me to deploy release tomorrow at 9am"
   *  - "#general team sync in 1 hour"
   */
  parseRemindText(rawInput: string): { target: string; action: string; remindAt: Date } {
    const input = rawInput.trim();

    // Default target: 'me'
    let target = 'me';
    let textToParse = input;

    // Check if starts with target (me or #channel or @user)
    const spaceIndex = input.indexOf(' ');
    if (spaceIndex !== -1) {
      const firstWord = input.substring(0, spaceIndex);
      if (firstWord === 'me' || firstWord.startsWith('#') || firstWord.startsWith('@')) {
        target = firstWord;
        textToParse = input.substring(spaceIndex + 1).trim();
      }
    }

    // Strip leading "to " if present
    if (textToParse.startsWith('to ')) {
      textToParse = textToParse.substring(3).trim();
    }

    let action = textToParse;
    let remindAt = new Date(Date.now() + 60 * 60 * 1000); // Default +1 hr

    // Relative time regex parsing: "in X minutes/hours/days"
    const inMatch = textToParse.match(/(.+?)\s+in\s+(\d+)\s*(minute|min|hour|hr|day)s?$/i);
    if (inMatch) {
      action = inMatch[1].trim();
      const amount = parseInt(inMatch[2], 10);
      const unit = inMatch[3].toLowerCase();

      let ms = amount * 60 * 1000;
      if (unit.startsWith('hour') || unit.startsWith('hr')) {
        ms = amount * 60 * 60 * 1000;
      } else if (unit.startsWith('day')) {
        ms = amount * 24 * 60 * 60 * 1000;
      }

      remindAt = new Date(Date.now() + ms);
    } else {
      // Absolute time regex parsing: "tomorrow at 9am" or "at 4pm"
      const tomorrowMatch = textToParse.match(/(.+?)\s+tomorrow(?:\s+at\s+(\d+)(?::(\d+))?\s*(am|pm)?)?$/i);
      const atMatch = textToParse.match(/(.+?)\s+at\s+(\d+)(?::(\d+))?\s*(am|pm)?$/i);

      if (tomorrowMatch) {
        action = tomorrowMatch[1].trim();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        let hour = 9;
        if (tomorrowMatch[2]) {
          hour = parseInt(tomorrowMatch[2], 10);
          if (tomorrowMatch[4]?.toLowerCase() === 'pm' && hour < 12) hour += 12;
          if (tomorrowMatch[4]?.toLowerCase() === 'am' && hour === 12) hour = 0;
        }
        tomorrow.setHours(hour, 0, 0, 0);
        remindAt = tomorrow;
      } else if (atMatch) {
        action = atMatch[1].trim();
        let hour = parseInt(atMatch[2], 10);
        const ampm = atMatch[4]?.toLowerCase();
        if (ampm === 'pm' && hour < 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
        const targetTime = new Date();
        targetTime.setHours(hour, 0, 0, 0);
        if (targetTime.getTime() <= Date.now()) {
          targetTime.setDate(targetTime.getDate() + 1);
        }
        remindAt = targetTime;
      }
    }

    return { target, action, remindAt };
  }

  /**
   * Create and schedule a reminder
   */
  async createReminder(
    workspaceId: string,
    creatorUserId: string,
    rawInput: string,
  ): Promise<ReminderItem> {
    const parsed = this.parseRemindText(rawInput);
    const id = `remind_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const item: ReminderItem = {
      id,
      workspaceId,
      creatorUserId,
      target: parsed.target,
      action: parsed.action,
      remindAt: parsed.remindAt,
      status: 'pending',
      createdAt: new Date(),
    };

    this.remindersStore.set(id, item);
    this.logger.log(`[RemindersService] Created reminder ${id} for '${item.target}' to '${item.action}' at ${item.remindAt.toISOString()}`);

    return item;
  }

  /**
   * Get user reminders
   */
  async getUserReminders(workspaceId: string, userId: string): Promise<ReminderItem[]> {
    return Array.from(this.remindersStore.values()).filter(
      (r) => r.workspaceId === workspaceId && r.creatorUserId === userId && r.status === 'pending',
    );
  }
}
