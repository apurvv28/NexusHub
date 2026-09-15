import { Module } from '@nestjs/common';
import { WSShardingController } from './ws-sharding.controller';
import { WSShardingService } from './ws-sharding.service';

@Module({
  controllers: [WSShardingController],
  providers: [WSShardingService],
  exports: [WSShardingService],
})
export class WSShardingModule {}
