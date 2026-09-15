import { Controller, Post, Get, Body, Headers } from '@nestjs/common';
import { EnterpriseSSOService } from './enterprise-sso.service';

@Controller('auth/sso')
export class EnterpriseSSOController {
  constructor(private readonly ssoService: EnterpriseSSOService) {}

  @Post('config')
  async configureSSO(
    @Headers('x-workspace-id') workspaceId: string,
    @Body() body: {
      provider: 'okta' | 'azure_ad' | 'ping_identity' | 'custom_saml';
      entityId: string;
      ssoUrl: string;
      certificate: string;
      allowedDomains: string[];
    },
  ) {
    const config = await this.ssoService.configureSSO(
      workspaceId || 'ws_default',
      body.provider,
      body.entityId,
      body.ssoUrl,
      body.certificate,
      body.allowedDomains || [],
    );
    return { success: true, config };
  }

  @Get('config')
  async getSSOConfig(@Headers('x-workspace-id') workspaceId: string) {
    const config = await this.ssoService.getSSOConfig(workspaceId || 'ws_default');
    return { success: true, config };
  }

  @Post('saml/consume')
  async consumeSAML(
    @Headers('x-workspace-id') workspaceId: string,
    @Body() body: { samlResponse: string },
  ) {
    const userClaims = await this.ssoService.validateSAMLAssertion(
      workspaceId || 'ws_default',
      body.samlResponse,
    );
    return { success: true, user: userClaims, token: `jwt_sso_session_${Date.now()}` };
  }
}
