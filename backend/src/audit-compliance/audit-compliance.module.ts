import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { SIEMExporterService } from './siem-exporter.service';
import { RetentionWorkerService } from './retention-worker.service';
import { AuditComplianceController } from './audit-compliance.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AuditComplianceController],
  providers: [AuditLogService, SIEMExporterService, RetentionWorkerService],
  exports: [AuditLogService, SIEMExporterService, RetentionWorkerService],
})
export class AuditComplianceModule {}
