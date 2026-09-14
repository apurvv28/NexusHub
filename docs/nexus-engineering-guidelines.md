# NexusHub — Engineering Guidelines & Feature Development Checklist

> Read this before writing a single line of code for any feature. This is the contract between "it works on my machine" and "it survives production at multi-tenant scale."

---

## 1. Purpose

Every feature — whether it's a new API endpoint, a UI component, a DB migration, or an AI pipeline step — must be built with these considerations front-of-mind, not retrofitted. This doc exists so that any agent (human or AI) picking up a ticket has one place to check itself against before opening a PR.

---

## 2. Pre-Build Checklist (Ask These Before Writing Code)

- [ ] **Which tenant boundary does this touch?** Does the feature read/write data scoped by `workspace_id`? Is tenant isolation enforced at the query layer (RLS), not just the application layer?
- [ ] **What's the failure mode?** If this feature's dependency (DB, cache, AI API, queue) goes down, does the rest of the app degrade gracefully or does it cascade?
- [ ] **Is this on the real-time critical path?** (message send, presence, typing) — if yes, latency budget and WS fan-out cost must be estimated before implementation.
- [ ] **Does this need an ADR (Architecture Decision Record)?** Any choice with long-term lock-in (new DB, new protocol, new third-party dependency) needs one — see Section 7.
- [ ] **What's the rollback plan?** Feature flag? DB migration reversible? Can this ship dark and be turned on gradually?
- [ ] **Does this introduce a new cross-service call?** If yes, define the contract (OpenAPI/proto/GraphQL schema) before implementation, not after.

---

## 3. SDLC + Agile Alignment

NexusHub follows a **hybrid model**: traditional SDLC gives the skeleton (predictable phases, documentation, sign-offs at the architecture/security level), Agile/Scrum governs the day-to-day execution inside each phase.

### 3.1 Traditional SDLC — Phase Gates (Apply at Epic/Release Level)
| Phase | Deliverable Required Before Moving On |
|---|---|
| Requirements | User story + acceptance criteria + non-functional requirements signed off |
| System Design (HLD) | Architecture diagram, data flow, tenancy impact reviewed |
| Detailed Design (LLD) | Schema/API contract, sequence diagrams for anything with >2 services involved |
| Implementation | Code + tests, following Section 5 (SOLID) and Section 8 (patterns) |
| Verification | Unit + integration + E2E tests pass, security scan clean, load test if on critical path |
| Deployment | Feature-flagged rollout, staged (internal → beta tenants → GA) |
| Maintenance | Monitoring dashboards exist, on-call runbook written before GA, not after an incident |

**Rule:** No feature skips System Design if it touches the tenancy model, auth, billing, or the real-time gateway. Small isolated features (a new settings toggle) can skip straight to Agile execution.

### 3.2 Agile Execution (Apply at Sprint Level)
- 2-week sprints, story-pointed backlog, groomed weekly
- Every story must have **explicit acceptance criteria** and **Definition of Done** including tests + docs + observability hooks — not just "code merged"
- Daily standups focus on blockers, not status theater
- Sprint review demos working software against acceptance criteria; sprint retro captures what to fix in process
- **Definition of Ready** before a story enters a sprint: tenancy impact known, design reviewed if it crossed the SDLC gate above, dependencies identified
- **Definition of Done**: tests written, code reviewed, feature-flagged, logged/traced, documented, deployed to staging

**Why hybrid, not pure Agile:** A multi-tenant real-time system has failure modes (data leakage across tenants, WS scaling collapse) that are expensive to discover late. Pure "build fast, iterate" Agile without design gates is how tenant isolation bugs ship to production. Pure waterfall is too slow for a competitive SaaS market. Hybrid = design rigor where the blast radius is large, Agile speed everywhere else.

---

## 4. High-Level Design (HLD) Considerations

Before building any feature that spans services, document:
1. **Data flow diagram** — where does data originate, what services touch it, where does it land at rest
2. **Tenant isolation point** — where in this flow is `workspace_id` enforced (API layer? DB RLS? both — should always be both, defense in depth)
3. **Sync vs. async boundary** — does this need to happen in the request/response cycle, or can it be queued? (Prefer async for anything non-blocking: AI summarization, search indexing, notification fan-out)
4. **Scaling dimension** — does this feature scale with number of tenants, number of users per tenant, or message volume? Each has a different scaling strategy.
5. **Blast radius** — if this feature has a bug, what's the worst case? (One tenant's data corrupted? All tenants' WS connections drop? An AI job queue backs up?)

---

## 5. Low-Level Design (LLD) & SOLID Principles

Every service/module must be evaluated against SOLID before merge:

| Principle | What It Means Here | Concrete Example in NexusHub |
|---|---|---|
| **S** — Single Responsibility | A class/module has one reason to change | `MessageService` handles message CRUD only; summarization logic lives in `AISummarizationService`, not bolted onto `MessageService` |
| **O** — Open/Closed | Extend behavior without modifying existing code | New notification channels (Slack-style push vs. email vs. SMS) implement a `NotificationChannel` interface — adding SMS shouldn't touch existing email code |
| **L** — Liskov Substitution | Subtypes must be substitutable for their base type | Any `LLMProvider` implementation (Claude, GPT, self-hosted) must be swappable behind the same interface without breaking the RAG pipeline |
| **I** — Interface Segregation | No class forced to depend on methods it doesn't use | Split a fat `WorkspaceAdminService` into `MemberManagementService`, `BillingService`, `ComplianceService` — a billing consumer shouldn't need to know about member invites |
| **D** — Dependency Inversion | Depend on abstractions, not concrete implementations | The message gateway depends on a `PubSubAdapter` interface, not directly on `RedisClient` — enables swapping Redis for something else without touching business logic |

