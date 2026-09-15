import { Controller, Post, Get, Body, Headers, Query } from '@nestjs/common';
import { DeveloperPlatformService, OAuthScope } from './developer-platform.service';

@Controller()
export class DeveloperPlatformController {
  constructor(private readonly devService: DeveloperPlatformService) {}

  @Post('developer/apps')
  async registerApp(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { name: string; description: string; redirectUris: string[]; scopes?: OAuthScope[] },
  ) {
    const app = await this.devService.registerApp(
      workspaceId || 'ws_default',
      userId || 'user_dev_1',
      body.name,
      body.description,
      body.redirectUris || ['https://localhost:3000/oauth/callback'],
      body.scopes,
    );
    return { success: true, app };
  }

  @Get('oauth/authorize')
  async authorize(
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-user-id') userId: string,
    @Query('client_id') clientId: string,
    @Query('scope') scopeStr?: string,
  ) {
    const scopes: OAuthScope[] = scopeStr ? (scopeStr.split(' ') as OAuthScope[]) : ['read:messages', 'write:messages'];
    const code = await this.devService.issueAuthCode(clientId, userId || 'user_1', workspaceId || 'ws_default', scopes);
    return { success: true, code };
  }

  @Post('oauth/token')
  async token(
    @Body()
    body: {
      grant_type: 'authorization_code' | 'client_credentials';
      client_id: string;
      client_secret: string;
      code?: string;
    },
  ) {
    const tokenResponse = await this.devService.exchangeToken(
      body.grant_type,
      body.client_id,
      body.client_secret,
      body.code,
    );
    return tokenResponse;
  }

  @Get('developer/openapi.json')
  async getOpenAPISpec() {
    const spec = this.devService.generateOpenAPISpec();
    return spec;
  }
}
