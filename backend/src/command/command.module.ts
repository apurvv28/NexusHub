import { Module } from '@nestjs/common';
import { CommandService } from './command.service';
import { CommandController } from './command.controller';
import { TopicCommandStrategy } from './strategies/topic-command.strategy';
import { RemindCommandStrategy } from './strategies/remind-command.strategy';
import { InviteCommandStrategy } from './strategies/invite-command.strategy';
import { AskAICommandStrategy } from './strategies/ask-ai-command.strategy';
import { RemindersService } from './reminders.service';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [AIModule],
  controllers: [CommandController],
  providers: [
    RemindersService,
    TopicCommandStrategy,
    RemindCommandStrategy,
    InviteCommandStrategy,
    AskAICommandStrategy,
    {
      provide: 'SLASH_COMMAND_HANDLERS',
      useFactory: (
        topic: TopicCommandStrategy,
        remind: RemindCommandStrategy,
        invite: InviteCommandStrategy,
        askAI: AskAICommandStrategy,
      ) => [topic, remind, invite, askAI],
      inject: [TopicCommandStrategy, RemindCommandStrategy, InviteCommandStrategy, AskAICommandStrategy],
    },
    CommandService,
  ],
  exports: [CommandService, RemindersService],
})
export class CommandModule {}
