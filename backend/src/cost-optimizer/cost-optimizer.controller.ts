import { Controller, Get, Post, Headers } from '@nestjs/common';
import { CostOptimizerService } from './cost-optimizer.service';

@Controller('cost-optimizer')
export class CostOptimizerController {
  constructor(private readonly costService: CostOptimizerService) {}

  @Get('recommendations')
  async getRecommendations(@Headers('x-workspace-id') workspaceId: string) {
    const recommendations = await this.costService.getComputeRecommendations(workspaceId || 'ws_default');
    return { success: true, recommendations };
  }

  @Post('s3-lifecycle/run')
  async runS3LifecycleWorker(@Headers('x-workspace-id') workspaceId: string) {
    const result = await this.costService.executeS3GlacierLifecycleWorker(workspaceId || 'ws_default');
    return { success: true, result };
  }

  @Get('savings-summary')
  async getSavingsSummary(@Headers('x-workspace-id') workspaceId: string) {
    const summary = await this.costService.getSavingsSummary(workspaceId || 'ws_default');
    return { success: true, summary };
  }
}
