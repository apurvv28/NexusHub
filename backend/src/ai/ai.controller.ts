import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Headers,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { AskAIService } from './ask-ai.service';
import { AISummarizationService } from './ai-summarization.service';
import { AIComposeAssistantService } from './ai-compose-assistant.service';
import { AICostGovernorService } from './ai-cost-governor.service';
import { TenantInterceptor } from '../tenant/tenant.interceptor';

@Controller('api/v1/ai')
@UseInterceptors(TenantInterceptor)
export class AIController {
  constructor(
    private readonly askAIService: AskAIService,
    private readonly summarizationService: AISummarizationService,
    private readonly composeService: AIComposeAssistantService,
    private readonly costGovernorService: AICostGovernorService,
  ) {}

  @Post('ask')
  async askAI(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
    @Body('question') question: string,
  ) {
    return this.askAIService.askAI(
      workspaceId,
      userId || '00000000-0000-0000-0000-000000000000',
      question,
    );
  }

  // Task 3.3: AI Summarizer Endpoints ("Catch Me Up")
  @Post('summarize/channel')
  async summarizeChannel(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
    @Body('channelId') channelId: string,
    @Body('limit') limit?: number,
  ) {
    return this.summarizationService.summarizeChannel(
      workspaceId,
      userId || '00000000-0000-0000-0000-000000000000',
      channelId,
      limit || 30,
    );
  }

  @Post('summarize/thread')
  async summarizeThread(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
    @Body('parentMessageId') parentMessageId: string,
  ) {
    return this.summarizationService.summarizeThread(
      workspaceId,
      userId || '00000000-0000-0000-0000-000000000000',
      parentMessageId,
    );
  }

  // Task 3.4: AI Compose Assistant Endpoints
  @Post('compose/rephrase')
  async rephrase(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
    @Body('text') text: string,
    @Body('style') style?: 'formal' | 'casual' | 'concise',
  ) {
    return this.composeService.rephrase(
      workspaceId,
      userId || '00000000-0000-0000-0000-000000000000',
      text,
      style || 'formal',
    );
  }

  @Post('compose/grammar')
  async fixGrammar(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
    @Body('text') text: string,
  ) {
    return this.composeService.fixGrammar(
      workspaceId,
      userId || '00000000-0000-0000-0000-000000000000',
      text,
    );
  }

  @Post('compose/translate')
  async translate(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
    @Body('text') text: string,
    @Body('targetLanguage') targetLanguage: string,
  ) {
    return this.composeService.translate(
      workspaceId,
      userId || '00000000-0000-0000-0000-000000000000',
      text,
      targetLanguage || 'Spanish',
    );
  }

  // Task 3.5: Tenant AI Cost Governor & Usage Dashboard Endpoints
  @Get('governor/budget')
  async getBudget(@Headers('x-workspace-id') workspaceId: string) {
    return this.costGovernorService.getOrCreateBudget(workspaceId);
  }

  @Put('governor/budget')
  async updateBudget(
    @Headers('x-workspace-id') workspaceId: string,
    @Body('dailyBudgetCents') dailyBudgetCents?: number,
    @Body('maxTokensPerMinute') maxTokensPerMinute?: number,
    @Body('resetCircuitBreaker') resetCircuitBreaker?: boolean,
  ) {
    return this.costGovernorService.updateBudgetSettings(
      workspaceId,
      dailyBudgetCents,
      maxTokensPerMinute,
      resetCircuitBreaker,
    );
  }

  @Get('governor/analytics')
  async getAnalytics(@Headers('x-workspace-id') workspaceId: string) {
    return this.costGovernorService.getUsageAnalytics(workspaceId);
  }
}
