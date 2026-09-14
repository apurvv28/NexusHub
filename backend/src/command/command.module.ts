import { Module } from '@nestjs/common';
import { CommandService } from './command.service';
import { CommandController } from './command.controller';
import { TopicCommandStrategy } from './strategies/topic-command.strategy';
import { RemindCommandStrategy } from './strategies/remind-command.strategy';
import { InviteCommandStrategy } from './strategies/invite-command.strategy';

@Module({
  controllers: [CommandController],
  providers: [
    TopicCommandStrategy,
    RemindCommandStrategy,
    InviteCommandStrategy,
    {
      provide: 'SLASH_COMMAND_HANDLERS',
      useFactory: (
        topic: TopicCommandStrategy,
        remind: RemindCommandStrategy,
        invite: InviteCommandStrategy,
      ) => [topic, remind, invite],
      inject: [TopicCommandStrategy, RemindCommandStrategy, InviteCommandStrategy],
    },
    CommandService,
  ],
  exports: [CommandService],
})
export class CommandModule {}
