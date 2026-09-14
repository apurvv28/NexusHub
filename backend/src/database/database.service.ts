import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;
  private readonly logger = new Logger(DatabaseService.name);

  onModuleInit() {
    const connectionString = process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/nexushub';
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    this.logger.log('DatabaseService connection pool initialized.');
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('DatabaseService connection pool closed.');
    }
  }

  /**
   * Execute a query under strict tenant RLS context (SET LOCAL app.current_workspace_id)
   */
  async executeWithTenantContext<T = any>(
    workspaceId: string,
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN;');
      await client.query('SELECT set_config($1, $2, true);', ['app.current_workspace_id', workspaceId]);
      const result = await operation(client);
      await client.query('COMMIT;');
      return result;
    } catch (error) {
      await client.query('ROLLBACK;');
      this.logger.error(`Error executing tenant transaction for workspace ${workspaceId}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Direct pool query helper
   */
  async query<R extends QueryResultRow = any>(
    text: string,
    params?: any[],
  ): Promise<QueryResult<R>> {
    return this.pool.query<R>(text, params);
  }
}
