import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  UseInterceptors,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { TenantInterceptor } from '../tenant/tenant.interceptor';

@Controller('api/v1/webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @UseInterceptors(TenantInterceptor)
  async createWebhook(
    @Headers('x-workspace-id') workspaceId: string,
    @Body('name') name: string,
    @Body('type') type: 'INBOUND' | 'OUTBOUND',
    @Body('url') url?: string,
    @Body('channelId') channelId?: string,
  ) {
    return this.webhookService.createWebhook(workspaceId, name, type, url, channelId);
  }

  @Get()
  @UseInterceptors(TenantInterceptor)
  async listWebhooks(@Headers('x-workspace-id') workspaceId: string) {
    return this.webhookService.listWebhooks(workspaceId);
  }

  @Post('inbound/:webhookId')
  async handleInboundWebhook(
    @Param('webhookId') webhookId: string,
    @Body('text') text: string,
  ) {
    return this.webhookService.handleInboundWebhook(webhookId, text);
  }
}
