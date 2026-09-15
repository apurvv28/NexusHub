import { Controller, Post, Get, Headers } from '@nestjs/common';
import { DisasterRecoveryService } from './disaster-recovery.service';

@Controller('disaster-recovery')
export class DisasterRecoveryController {
  constructor(private readonly drService: DisasterRecoveryService) {}

  @Get('security-status')
  async getSecurityStatus(@Headers('x-workspace-id') workspaceId: string) {
    const status = await this.drService.getSecurityStatus(workspaceId || 'ws_default');
    return { success: true, status };
  }

  @Post('failover-drill')
  async runFailoverDrill(@Headers('x-workspace-id') workspaceId: string) {
    const result = await this.drService.executeDRFailoverDrill(workspaceId || 'ws_default');
    return { success: true, result };
  }

  @Get('soc2-report')
  async getSOC2Report(@Headers('x-workspace-id') workspaceId: string) {
    const report = await this.drService.generateSOC2Report(workspaceId || 'ws_default');
    return { success: true, report };
  }
}
