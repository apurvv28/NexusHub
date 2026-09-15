# ADR-0008: WebSocket Gateway Connection Sharding & Mobile Push Notification Architecture

- **Status**: Accepted
- **Date**: 2026-09-15
- **Deciders**: Principal Infrastructure Architect, Mobile Lead, Engineering Team

---

## Context & Problem Statement

NexusHub requires massive horizontal scalability for real-time bidirectional communication while delivering instant push notifications across mobile clients (iOS and Android).

1. **WebSocket Connection Scale**: As active concurrent enterprise users grow beyond 100,000, single-node WebSocket servers face memory (file descriptor / socket buffer limits) and CPU bottlenecks during broadcast fan-out.
2. **Sticky Routing vs Stateful Connections**: WebSocket connections are stateful. Load balancers must route messages to the exact gateway instance holding a user's active socket without introducing single points of failure or high cross-pod IPC overhead.
3. **Mobile Push Notification Reliability**: Mobile operating systems terminate background WebSocket connections to preserve battery. Instant message alerts require low-latency push notifications via Apple Push Notification service (APNs) and Firebase Cloud Messaging (FCM v1) with deep-link navigation payloads.

---

## Decision Drivers

- Sustain 100,000 concurrent active WebSocket connections with $p_{95}$ latency $< 200\text{ms}$.
- Minimize cross-gateway inter-process communication (IPC) fan-out by using a **Consistent Hash Ring** for socket placement.
- Support dual APNs (HTTP/2 Provider API) and FCM v1 (OAuth 2.0 REST API) with standardized deep-link payloads (`nexushub://channel/:channelId/thread/:threadId`).
- Maintain strict multi-tenant row-level security and tenant isolation across sharded socket gateways.

---

## Technical Architecture & Design

### 1. Consistent Hash Ring Connection Sharding

```
                     +----------------------------------+
                     |        AWS Network Load          |
                     |         Balancer (NLB)           |
                     +----------------------------------+
                                      |
                     +----------------------------------+
                     |   Consistent Hash Ring Router    |
                     |  (100 Virtual Nodes per Gateway) |
                     +----------------------------------+
                      /               |                \
                     /                |                 \
    +-------------------+   +-------------------+   +-------------------+
    | WS Gateway Node A |   | WS Gateway Node B |   | WS Gateway Node C |
    | (33,333 Sockets)  |   | (33,333 Sockets)  |   | (33,334 Sockets)  |
    +-------------------+   +-------------------+   +-------------------+
```

- **Hash Key Formula**: $\text{Hash}( \text{workspaceId} \mathbin{\Vert} \text{userId} ) \pmod{2^{32}}$
- **Virtual Node Replica Count**: 100 virtual nodes per gateway server instance to ensure uniform distribution and minimal re-sharding impact when scaling out ECS Fargate tasks.
- **Failover & Re-balancing**: If a gateway node terminates, only $\frac{1}{N}$ of active socket connections are re-hashed to adjacent nodes in the ring.

### 2. APNs & FCM Mobile Push Delivery Pipeline

```
+------------------+    (Event: New Message)    +---------------------+
| Message Controller | ------------------------> | Mobile Push Gateway |
+------------------+                            +---------------------+
                                                   /               \
                                                  /                 \
                                   +-------------------+   +-------------------+
                                   | APNs HTTP/2 (iOS) |   | FCM v1 (Android)  |
                                   +-------------------+   +-------------------+
                                             |                       |
                                   +-------------------------------------------+
                                   | Deep Link: nexushub://channel/:cId/thread |
                                   +-------------------------------------------+
```

---

## Consequences & Mitigations

| Risk | Mitigation |
|---|---|
| Gateway Task Failover Spike | Redis pub/sub cluster handles transient socket re-connection handshake gracefully. |
| APNs / FCM Invalid Device Tokens | Push service auto-prunes expired/unregistered tokens (`UNREGISTERED` error handling). |
| Cross-Tenant Push Leakage | Device tokens strictly bound to `(workspaceId, userId)` composite key. |

---

## Compliance & Verification Matrix

- **Load Testing**: k6 distributed performance test verifying 100,000 concurrent sockets and 10,000 msg/sec throughput.
- **SLA**: $p_{95}$ socket message propagation delay $< 200\text{ms}$.
