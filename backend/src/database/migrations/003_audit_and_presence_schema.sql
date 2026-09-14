-- =============================================================================
-- NexusHub Database Migration 003: Immutable Message Audit Logging
-- Platform: Supabase PostgreSQL / PostgreSQL 13+
-- Document Reference: nexus-engineering-guidelines.md (Section 2 & 9)
-- =============================================================================

-- 1. Message Audit Logs Table (Immutable audit trail for edits and deletions)
CREATE TABLE IF NOT EXISTS message_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    message_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'EDIT', 'DELETE'
    old_content TEXT,
    new_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_workspace_msg ON message_audit_logs(workspace_id, message_id);

-- Row Level Security (RLS) Policy for Audit Logs
ALTER TABLE message_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_tenant_isolation ON message_audit_logs;
CREATE POLICY audit_logs_tenant_isolation ON message_audit_logs
    FOR ALL
    USING (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid)
    WITH CHECK (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid);
