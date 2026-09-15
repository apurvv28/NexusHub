# ADR-0009: Developer Platform, OAuth 2.0 & S3 Glacier Infrastructure Cost Optimization Architecture

- **Status**: Accepted
- **Date**: 2026-09-15
- **Deciders**: Principal Systems Architect, Lead Developer Advocate, DevOps Team

---

## Context & Problem Statement

NexusHub requires an extensible third-party ecosystem and optimized cloud infrastructure costs as tenant volume expands:

1. **Third-Party Application Integration**: Enterprise customers require custom bots, automated webhooks, and third-party workflow integrations without sharing user passwords or static API keys.
2. **OpenAPI Standardization**: External developers need self-documenting OpenAPI 3.0 REST & GraphQL specifications to build marketplace applications.
3. **Cloud Infrastructure Unit Economics**: Unoptimized compute tasks (AWS ECS Fargate vCPU/RAM) and persistent high-frequency media storage (S3 Standard) drive up cost-per-active-seat as message attachments and WebRTC transcripts accumulate over time.

---

## Decision Drivers

- Implement RFC 6749 compliant **OAuth 2.0 Authorization Server** supporting Authorization Code Grant with PKCE for user-facing apps and Client Credentials Grant for machine-to-machine bots.
- Enforce strict OAuth scopes (`read:messages`, `write:messages`, `admin:workspace`).
- Integrate **AWS Compute Optimizer** metrics to right-size compute allocations and quantify $\ge 25\%$ unit cost reduction per seat via Reserved Instances & Savings Plans.
- Implement automated **S3 Glacier Lifecycle Storage Tiering** migrating media attachments older than 90 days from `S3_STANDARD` to `S3_GLACIER_IR` (Glacier Instant Retrieval) and `DEEP_ARCHIVE`.

---

## Technical Architecture & Design

### 1. OAuth 2.0 Authorization & Scope Enforcement Pipeline

```
+--------------------+   1. GET /oauth/authorize   +------------------------+
| Third-Party Client | ---------------------------> | OAuth Auth Server      |
+--------------------+                              +------------------------+
          |                                                     |
          | 2. POST /oauth/token (with Code / Secret)          |
          +---------------------------------------------------->|
                                                                v
                                                    [ Issue Scoped JWT ]
                                                    - read:messages
                                                    - write:messages
```

### 2. S3 Glacier Lifecycle Storage Tiering Engine

```
[ S3 Standard Storage ] ---> (90 Days Inactivity) ---> [ S3 Glacier Instant Retrieval ]
                                                                  |
                                                          (365 Days Inactivity)
                                                                  v
                                                        [ S3 Deep Archive ]
```

---

## Compliance & Verification Matrix

- **OAuth Security**: PKCE challenge verification and short-lived access tokens (1 hour TTL) with refresh token rotation.
- **Cost Reduction**: AWS Compute Optimizer right-sizing engine demonstrating $\ge 25\%$ infrastructure cost reduction per seat.
- **Data Lifecycle**: S3 lifecycle worker safely updating storage tier flags while preserving signed download link accessibility.
