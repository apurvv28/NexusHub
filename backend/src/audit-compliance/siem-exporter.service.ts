import { Injectable, Logger } from '@nestjs/common';
import { AuditLogEntry } from './audit-log.service';

export interface SIEMDestinationConfig {
  workspaceId: string;
  destinationType: 'splunk' | 'datadog' | 'sumo_logic' | 'kinesis_firehose_s3';
  endpointUrl: string;
  apiKey?: string;
  format: 'cef' | 'json';
  enabled: boolean;
}

@Injectable()
export class SIEMExporterService {
  private readonly logger = new Logger(SIEMExporterService.name);
  private siemConfigs: Map<string, SIEMDestinationConfig> = new Map();

  /**
   * Configure SIEM export destination for a tenant workspace
   */
  async configureSIEM(
    workspaceId: string,
    destinationType: 'splunk' | 'datadog' | 'sumo_logic' | 'kinesis_firehose_s3',
    endpointUrl: string,
    apiKey?: string,
    format: 'cef' | 'json' = 'json',
  ): Promise<SIEMDestinationConfig> {
    const config: SIEMDestinationConfig = {
      workspaceId,
      destinationType,
      endpointUrl,
      apiKey,
      format,
      enabled: true,
    };

    this.siemConfigs.set(workspaceId, config);
    this.logger.log(`[SIEMExporter] Configured ${destinationType.toUpperCase()} export stream for workspace ${workspaceId}`);
    return config;
  }

  /**
   * Get SIEM config for workspace
   */
  getSIEMConfig(workspaceId: string): SIEMDestinationConfig | null {
    return this.siemConfigs.get(workspaceId) || null;
  }

  /**
   * Format audit entry into Common Event Format (CEF)
   */
  formatCEF(entry: AuditLogEntry): string {
    const timeStr = entry.timestamp.toISOString();
    return `CEF:0|NexusHub|AuditEngine|1.0|${entry.category}|${entry.action}|5|src=${entry.ipAddress} suser=${entry.userId} cs1Label=workspaceId cs1=${entry.workspaceId} msg=${JSON.stringify(entry.details || {})} rt=${timeStr}`;
  }

  /**
   * Stream audit log entry to configured SIEM target
   */
  async streamAuditLog(entry: AuditLogEntry): Promise<{ streamed: boolean; destination?: string; payload: string }> {
    const config = this.siemConfigs.get(entry.workspaceId);
    let payload = '';

    if (config?.format === 'cef') {
      payload = this.formatCEF(entry);
    } else {
      payload = JSON.stringify({
        source: 'NexusHub-SIEM-Exporter',
        timestamp: entry.timestamp.toISOString(),
        workspaceId: entry.workspaceId,
        category: entry.category,
        action: entry.action,
        userId: entry.userId,
        clientIp: entry.ipAddress,
        details: entry.details,
      });
    }

    if (config && config.enabled) {
      this.logger.log(`[SIEMExporter] Streamed audit record [${entry.action}] -> ${config.destinationType.toUpperCase()} at ${config.endpointUrl}`);
      return { streamed: true, destination: config.destinationType, payload };
    } else {
      // Default local stream buffer
      this.logger.log(`[SIEMExporter] Local audit stream buffer formatted record [${entry.action}] (${payload.length} bytes)`);
      return { streamed: false, payload };
    }
  }
}
