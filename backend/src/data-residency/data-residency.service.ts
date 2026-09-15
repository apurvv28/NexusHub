import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export type AWSRegion = 'us-east-1' | 'eu-west-1' | 'ap-southeast-1';

export interface DataResidencyPolicy {
  workspaceId: string;
  region: AWSRegion;
  dbClusterHost: string;
  s3BucketName: string;
  vectorStoreNamespace: string;
  enforceStrictResidency: boolean;
  updatedAt: Date;
}

@Injectable()
export class DataResidencyService {
  private readonly logger = new Logger(DataResidencyService.name);
  private residencyPolicies: Map<string, DataResidencyPolicy> = new Map();

  constructor(private readonly dbService?: DatabaseService) {}

  /**
   * Set designated data residency region for an enterprise tenant
   */
  async setResidencyRegion(
    workspaceId: string,
    region: AWSRegion = 'us-east-1',
    enforceStrictResidency: boolean = true,
  ): Promise<DataResidencyPolicy> {
    const regionEndpoints: Record<AWSRegion, { dbHost: string; bucket: string }> = {
      'us-east-1': {
        dbHost: 'aurora-us-east-1.nexushub.internal',
        bucket: 'nexushub-media-us-east-1',
      },
      'eu-west-1': {
        dbHost: 'aurora-eu-west-1.nexushub.internal',
        bucket: 'nexushub-media-eu-west-1',
      },
      'ap-southeast-1': {
        dbHost: 'aurora-ap-southeast-1.nexushub.internal',
        bucket: 'nexushub-media-ap-southeast-1',
      },
    };

    const endpoints = regionEndpoints[region] || regionEndpoints['us-east-1'];

    const policy: DataResidencyPolicy = {
      workspaceId,
      region,
      dbClusterHost: endpoints.dbHost,
      s3BucketName: endpoints.bucket,
      vectorStoreNamespace: `workspace_${workspaceId}_${region.replace(/-/g, '_')}`,
      enforceStrictResidency,
      updatedAt: new Date(),
    };

    this.residencyPolicies.set(workspaceId, policy);
    this.logger.log(`[DataResidency] Configured region '${region}' for workspace ${workspaceId} (DB: ${policy.dbClusterHost}, S3: ${policy.s3BucketName})`);

    return policy;
  }

  /**
   * Get active data residency policy for workspace
   */
  async getResidencyPolicy(workspaceId: string): Promise<DataResidencyPolicy> {
    const policy = this.residencyPolicies.get(workspaceId);
    if (!policy) {
      // Default fallback to us-east-1
      return this.setResidencyRegion(workspaceId, 'us-east-1', true);
    }
    return policy;
  }
}