**Enforcement:** Code review checklist explicitly asks "does this violate SRP/OCP/etc.?" — not optional style preference, a merge-blocking check for core domain services (messaging, auth, tenancy, AI orchestration).

---

## 6. CAP Theorem — Explicit Trade-off Decisions

CAP theorem isn't abstract here — every data store in the stack made (or must make) an explicit choice, and every new feature touching that store must respect it.

| Component | CAP Choice | Rationale |
|---|---|---|
| **Postgres (system of record — messages, users, permissions)** | **CP** (Consistency + Partition tolerance, sacrifice some Availability during partition) | Message ordering, permissions, and billing data cannot be eventually consistent — a user removed from a channel must lose access immediately, not "eventually" |
| **Redis (presence, typing indicators, WS pub/sub)** | **AP** (Availability + Partition tolerance, sacrifice strict Consistency) | Stale typing indicator for 200ms is invisible to users; an unavailable presence service blocking message send is not acceptable |
| **OpenSearch (search index)** | **AP**, eventually consistent | Search index lag of a few seconds after message send is an acceptable trade for availability — never let search indexing block the message send path |
| **Vector store (RAG/AI context)** | **AP**, eventually consistent | AI answering with slightly stale context is fine; AI blocking core messaging is not |
| **DynamoDB (read receipts, heartbeats)** | **AP** | High write volume, ephemeral data, staleness tolerable |

**Rule for new features:** Before choosing a data store or caching strategy for a feature, explicitly state which side of CAP it needs and why. **Never let an AP-justified component (search, presence, AI) become a hard dependency of the CP-critical path (message send, auth, permission checks).** If a feature seems to need both strict consistency AND high availability, that's a signal to re-scope the feature, not to hope the trade-off doesn't matter.

---

## 7. Architecture Decision Records (ADRs)

Any decision that's expensive to reverse gets a short ADR (`/docs/adr/NNNN-title.md`) before implementation:
- Context (what problem forced this decision)
- Decision (what was chosen)
- Alternatives considered and why rejected
- Consequences (including CAP trade-offs and tenancy implications)

Triggers requiring an ADR: new datastore, new external dependency, change to the tenancy model, change to auth/permission model, anything affecting the real-time gateway's scaling strategy.

---

## 8. Design Patterns to Default To

| Problem | Pattern | Where It Applies |
|---|---|---|
| Multiple notification/storage/LLM backends | **Strategy / Adapter** | `LLMProvider`, `NotificationChannel`, `StorageAdapter` interfaces |
| Cross-service events (message sent → index, notify, AI-process) | **Event-driven / Pub-Sub** | EventBridge/Kafka domain events, not synchronous chained calls |
| Complex object construction (workspace provisioning: DB schema + default channels + roles) | **Builder / Saga** | Use a saga pattern for multi-step tenant provisioning with compensating actions on failure |
| Feature rollout control | **Feature Flag / Strangler Fig** | New features ship dark, old code paths strangled out gradually, never big-bang replaced |
| Rate limiting / AI cost control | **Circuit Breaker + Token Bucket** | Protect the system and tenant budgets from runaway AI job queues |
| Read-heavy channel/message listing | **CQRS** (light form) | Separate read models (denormalized channel list views) from the write path for hot endpoints |
| Repeated cross-cutting concerns (auth check, tenant scoping, logging) | **Middleware/Decorator** | NestJS interceptors/guards — never duplicate tenant-scoping logic per-endpoint |

**Anti-patterns to actively avoid:**
- God services (one service owning messaging + auth + billing)
- Synchronous chains across >2 services in the request path (use events/queues instead)
- Tenant scoping done only in application code with no DB-level enforcement (RLS is mandatory, not optional)
- Silent fallback to a default tenant/workspace on missing context — fail loud, never fail open on tenant isolation

---

## 9. Non-Negotiables (Merge-Blocking, No Exceptions)

1. Every query touching tenant data has `workspace_id` scoping enforced at the DB layer (RLS), verified by an automated cross-tenant-leak test.
2. Every new service class is evaluated against SRP before merge — if a PR adds a second unrelated responsibility to an existing class, it gets split.
3. Every new data store/cache decision states its CAP trade-off in the PR description or a linked ADR.
4. No feature on the message-send critical path may have a hard synchronous dependency on an AP-classified component (search, AI, presence).
5. Every externally-facing contract (REST/GraphQL/webhook) is documented before the consuming client is built against it.
6. Security: no secrets in code, all AI/LLM calls tenant-rate-limited and cost-governed, all audit-relevant actions logged.

---

## 10. Definition of Done (Feature-Level Summary)

A feature is "done" only when:
- [ ] HLD reviewed (if it crossed a phase-gate trigger) and LLD documented for anything crossing >1 service
- [ ] SOLID check passed in code review
- [ ] CAP trade-off explicitly stated for any new data dependency
- [ ] Unit + integration tests written; E2E test added if user-facing flow
- [ ] Tenant isolation test added if the feature touches tenant data
- [ ] Feature-flagged and rollback plan documented
- [ ] Observability hooks added (logs/metrics/traces) — not bolted on after first incident
- [ ] Docs updated (API docs if public-facing, ADR if architecturally significant)
