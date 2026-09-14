-- =============================================================================
-- NexusHub Database Migration 004: Postgres Full-Text Search Vector & Indexing
-- Platform: Supabase PostgreSQL / PostgreSQL 13+
-- Document Reference: nexus-action-plan.md (Task 1.6)
-- =============================================================================

-- 1. Add stored search_vector column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

-- 2. Create GIN index on search_vector for fast keyword matching
CREATE INDEX IF NOT EXISTS idx_messages_search_vector ON messages USING GIN(search_vector);
