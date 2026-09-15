import { Controller, Post, Get, Body, Param, Query, Headers } from '@nestjs/common';
import { AuditLogService, AuditCategory } from './audit-log.service';
import { SIEMExporterService } from './siem-exporter.service';
import { RetentionWorkerService } from './retention-worker.service';

@Controller('compliance')
export class AuditComplianceController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly siemExporter: SIEMExporterService,
    private readonly retentionWorker: RetentionWorkerService,
  ) {}

  // --- AUDIT LOGS ENDPOINTS ---

  @Get('audit-logs')
  async getAuditLogs(
    @Headers('x-workspace-id') workspaceId: string,
    @Query('limit') limit?: string,
    @Query('category') category?: AuditCategory,
  ) {
    const logs = await this.auditLogService.getAuditLogs(
      workspaceId || 'ws_default',
      limit ? parseInt(limit, 10) : 50,
      category,
    );
    return { success: true, logs };
  }

  // --- SIEM EXPORTER ENDPOINTS ---

  @Post('siem/config')
  async configureSIEM(
    @Headers('x-workspace-id') workspaceId: string,
    @Body() body: {
      destinationType: 'splunk' | 'datadog' | 'sumo_logic' | 'kinesis_firehose_s3';
      endpointUrl: string;
      apiKey?: string;
      format?: 'cef' | 'json';
    },
  ) {
    const config = await this.siemExporter.configureSIEM(
      workspaceId || 'ws_default',
      body.destinationType,
      body.endpointUrl,
      body.apiKey,
      body.format || 'json',
    );
    return { success: true, config };
  }

  // --- RETENTION & LEGAL HOLD ENDPOINTS ---

  @Post('retention/config')
  async configureRetention(
    @Headers('x-workspace-id') workspaceId: string,
    @Body() body: { retentionDays: number; autoPurgeEnabled: boolean; exemptChannels?: string[] },
  ) {
    const config = await this.retentionWorker.configurePolicy(
      workspaceId || 'ws_default',
      body.retentionDays,
      body.autoPurgeEnabled,
      body.exemptChannels || [],
    );
    return { success: true, config };
  }

  @Post('retention/legal-hold')
  async toggleLegalHold(
    @Headers('x-workspace-id') workspaceId: string,
    @Body() body: { legalHoldActive: boolean; reason?: string },
  ) {
    const config = await this.retentionWorker.setLegalHold(
      workspaceId || 'ws_default',
      body.legalHoldActive,
      body.reason,
    );
    return { success: true, config };
  }

  @Post('retention/run')
  async runRetention(
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const result = await this.retentionWorker.executeRetentionWorker(workspaceId || 'ws_default');
    return { success: true, result };
  }
}
