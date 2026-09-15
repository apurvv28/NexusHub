import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export type AuditCategory = 'auth' | 'rbac' | 'data_export' | 'sso' | 'admin' | 'security';

export interface AuditLogEntry {
  id: string;
  workspaceId: string;
  userId: string;
  action: string;
  category: AuditCategory;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  private auditLogs: Map<string, AuditLogEntry> = new Map();

  constructor(private readonly dbService?: DatabaseService) {}

  /**
   * Record a structured compliance audit event
   */
  async recordEvent(
    workspaceId: string,
    userId: string,
    action: string,
    category: AuditCategory = 'admin',
    ipAddress: string = '127.0.0.1',
    details?: Record<string, any>,
  ): Promise<AuditLogEntry> {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const entry: AuditLogEntry = {
      id,
      workspaceId,
      userId,
      action,
      category,
      ipAddress,
      details,
      timestamp: new Date(),
    };

    this.auditLogs.set(id, entry);
    this.logger.log(`[AuditLog] Workspace: ${workspaceId} | Category: ${category} | Action: ${action} | User: ${userId}`);

    // Persist to Postgres if dbService is present
    if (this.dbService) {
      try {
        await this.dbService.query(
          `INSERT INTO audit_logs (id, workspace_id, user_id, action, category, ip_address, details, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [id, workspaceId, userId, action, category, ipAddress, JSON.stringify(details || {})],
        );
      } catch (err: any) {
        this.logger.warn(`[AuditLog] Postgres insert skipped: ${err.message}`);
      }
    }

    return entry;
  }

  /**
   * Fetch audit logs for workspace (tenant-scoped)
   */
  async getAuditLogs(
    workspaceId: string,
    limit: number = 50,
    category?: AuditCategory,
  ): Promise<AuditLogEntry[]> {
    const list = Array.from(this.auditLogs.values())
      .filter((l) => l.workspaceId === workspaceId && (!category || l.category === category))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    return list;
  }
}
