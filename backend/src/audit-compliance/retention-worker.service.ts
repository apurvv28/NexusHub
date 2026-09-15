import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface RetentionPolicyConfig {
  workspaceId: string;
  retentionDays: number; // e.g. 90 days retention TTL
  autoPurgeEnabled: boolean;
  legalHoldActive: boolean;
  legalHoldReason?: string;
  exemptChannels: string[]; // channelIds exempt from deletion
  updatedAt: Date;
}

export interface RetentionExecutionResult {
  workspaceId: string;
  evaluatedMessageCount: number;
  purgedMessageCount: number;
  skippedLegalHoldCount: number;
  executionTimestamp: Date;
}

@Injectable()
export class RetentionWorkerService {
  private readonly logger = new Logger(RetentionWorkerService.name);
  private retentionConfigs: Map<string, RetentionPolicyConfig> = new Map();

  constructor(private readonly dbService?: DatabaseService) {}

  /**
   * Configure message retention TTL policy for a tenant workspace
   */
  async configurePolicy(
    workspaceId: string,
    retentionDays: number = 90,
    autoPurgeEnabled: boolean = true,
    exemptChannels: string[] = [],
  ): Promise<RetentionPolicyConfig> {
    const existing = this.retentionConfigs.get(workspaceId);
    const config: RetentionPolicyConfig = {
      workspaceId,
      retentionDays,
      autoPurgeEnabled,
      legalHoldActive: existing?.legalHoldActive || false,
      legalHoldReason: existing?.legalHoldReason,
      exemptChannels,
      updatedAt: new Date(),
    };

    this.retentionConfigs.set(workspaceId, config);
    this.logger.log(`[RetentionWorker] Updated policy for workspace ${workspaceId}: ${retentionDays} days retention (Auto-purge: ${autoPurgeEnabled})`);
    return config;
  }

  /**
   * Enable or disable Legal Hold override flag on a tenant workspace
   */
  async setLegalHold(
    workspaceId: string,
    legalHoldActive: boolean,
    reason?: string,
  ): Promise<RetentionPolicyConfig> {
    const config = (await this.getPolicy(workspaceId)) || {
      workspaceId,
      retentionDays: 90,
      autoPurgeEnabled: true,
      legalHoldActive: false,
      exemptChannels: [],
      updatedAt: new Date(),
    };

    config.legalHoldActive = legalHoldActive;
    config.legalHoldReason = legalHoldActive ? (reason || 'Compliance Investigation') : undefined;
    config.updatedAt = new Date();

    this.retentionConfigs.set(workspaceId, config);
    this.logger.log(`[RetentionWorker] Legal Hold status for workspace ${workspaceId} changed to: ${legalHoldActive} (Reason: ${config.legalHoldReason || 'None'})`);
    return config;
  }

  /**
   * Get retention policy config
   */
  async getPolicy(workspaceId: string): Promise<RetentionPolicyConfig | null> {
    return this.retentionConfigs.get(workspaceId) || null;
  }

  /**
   * Execute automated background message retention cleanup worker
   */
  async executeRetentionWorker(workspaceId: string, sampleMessagesCount: number = 100): Promise<RetentionExecutionResult> {
    const config = await this.getPolicy(workspaceId);
    const result: RetentionExecutionResult = {
      workspaceId,
      evaluatedMessageCount: sampleMessagesCount,
      purgedMessageCount: 0,
      skippedLegalHoldCount: 0,
      executionTimestamp: new Date(),
    };

    // CRITICAL COMPLIANCE GUARD: If Legal Hold is active, STOP and protect 100% of data!
    if (config?.legalHoldActive) {
      this.logger.warn(`[RetentionWorker] [LEGAL HOLD OVERRIDE] Workspace ${workspaceId} is under active Legal Hold (${config.legalHoldReason}). Retention purge SKIPPED.`);
      result.skippedLegalHoldCount = sampleMessagesCount;
      return result;
    }

    if (!config || !config.autoPurgeEnabled) {
      this.logger.log(`[RetentionWorker] Auto-purge disabled for workspace ${workspaceId}. Skipping retention run.`);
      return result;
    }

    // Simulate TTL calculation (messages older than retentionDays)
    const mockPurged = Math.floor(sampleMessagesCount * 0.15); // e.g. 15% messages expired
    result.purgedMessageCount = mockPurged;
    this.logger.log(`[RetentionWorker] Retention run completed for workspace ${workspaceId}: Purged ${mockPurged} messages older than ${config.retentionDays} days.`);

    return result;
  }
}
