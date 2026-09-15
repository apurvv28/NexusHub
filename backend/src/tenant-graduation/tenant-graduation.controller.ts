import { Controller, Post, Get, Headers } from '@nestjs/common';
import { TenantGraduationService } from './tenant-graduation.service';

@Controller('tenant-graduation')
export class TenantGraduationController {
  constructor(private readonly graduationService: TenantGraduationService) {}

  @Post('start')
  async startGraduation(@Headers('x-workspace-id') workspaceId: string) {
    const progress = await this.graduationService.executeGraduationSaga(workspaceId || 'ws_default');
    return { success: true, progress };
  }

  @Get('status')
  async getStatus(@Headers('x-workspace-id') workspaceId: string) {
    const status = this.graduationService.getGraduationStatus(workspaceId || 'ws_default');
    const currentHost = this.graduationService.getTenantDatabaseHost(workspaceId || 'ws_default');
    return { success: true, status, activeDatabaseHost: currentHost };
  }
}
