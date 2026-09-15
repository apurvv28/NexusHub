import { Controller, Post, Get, Body, Headers } from '@nestjs/common';
import { DataResidencyService, AWSRegion } from './data-residency.service';

@Controller('data-residency')
export class DataResidencyController {
  constructor(private readonly residencyService: DataResidencyService) {}

  @Post('config')
  async setRegion(
    @Headers('x-workspace-id') workspaceId: string,
    @Body() body: { region: AWSRegion; enforceStrictResidency?: boolean },
  ) {
    const policy = await this.residencyService.setResidencyRegion(
      workspaceId || 'ws_default',
      body.region || 'us-east-1',
      body.enforceStrictResidency ?? true,
    );
    return { success: true, policy };
  }

  @Get('config')
  async getRegion(@Headers('x-workspace-id') workspaceId: string) {
    const policy = await this.residencyService.getResidencyPolicy(workspaceId || 'ws_default');
    return { success: true, policy };
  }
}
