import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface UserGroupEntity {
  id: string;
  workspace_id: string;
  name: string;
  handle: string;
  description?: string;
  created_at: string;
}

@Injectable()
export class UserGroupService {
  private readonly logger = new Logger(UserGroupService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Create a new user group within workspace context
   */
  async createGroup(
    workspaceId: string,
    name: string,
    handle: string,
    description?: string,
  ): Promise<UserGroupEntity> {
    const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;

    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      const existing = await client.query(
        `SELECT id FROM user_groups WHERE workspace_id = $1 AND handle = $2;`,
        [workspaceId, cleanHandle],
      );

      if (existing.rows.length > 0) {
        throw new ConflictException(`User group with handle @${cleanHandle} already exists in workspace`);
      }

      const res = await client.query<UserGroupEntity>(
        `INSERT INTO user_groups (id, workspace_id, name, handle, description)
         VALUES (gen_random_uuid(), $1, $2, $3, $4)
         RETURNING *;`,
        [workspaceId, name, cleanHandle, description || null],
      );

      this.logger.log(`Created user group @${cleanHandle} in workspace ${workspaceId}`);
      return res.rows[0];
    });
  }

  /**
   * Add a user to a group
   */
  async addMember(workspaceId: string, groupId: string, userId: string) {
    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      const res = await client.query(
        `INSERT INTO user_group_members (id, workspace_id, group_id, user_id)
         VALUES (gen_random_uuid(), $1, $2, $3)
         ON CONFLICT (group_id, user_id) DO NOTHING
         RETURNING *;`,
        [workspaceId, groupId, userId],
      );
      return res.rows[0] || { message: 'User already in group' };
    });
  }

  /**
   * Remove a user from a group
   */
  async removeMember(workspaceId: string, groupId: string, userId: string) {
    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      await client.query(
        `DELETE FROM user_group_members WHERE workspace_id = $1 AND group_id = $2 AND user_id = $3;`,
        [workspaceId, groupId, userId],
      );
      return { success: true };
    });
  }

  /**
   * List all user groups in workspace
   */
  async listGroups(workspaceId: string): Promise<UserGroupEntity[]> {
    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      const res = await client.query<UserGroupEntity>(
        `SELECT * FROM user_groups WHERE workspace_id = $1 ORDER BY name ASC;`,
        [workspaceId],
      );
      return res.rows;
    });
  }

  /**
   * Get user IDs belonging to a group handle
   */
  async resolveGroupMentions(workspaceId: string, handle: string): Promise<string[]> {
    const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;

    return this.db.executeWithTenantContext(workspaceId, async (client) => {
      const res = await client.query<{ user_id: string }>(
        `SELECT ugm.user_id
         FROM user_group_members ugm
         JOIN user_groups ug ON ug.id = ugm.group_id
         WHERE ug.workspace_id = $1 AND ug.handle = $2;`,
        [workspaceId, cleanHandle],
      );
      return res.rows.map((r) => r.user_id);
    });
  }
}
