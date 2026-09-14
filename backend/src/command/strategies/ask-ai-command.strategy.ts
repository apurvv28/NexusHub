import { Injectable, Logger } from '@nestjs/common';
import { SlashCommandHandler, CommandResult } from '../slash-command.interface';
import { AskAIService } from '../../ai/ask-ai.service';

@Injectable()
export class AskAICommandStrategy implements SlashCommandHandler {
  readonly commandName = 'ask-ai';
  private readonly logger = new Logger(AskAICommandStrategy.name);

  constructor(private readonly askAIService: AskAIService) {}

  async execute(
    workspaceId: string,
    userId: string,
    channelId: string,
    args: string[],
  ): Promise<CommandResult> {
    const question = args.join(' ');
    if (!question) {
      return {
        success: false,
        command: 'ask-ai',
        response: 'Usage: /ask-ai <your question>',
      };
    }

    this.logger.log(`Executing /ask-ai slash command for question: "${question}"`);
    const aiRes = await this.askAIService.askAI(workspaceId, userId, question);

    return {
      success: true,
      command: 'ask-ai',
      response: aiRes.answer,
      metadata: {
        provider: aiRes.provider,
        citationsCount: aiRes.citations.length,
      },
    };
  }
}
