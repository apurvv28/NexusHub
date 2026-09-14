import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface ProvisionTenantDto {
  tenantName: string;
  tenantDomain: string;
  workspaceName: string;
  workspaceSlug: string;
  adminEmail: string;
  adminFullName: string;
}

export interface ProvisioningResult {
  tenantId: string;
  workspaceId: string;
  userId: string;
  channels: { id: string; name: string }[];
}

@Injectable()
export class TenantProvisioningService {
  private readonly logger = new Logger(TenantProvisioningService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Saga Orchestrator for Provisioning New Workspaces with Compensating Action Rollbacks
   */
  async provisionTenantSaga(dto: ProvisionTenantDto): Promise<ProvisioningResult> {
    this.logger.log(`Starting Tenant Provisioning Saga for workspace: ${dto.workspaceSlug}`);

    let createdTenantId: string | null = null;
    let createdWorkspaceId: string | null = null;
    let createdUserId: string | null = null;
    const createdChannels: { id: string; name: string }[] = [];

    try {
      // Step 1: Create Tenant Record
      const tenantRes = await this.db.query(
        `INSERT INTO tenants (id, name, domain) VALUES (gen_random_uuid(), $1, $2) RETURNING id;`,
        [dto.tenantName, dto.tenantDomain]
      );
      createdTenantId = tenantRes.rows[0].id;

      // Step 2: Create Workspace Record
      const wsRes = await this.db.query(
        `INSERT INTO workspaces (id, tenant_id, name, slug) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING id;`,
        [createdTenantId, dto.workspaceName, dto.workspaceSlug]
      );
      createdWorkspaceId = wsRes.rows[0].id;

      // Step 3: Create Admin User Record
      const userRes = await this.db.query(
        `INSERT INTO users (id, email, full_name) VALUES (gen_random_uuid(), $1, $2)
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING id;`,
        [dto.adminEmail, dto.adminFullName]
      );
      createdUserId = userRes.rows[0].id;

      if (!createdTenantId || !createdWorkspaceId || !createdUserId) {
        throw new Error('Failed to insert tenant, workspace, or user record.');
      }

      // Step 4: Execute inside workspace RLS context to assign Admin Role & Default Channels
      await this.db.executeWithTenantContext(createdWorkspaceId, async (client) => {
        // Step 4a: Assign Workspace Admin Membership
        await client.query(
          `INSERT INTO workspace_memberships (id, workspace_id, user_id, role) VALUES (gen_random_uuid(), $1, $2, 'admin');`,
          [createdWorkspaceId, createdUserId]
        );

        // Step 4b: Create Default Channel '#general'
        const genRes = await client.query(
          `INSERT INTO channels (id, workspace_id, name, topic, is_private, created_by)
           VALUES (gen_random_uuid(), $1, 'general', 'Company-wide announcements and work-based matters', false, $2)
           RETURNING id, name;`,
          [createdWorkspaceId, createdUserId]
        );
        createdChannels.push(genRes.rows[0]);

        // Step 4c: Create Default Channel '#random'
        const randRes = await client.query(
          `INSERT INTO channels (id, workspace_id, name, topic, is_private, created_by)
           VALUES (gen_random_uuid(), $1, 'random', 'Non-work banter and water cooler chat', false, $2)
           RETURNING id, name;`,
          [createdWorkspaceId, createdUserId]
        );
        createdChannels.push(randRes.rows[0]);
      });

      this.logger.log(`Tenant Provisioning Saga completed successfully for workspace ${dto.workspaceSlug}`);

      return {
        tenantId: createdTenantId,
        workspaceId: createdWorkspaceId,
        userId: createdUserId,
        channels: createdChannels,
      };
    } catch (error) {
      this.logger.error(`Saga Step Failed! Executing compensating rollbacks for workspace ${dto.workspaceSlug}:`, error);
      await this.compensateRollback(createdTenantId);
      throw new InternalServerErrorException(`Tenant provisioning saga failed: ${(error as Error).message}`);
    }
  }

  /**
   * Saga Compensating Rollback Handler
   */
  private async compensateRollback(tenantId: string | null): Promise<void> {
    if (!tenantId) return;
    try {
      this.logger.warn(`Compensating action: Deleting failed tenant record ${tenantId}`);
      await this.db.query(`DELETE FROM tenants WHERE id = $1;`, [tenantId]);
    } catch (rollbackError) {
      this.logger.error(`Critical: Compensating rollback failed for tenant ${tenantId}:`, rollbackError);
    }
  }
}
