import { Controller, Post, Get, Put, Delete, Body, Param, Headers } from '@nestjs/common';
import { EnterpriseSSOService } from './enterprise-sso.service';

@Controller('scim/v2')
export class SCIMController {
  constructor(private readonly ssoService: EnterpriseSSOService) {}

  // --- SCIM 2.0 USERS ENDPOINTS ---

  @Post('Users')
  async createUser(
    @Headers('x-workspace-id') workspaceId: string,
    @Body() body: any,
  ) {
    return this.ssoService.createSCIMUser(workspaceId || 'ws_default', body);
  }

  @Get('Users')
  async getUsers(@Headers('x-workspace-id') workspaceId: string) {
    return this.ssoService.getSCIMUsers(workspaceId || 'ws_default');
  }

  @Get('Users/:id')
  async getUserById(
    @Headers('x-workspace-id') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.ssoService.getSCIMUserById(workspaceId || 'ws_default', id);
  }

  @Put('Users/:id')
  async updateUser(
    @Headers('x-workspace-id') workspaceId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.ssoService.updateSCIMUser(workspaceId || 'ws_default', id, body);
  }

  @Delete('Users/:id')
  async deleteUser(
    @Headers('x-workspace-id') workspaceId: string,
    @Param('id') id: string,
  ) {
    await this.ssoService.deleteSCIMUser(workspaceId || 'ws_default', id);
    return { status: 204, message: 'User deprovisioned' };
  }

  // --- SCIM 2.0 GROUPS ENDPOINTS ---

  @Post('Groups')
  async createGroup(
    @Headers('x-workspace-id') workspaceId: string,
    @Body() body: { displayName: string; members?: Array<{ value: string }> },
  ) {
    const memberIds = body.members?.map((m) => m.value) || [];
    return this.ssoService.createSCIMGroup(workspaceId || 'ws_default', body.displayName, memberIds);
  }

  @Get('Groups')
  async getGroups(@Headers('x-workspace-id') workspaceId: string) {
    return this.ssoService.getSCIMGroups(workspaceId || 'ws_default');
  }
}
