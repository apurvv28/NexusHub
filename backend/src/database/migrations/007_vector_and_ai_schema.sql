-- =============================================================================
-- NexusHub Database Migration 007: Vector Embeddings & Agentic AI RAG Schema
-- Platform: Supabase PostgreSQL / PostgreSQL 13+
-- Document Reference: nexus-action-plan.md (Tasks 3.1 & 3.2)
-- =============================================================================

-- 1. Vector Embeddings Table (Tenant-scoped message chunk embeddings)
CREATE TABLE IF NOT EXISTS vector_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    embedding JSONB NOT NULL, -- Normalized embedding vector float array representation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vector_embeddings_workspace ON vector_embeddings(workspace_id, message_id);

-- Row Level Security (RLS) Policies
ALTER TABLE vector_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vector_embeddings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vector_embeddings_tenant_isolation ON vector_embeddings;
CREATE POLICY vector_embeddings_tenant_isolation ON vector_embeddings
    FOR ALL
    USING (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid)
    WITH CHECK (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid);
