# ADR 0001: Multi-Tenancy Architecture & Row-Level Security (RLS) Strategy via Supabase PostgreSQL

- **Status**: Accepted
- **Date**: 2026-09-14
- **Authors**: NexusHub Architecture Team
- **Deciders**: Tech Lead, Security Architect, Engineering Team

---

## Context & Problem Statement

NexusHub is a multi-tenant B2B team collaboration platform designed to serve teams ranging from 10 to 5,000+ seats. Multi-tenant SaaS architectures carry a fundamental security requirement: **zero cross-tenant data leakage under any failure condition**. 

In conventional application-level multi-tenancy models (e.g. appending `WHERE workspace_id = $1` manually in application ORM/SQL queries), developer oversight or a missing filter in an edge-case endpoint can immediately expose one organization's private channels or messages to another tenant. 

We need a database and application architecture that enforces strict tenant boundaries at the database layer while scaling efficiently across thousands of workspaces.

---

## Decision Drivers

1. **Security & Non-Negotiables**: Tenant isolation MUST be enforced at the database engine layer (defense in depth), not relying solely on application-level code compliance.
2. **Operational & Cost Efficiency**: Ability to host thousands of small-to-mid-size workspace tenants on a shared PostgreSQL cluster without per-tenant schema proliferation overhead.
3. **Managed Cloud Infrastructure & Realtime Ecosystem**: Using **Supabase PostgreSQL**, providing native Row Level Security (RLS), high-throughput connection pooling (Supavisor / PgBouncer), and built-in audit logging.
4. **Enterprise Graduation Path**: Ability to migrate large enterprise tenants from a shared pool to a dedicated schema or database instance (pool $\rightarrow$ bridge $\rightarrow$ silo model) without rewriting domain application logic.
5. **CAP Theorem Requirements**: Primary database (Supabase PostgreSQL) MUST maintain strict Consistency and Partition Tolerance (**CP**) for permissions, channel memberships, and message records.

---

## Considered Alternatives

1. **Database-per-Tenant (Silo Model)**
   - *Pros*: Maximum physical isolation; backup/restore per tenant is straightforward.
   - *Cons*: Extremely high cost per tenant; slow connection pool management; difficult schema migration management across 10,000+ databases.
2. **Schema-per-Tenant (Bridge Model)**
   - *Pros*: Logical isolation per tenant schema within a single DB instance.
   - *Cons*: Postgres DDL overhead (table limits, migration slowdowns when executing 10k migrations in parallel); connection pooling complexity.
3. **Shared Database + Discriminator Column + Row-Level Security (RLS) on Supabase PostgreSQL (Pool Model)** $\leftarrow$ **SELECTED**
   - *Pros*: Highly efficient resource utilization; instantaneous workspace provisioning; database-level security policy enforcement independent of application layer code bugs; native integration with Supabase connection pooling and auth extensions.

---

## Decision Outcome

We select the **Shared Database + Row-Level Security (RLS) Pool Model on Supabase PostgreSQL** as the default multi-tenancy architecture for NexusHub, with built-in capability for enterprise pool-to-silo graduation.

### Implementation Specifics

1. **Schema Discriminator**: Every tenant-scoped table (`workspaces`, `workspace_memberships`, `channels`, `messages`, `attachments`, `threads`, `reactions`) MUST contain a non-null `workspace_id UUID` column.
2. **Database Engine Enforcement**:
   ```sql
   ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
   ALTER TABLE <table_name> FORCE ROW LEVEL SECURITY;
   ```
   *Note: `FORCE ROW LEVEL SECURITY` ensures that table owners and admin roles are also subject to RLS policies.*

3. **Tenant Context Session Variable**:
   Application database connection interceptors execute a lightweight session setting upon checking out a connection from the pool:
   ```sql
   SET LOCAL app.current_workspace_id = '<workspace_uuid>';
   ```
4. **RLS Policy Standard**:
   ```sql
   CREATE POLICY <table_name>_tenant_isolation ON <table_name>
       FOR ALL
       USING (
           workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid
       )
       WITH CHECK (
           workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid
       );
   ```

---

## CAP Theorem & Architectural Trade-offs

- **CAP Choice**: **CP (Consistency + Partition Tolerance)** for Supabase PostgreSQL.
- **Rationale**: Channel access controls, workspace memberships, and message logs cannot be eventually consistent. Stale authorization data leading to revoked user access taking seconds to apply is unacceptable.
- **Trade-off Enforcement**: AP components (Redis for presence, OpenSearch for search indexing, Vector Store for RAG) MUST NOT block or participate in the synchronous PostgreSQL write path for core messaging and authorization.

---

## Consequences & Validation

### Positive
- **Guaranteed Isolation**: An application query missing a `WHERE workspace_id = ...` clause WILL NOT return data from other tenants because Postgres RLS filters rows at the engine execution layer.
- **Fast Provisioning**: Creating a new workspace requires inserting a row, not executing DDL migrations.
- **Automated Verification**: Automated CI/CD integration tests execute query fuzzing across alternating `app.current_workspace_id` settings to ensure 100% pass rate.

### Negative / Mitigation
- **Connection Overhead**: Require NestJS database interceptor to reliably issue `SET LOCAL` per transaction. *Mitigation*: Encapsulated in standard database connection middleware/interceptor and managed via Supabase Supavisor pooler.
