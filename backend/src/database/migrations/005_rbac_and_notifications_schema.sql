-- =============================================================================
-- NexusHub Database Migration 005: Granular RBAC, User Groups & Multi-Channel Notifications
-- Platform: Supabase PostgreSQL / PostgreSQL 13+
-- Document Reference: nexus-action-plan.md (Tasks 2.1 & 2.2)
-- =============================================================================

-- 1. User Groups Table
CREATE TABLE IF NOT EXISTS user_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    handle VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_group_handle_per_workspace UNIQUE (workspace_id, handle)
);

CREATE INDEX IF NOT EXISTS idx_user_groups_workspace ON user_groups(workspace_id);

-- 2. User Group Memberships Table
CREATE TABLE IF NOT EXISTS user_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_in_group UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_group_members_group ON user_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_user_group_members_user ON user_group_members(workspace_id, user_id);

-- 3. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'MENTION', 'DIRECT_MESSAGE', 'KEYWORD_MATCH', 'SYSTEM'
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(workspace_id, user_id, is_read, created_at);

-- 4. Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_mutes JSONB DEFAULT '[]'::jsonb,
    keywords TEXT[] DEFAULT '{}'::text[],
    dnd_start VARCHAR(5), -- '22:00'
    dnd_end VARCHAR(5),   -- '08:00'
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workspace_id, user_id)
);

-- Row Level Security (RLS) Policies
ALTER TABLE user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_groups FORCE ROW LEVEL SECURITY;

ALTER TABLE user_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_group_members FORCE ROW LEVEL SECURITY;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences FORCE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS user_groups_tenant_isolation ON user_groups;
CREATE POLICY user_groups_tenant_isolation ON user_groups
    FOR ALL
    USING (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid)
    WITH CHECK (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid);

DROP POLICY IF EXISTS user_group_members_tenant_isolation ON user_group_members;
CREATE POLICY user_group_members_tenant_isolation ON user_group_members
    FOR ALL
    USING (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid)
    WITH CHECK (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid);

DROP POLICY IF EXISTS notifications_tenant_isolation ON notifications;
CREATE POLICY notifications_tenant_isolation ON notifications
    FOR ALL
    USING (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid)
    WITH CHECK (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid);

DROP POLICY IF EXISTS notification_preferences_tenant_isolation ON notification_preferences;
CREATE POLICY notification_preferences_tenant_isolation ON notification_preferences
    FOR ALL
    USING (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid)
    WITH CHECK (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid);
