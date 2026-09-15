# ADR 0006: Enterprise SSO, SCIM 2.0 Provisioning & Compliance Audit Logging Strategy

- **Status**: Accepted
- **Date**: 2026-09-15
- **Authors**: NexusHub Architecture Team
- **Deciders**: Tech Lead, Security Architect, Compliance Officer

---

## Context & Problem Statement

Phase 5 requires NexusHub to achieve Enterprise Readiness by supporting SAML 2.0 / OIDC Single Sign-On (SSO) with enterprise Identity Providers (Okta, Azure AD, Ping Identity), SCIM 2.0 automated user provisioning/deprovisioning (RFC 7643 / RFC 7644), immutable compliance audit logging streamed to SIEM exporters (Splunk, Datadog, Sumo Logic), and automated message retention policy execution with Legal Hold override protection.

Without standardized enterprise identity federation and compliance audit trails, enterprise customers cannot enforce centralized IAM access policies or satisfy regulatory compliance frameworks (SOC 2, HIPAA, GDPR).

---

## Decision Drivers

1. **Enterprise Identity Standards**: Full support for SAML 2.0 assertions and OIDC bearer tokens mapped directly to `workspace_id` tenant boundaries.
2. **Standardized SCIM 2.0 REST Protocol**: Direct compliance with RFC 7643 (Core Schema) and RFC 7644 (Protocol) for `/scim/v2/Users` and `/scim/v2/Groups` REST endpoints.
3. **SIEM Export Streaming**: Real-time structured audit log formatting (CEF/JSON) routed to Amazon Kinesis Firehose / S3 / CloudWatch / Splunk.
4. **Data Retention & Legal Hold Governance**: Automated channel message TTL purging (e.g. 90-day retention) with strict override logic preventing data deletion for channels under active Legal Hold.
5. **CAP Theorem & Tenant Isolation**: Audit log queries and SCIM endpoints MUST be strictly scoped by `workspace_id`. Audit log write paths must maintain **CP** consistency guarantees for audit trail compliance.

---

## Decision Outcome

We select the **Modular Enterprise SSO, SCIM 2.0 Engine & Compliance Audit Logging Architecture** integrated into NestJS application controllers and background retention workers.

### Implementation Specifics

1. **Enterprise SSO Module**:
   - `EnterpriseSSOService` handles SAML 2.0 XML assertion parsing, signature validation, and OIDC discovery.
   - Maps IdP tenant domains to NexusHub `workspace_id` contexts.
2. **SCIM 2.0 API**:
   - `SCIMController` implements `/scim/v2/Users` and `/scim/v2/Groups`.
   - Instant deprovisioning (`"active": false`) revokes active JWT session tokens immediately.
3. **Structured Audit Engine & SIEM Exporter**:
   - `AuditLogService` records all authentication attempts, role changes, configuration updates, and data exports.
   - `SIEMExporterService` formats logs into CEF/LEEF/JSON and streams to external SIEM connectors.
4. **Message Retention & Legal Hold Worker**:
   - `RetentionWorkerService` runs scheduled background cleanup jobs, deleting expired messages while respecting `legal_hold_active = true` flags.

---

## CAP Theorem & Architectural Trade-offs

- **CAP Choice**: **CP (Consistency + Partition Tolerance)** for audit log creation and Legal Hold enforcement.
- **Rationale**: Compliance audit records and Legal Hold status cannot be eventually consistent or lost during network partitions; missing an audit log or illegally purging a legal hold message creates severe legal liability.

---

## Consequences & Validation

### Positive
- Turnkey integration with Okta, Azure AD, and Ping Identity.
- Automatic SCIM user lifecycle synchronization.
- Complete observability & SIEM audit stream compliance.

### Negative / Mitigation
- Increased log storage footprint. *Mitigation*: Configure S3 lifecycle rules moving raw Firehose audit streams to S3 Glacier after 30 days.
