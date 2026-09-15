import { Module } from '@nestjs/common';
import { DisasterRecoveryController } from './disaster-recovery.controller';
import { DisasterRecoveryService } from './disaster-recovery.service';

@Module({
  controllers: [DisasterRecoveryController],
  providers: [DisasterRecoveryService],
  exports: [DisasterRecoveryService],
})
export class DisasterRecoveryModule {}
