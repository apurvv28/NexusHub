import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface AIBudget {
  workspaceId: string;
  dailyBudgetCents: number;
  maxTokensPerMinute: number;
  usedCostCentsToday: number;
  usedTokensToday: number;
  isCircuitBroken: boolean;
  lastResetAt: Date;
}

export interface AIUsageAnalytics {
  workspaceId: string;
  totalTokensToday: number;
  totalCostCentsToday: number;
  dailyBudgetCents: number;
  isCircuitBroken: boolean;
  featureBreakdown: {
    askAi: { tokens: number; costCents: number; count: number };
    summarize: { tokens: number; costCents: number; count: number };
    compose: { tokens: number; costCents: number; count: number };
  };
  recentLogs: Array<{
    id: string;
    userId: string;
    feature: string;
    tokensUsed: number;
    costCents: number;
    createdAt: string;
  }>;
}

@Injectable()
export class AICostGovernorService {
  private readonly logger = new Logger(AICostGovernorService.name);

  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Evaluates AI budget, enforces Token Bucket / Circuit Breaker, and records token consumption.
   * Throws HTTP 429 (Too Many Requests) if budget cap is reached or circuit is broken.
   */
  async checkAndConsumeBudget(
    workspaceId: string,
    userId: string,
    feature: 'ask_ai' | 'summarize' | 'compose',
    estimatedTokens: number = 250,
    estimatedCostCents: number = 1,
  ): Promise<void> {
    const budget = await this.getOrCreateBudget(workspaceId);

    // 1. Check for Daily Reset (UTC)
    const now = new Date();
    const lastReset = new Date(budget.lastResetAt);
    const isNewDay =
      now.getUTCFullYear() !== lastReset.getUTCFullYear() ||
      now.getUTCMonth() !== lastReset.getUTCMonth() ||
      now.getUTCDate() !== lastReset.getUTCDate();

    if (isNewDay) {
      await this.resetDailyBudget(workspaceId);
      budget.usedCostCentsToday = 0;
      budget.usedTokensToday = 0;
      budget.isCircuitBroken = false;
    }

    // 2. Circuit Breaker & Hard Cap Enforcement
    if (budget.isCircuitBroken || budget.usedCostCentsToday + estimatedCostCents > budget.dailyBudgetCents) {
      if (!budget.isCircuitBroken) {
        await this.dbService.query(
          `UPDATE workspace_ai_budgets SET is_circuit_broken = TRUE, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = $1`,
          [workspaceId],
        );
      }
      this.logger.warn(
        `[Circuit Breaker] AI request rejected for workspace ${workspaceId}. Daily budget cap of ${budget.dailyBudgetCents} cents reached (used: ${budget.usedCostCentsToday} cents).`,
      );
      throw new HttpException(
        'Workspace daily AI budget cap exceeded. AI features are temporarily throttled.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 3. Record Token & Cost Consumption
    const newUsedCost = budget.usedCostCentsToday + estimatedCostCents;
    const newUsedTokens = budget.usedTokensToday + estimatedTokens;

    await this.dbService.query(
      `UPDATE workspace_ai_budgets 
       SET used_cost_cents_today = $1, used_tokens_today = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE workspace_id = $3`,
      [newUsedCost, newUsedTokens, workspaceId],
    );

    // 4. Audit Log AI Usage
    await this.dbService.query(
      `INSERT INTO ai_usage_logs (workspace_id, user_id, feature, tokens_used, cost_cents)
       VALUES ($1, $2, $3, $4, $5)`,
      [workspaceId, userId, feature, estimatedTokens, estimatedCostCents],
    );

    this.logger.log(
      `[AI Governor] Consumed ${estimatedTokens} tokens (${estimatedCostCents} cents) for feature '${feature}' in workspace ${workspaceId}. Used today: ${newUsedCost}/${budget.dailyBudgetCents} cents.`,
    );
  }

  /**
   * Retrieves or initializes default budget for a workspace.
   */
  async getOrCreateBudget(workspaceId: string): Promise<AIBudget> {
    const res = await this.dbService.query(
      `SELECT workspace_id, daily_budget_cents, max_tokens_per_minute, used_cost_cents_today, used_tokens_today, is_circuit_broken, last_reset_at
       FROM workspace_ai_budgets WHERE workspace_id = $1`,
      [workspaceId],
    );

    if (res.rows.length > 0) {
      const row = res.rows[0];
      return {
        workspaceId: row.workspace_id,
        dailyBudgetCents: parseInt(row.daily_budget_cents, 10),
        maxTokensPerMinute: parseInt(row.max_tokens_per_minute, 10),
        usedCostCentsToday: parseInt(row.used_cost_cents_today, 10),
        usedTokensToday: parseInt(row.used_tokens_today, 10),
        isCircuitBroken: Boolean(row.is_circuit_broken),
        lastResetAt: new Date(row.last_reset_at),
      };
    }

    // Default Budget Creation ($50.00 / day = 5000 cents)
    const initRes = await this.dbService.query(
      `INSERT INTO workspace_ai_budgets (workspace_id, daily_budget_cents, max_tokens_per_minute, used_cost_cents_today, used_tokens_today, is_circuit_broken)
       VALUES ($1, 5000, 10000, 0, 0, FALSE)
       RETURNING workspace_id, daily_budget_cents, max_tokens_per_minute, used_cost_cents_today, used_tokens_today, is_circuit_broken, last_reset_at`,
      [workspaceId],
    );

    const row = initRes.rows[0];
    return {
      workspaceId: row.workspace_id,
      dailyBudgetCents: parseInt(row.daily_budget_cents, 10),
      maxTokensPerMinute: parseInt(row.max_tokens_per_minute, 10),
      usedCostCentsToday: parseInt(row.used_cost_cents_today, 10),
      usedTokensToday: parseInt(row.used_tokens_today, 10),
      isCircuitBroken: Boolean(row.is_circuit_broken),
      lastResetAt: new Date(row.last_reset_at),
    };
  }

  /**
   * Resets daily counters for a workspace.
   */
  async resetDailyBudget(workspaceId: string): Promise<void> {
    await this.dbService.query(
      `UPDATE workspace_ai_budgets
       SET used_cost_cents_today = 0, used_tokens_today = 0, is_circuit_broken = FALSE, last_reset_at = CURRENT_TIMESTAMP
       WHERE workspace_id = $1`,
      [workspaceId],
    );
    this.logger.log(`[AI Governor] Reset daily budget counters for workspace ${workspaceId}.`);
  }

  /**
   * Updates workspace budget settings (Workspace Admin dashboard endpoint).
   */
  async updateBudgetSettings(
    workspaceId: string,
    dailyBudgetCents?: number,
    maxTokensPerMinute?: number,
    resetCircuitBreaker?: boolean,
  ): Promise<AIBudget> {
    await this.getOrCreateBudget(workspaceId);

    if (dailyBudgetCents !== undefined) {
      await this.dbService.query(
        `UPDATE workspace_ai_budgets SET daily_budget_cents = $1, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = $2`,
        [dailyBudgetCents, workspaceId],
      );
    }

    if (maxTokensPerMinute !== undefined) {
      await this.dbService.query(
        `UPDATE workspace_ai_budgets SET max_tokens_per_minute = $1, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = $2`,
        [maxTokensPerMinute, workspaceId],
      );
    }

    if (resetCircuitBreaker) {
      await this.resetDailyBudget(workspaceId);
    }

    return this.getOrCreateBudget(workspaceId);
  }

  /**
   * Generates AI usage analytics for Workspace Admin Dashboard.
   */
  async getUsageAnalytics(workspaceId: string): Promise<AIUsageAnalytics> {
    const budget = await this.getOrCreateBudget(workspaceId);

    const logsRes = await this.dbService.query(
      `SELECT id, user_id, feature, tokens_used, cost_cents, created_at
       FROM ai_usage_logs
       WHERE workspace_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [workspaceId],
    );

    const breakdown = {
      askAi: { tokens: 0, costCents: 0, count: 0 },
      summarize: { tokens: 0, costCents: 0, count: 0 },
      compose: { tokens: 0, costCents: 0, count: 0 },
    };

    for (const log of logsRes.rows) {
      const feature = log.feature as string;
      const tokens = parseInt(log.tokens_used, 10);
      const cost = parseInt(log.cost_cents, 10);

      if (feature === 'ask_ai') {
        breakdown.askAi.tokens += tokens;
        breakdown.askAi.costCents += cost;
        breakdown.askAi.count += 1;
      } else if (feature === 'summarize') {
        breakdown.summarize.tokens += tokens;
        breakdown.summarize.costCents += cost;
        breakdown.summarize.count += 1;
      } else if (feature === 'compose') {
        breakdown.compose.tokens += tokens;
        breakdown.compose.costCents += cost;
        breakdown.compose.count += 1;
      }
    }

    return {
      workspaceId,
      totalTokensToday: budget.usedTokensToday,
      totalCostCentsToday: budget.usedCostCentsToday,
      dailyBudgetCents: budget.dailyBudgetCents,
      isCircuitBroken: budget.isCircuitBroken,
      featureBreakdown: breakdown,
      recentLogs: logsRes.rows.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        feature: r.feature,
        tokensUsed: parseInt(r.tokens_used, 10),
        costCents: parseInt(r.cost_cents, 10),
        createdAt: new Date(r.created_at).toISOString(),
      })),
    };
  }
}
