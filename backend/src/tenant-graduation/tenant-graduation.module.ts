import { Module } from '@nestjs/common';
import { TenantGraduationService } from './tenant-graduation.service';
import { TenantGraduationController } from './tenant-graduation.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TenantGraduationController],
  providers: [TenantGraduationService],
  exports: [TenantGraduationService],
})
export class TenantGraduationModule {}
