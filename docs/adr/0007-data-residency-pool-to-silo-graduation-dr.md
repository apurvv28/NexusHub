# ADR 0007: Enterprise Multi-Region Data Residency, Pool-to-Silo Tenant Database Graduation & Disaster Recovery Strategy

- **Status**: Accepted
- **Date**: 2026-09-15
- **Authors**: NexusHub Architecture Team
- **Deciders**: Tech Lead, Security Architect, Infrastructure Architect

---

## Context & Problem Statement

As NexusHub scales to serve large enterprise tenants, two critical infrastructure requirements emerge:
1. **Data Residency Compliance**: Enterprise customers (especially in EU and APAC) mandate that database rows, S3 file attachments, and vector search embeddings reside strictly within designated geographic AWS regions (`us-east-1`, `eu-west-1`, `ap-southeast-1`).
2. **Tenant Database Graduation (Pool $\rightarrow$ Silo)**: High-volume enterprise tenants hosted on the shared PostgreSQL pool model require migration to dedicated Amazon Aurora database clusters (silo model) to prevent noisy neighbor bottlenecks and meet dedicated compliance isolation guarantees.
3. **Disaster Recovery (DR) & SOC2 Readiness**: Infrastructure must enforce KMS envelope encryption at rest, mTLS transit encryption, and cross-region Aurora replication achieving **Recovery Point Objective (RPO) $\le$ 15 minutes** and **Recovery Time Objective (RTO) $\le$ 1 hour**.

---

## Decision Drivers

1. **Multi-Region Data Residency**: Dynamic database, S3 bucket, and vector search namespace routing based on tenant region policy.
2. **Zero-Data-Loss Database Migration Saga**: Strangler Fig pattern for migrating a tenant from a shared database pool to a dedicated Aurora silo without losing write transactions or dropping active WebSocket connections.
3. **KMS Envelope Encryption & mTLS**: Envelope encryption using AWS KMS customer managed keys (CMK) and mutual TLS (mTLS) between internal services.
4. **Disaster Recovery SLA**: Cross-region replication ensuring **RPO $\le$ 15 minutes** and **RTO $\le$ 1 hour** verified through automated DR failover simulation drills.

---

## Decision Outcome

We select the **Multi-Region Routing, Pool-to-Silo Migration Saga & Automated DR Failover Engine** as the official architectural standard for NexusHub Phase 5.

### Implementation Specifics

1. **Multi-Region Storage Routing (`DataResidencyService`)**:
   - Assigns enterprise tenant data storage targets to designated AWS regions:
     - `us-east-1` (US East - N. Virginia)
     - `eu-west-1` (Europe - Ireland)
     - `ap-southeast-1` (Asia Pacific - Singapore)
2. **5-Step Database Graduation Saga (`TenantGraduationService`)**:
   - **Step 1**: Acquire tenant read-only lock (`isReadOnly = true`).
   - **Step 2**: Extract tenant-scoped database rows & schema snapshot from shared pool.
   - **Step 3**: Provision & populate dedicated Aurora database instance (`silo_aurora_cluster`).
   - **Step 4**: Update API gateway tenant database connection router lookup table.
   - **Step 5**: Execute zero-data-loss row checksum verification and release read-only lock (`isReadOnly = false`).
3. **Disaster Recovery & SOC2 Engine (`DisasterRecoveryService`)**:
   - Monitors Aurora cross-region replication lag.
   - Performs simulated DR failover drills and generates downloadable SOC2 Readiness Audit Reports.

---

## CAP Theorem & Architectural Trade-offs

- **CAP Choice**: **CP (Consistency + Partition Tolerance)** during tenant graduation and DR failover.
- **Rationale**: Temporary read-only lock during database graduation guarantees 100% data consistency and zero lost write transactions during pool-to-silo migration.

---

## Consequences & Validation

### Positive
- Full compliance with EU GDPR and APAC data sovereignty mandates.
- Seamless graduation path for high-growth enterprise tenants.
- Empirically verified RPO $\le$ 15 min and RTO $\le$ 1 hr DR readiness.

### Negative / Mitigation
- Brief read-only window during pool-to-silo migration step 2-3. *Mitigation*: Perform graduation during scheduled off-peak maintenance windows with user notification.
