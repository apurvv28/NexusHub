import {
  Controller,
  Post,
  Body,
  Headers,
  UseInterceptors,
} from '@nestjs/common';
import { AskAIService } from './ask-ai.service';
import { TenantInterceptor } from '../tenant/tenant.interceptor';

@Controller('api/v1/ai')
@UseInterceptors(TenantInterceptor)
export class AIController {
  constructor(private readonly askAIService: AskAIService) {}

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
}
