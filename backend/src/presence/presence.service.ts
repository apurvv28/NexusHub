import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export type UserStatus = 'online' | 'away' | 'dnd' | 'offline';

@Injectable()
export class PresenceService implements OnModuleInit, OnModuleDestroy {
  private redisClient!: Redis;
  private readonly logger = new Logger(PresenceService.name);
  private readonly DEFAULT_TTL_SECONDS = 5;

  onModuleInit() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = Number(process.env.REDIS_PORT) || 6379;
    const password = process.env.REDIS_PASSWORD || undefined;

    this.redisClient = new Redis({
      host,
      port,
      password,
      lazyConnect: true,
      retryStrategy: () => null, // Suppress unhandled retry loops in offline dev environment
    });

    this.redisClient.connect().catch((err) => {
      this.logger.warn(`Redis connection unavailable for presence tracking (degraded mode): ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit().catch(() => null);
    }
  }

  /**
   * Set user presence with automatic 5-second TTL expiration (AP data store)
   */
  async setHeartbeat(workspaceId: string, userId: string, status: UserStatus = 'online'): Promise<void> {
    const key = `workspace:${workspaceId}:user:${userId}:presence`;
    try {
      if (this.redisClient.status === 'ready') {
        await this.redisClient.set(key, status, 'EX', this.DEFAULT_TTL_SECONDS);
      }
    } catch (err) {
      this.logger.warn(`Failed to update presence key ${key} in Redis: ${(err as Error).message}`);
    }
  }

  /**
   * Fetch current presence status
   */
  async getUserPresence(workspaceId: string, userId: string): Promise<UserStatus> {
    const key = `workspace:${workspaceId}:user:${userId}:presence`;
    try {
      if (this.redisClient.status === 'ready') {
        const val = await this.redisClient.get(key);
        return (val as UserStatus) || 'offline';
      }
    } catch (err) {
      this.logger.warn(`Failed to fetch presence key ${key}: ${(err as Error).message}`);
    }
    return 'offline';
  }
}
