import { Controller, Get, Post, Body, Headers } from '@nestjs/common';
import { WSShardingService } from './ws-sharding.service';

@Controller('ws-sharding')
export class WSShardingController {
  constructor(private readonly shardingService: WSShardingService) {}

  @Get('cluster-nodes')
  async getClusterNodes() {
    const nodes = this.shardingService.getClusterNodes();
    return { success: true, nodes };
  }

  @Get('connection-distribution')
  async getDistribution() {
    const distribution = this.shardingService.getDistributionMetrics();
    return { success: true, distribution };
  }

  @Post('k6-simulation')
  async runK6Simulation(@Body() body: { targetConnections?: number }) {
    const target = body?.targetConnections || 100000;
    const result = await this.shardingService.runK6Simulation(target);
    return { success: true, result };
  }
}
