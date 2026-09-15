import { Module } from '@nestjs/common';
import { CostOptimizerController } from './cost-optimizer.controller';
import { CostOptimizerService } from './cost-optimizer.service';

@Module({
  controllers: [CostOptimizerController],
  providers: [CostOptimizerService],
  exports: [CostOptimizerService],
})
export class CostOptimizerModule {}
