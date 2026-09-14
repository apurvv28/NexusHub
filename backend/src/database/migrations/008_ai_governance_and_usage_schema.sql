-- =============================================================================
-- NexusHub Database Migration 008: AI Governance & Usage Analytics Schema
-- Platform: Supabase PostgreSQL / PostgreSQL 13+
-- Document Reference: nexus-action-plan.md (Task 3.5)
-- =============================================================================

-- 1. Workspace AI Budgets & Circuit Breaker Table
CREATE TABLE IF NOT EXISTS workspace_ai_budgets (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    daily_budget_cents INTEGER NOT NULL DEFAULT 5000, -- Default $50.00 / day cap
    max_tokens_per_minute INTEGER NOT NULL DEFAULT 10000,
    used_cost_cents_today INTEGER NOT NULL DEFAULT 0,
    used_tokens_today INTEGER NOT NULL DEFAULT 0,
    is_circuit_broken BOOLEAN NOT NULL DEFAULT FALSE,
    last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. AI Usage Logs Table (Per feature token spending tracking)
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature VARCHAR(50) NOT NULL, -- 'ask_ai', 'summarize', 'compose'
    tokens_used INTEGER NOT NULL DEFAULT 0,
    cost_cents INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_workspace ON ai_usage_logs(workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature ON ai_usage_logs(workspace_id, feature);

-- Row Level Security (RLS) Policies
ALTER TABLE workspace_ai_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_ai_budgets FORCE ROW LEVEL SECURITY;

ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_ai_budgets_tenant_isolation ON workspace_ai_budgets;
CREATE POLICY workspace_ai_budgets_tenant_isolation ON workspace_ai_budgets
    FOR ALL
    USING (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid)
    WITH CHECK (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid);

DROP POLICY IF EXISTS ai_usage_logs_tenant_isolation ON ai_usage_logs;
CREATE POLICY ai_usage_logs_tenant_isolation ON ai_usage_logs
    FOR ALL
    USING (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid)
    WITH CHECK (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid);
