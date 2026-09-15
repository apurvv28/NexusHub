# ADR 0005: WebRTC SFU Media Infrastructure Selection & Real-Time Audio Transcription Strategy

- **Status**: Accepted
- **Date**: 2026-09-15
- **Authors**: NexusHub Architecture Team
- **Deciders**: Tech Lead, Infrastructure Lead, Real-Time Media Architect

---

## Context & Problem Statement

Phase 4 of NexusHub requires real-time WebRTC audio/video huddle functionality ("Slack Huddles parity") supporting up to 25+ concurrent active participants per room, screen sharing, spatial audio, live audio transcription streaming, and post-huddle automated AI recaps.

Peer-to-peer (Mesh) WebRTC requires $N \times (N-1)$ connections per client, which breaks down beyond 4-5 participants due to upload bandwidth and CPU constraints. Multipoint Control Units (MCU) transcode media on the server, introducing prohibitive server CPU costs and latency ($>300\text{ms}$).

We require a Selective Forwarding Unit (SFU) architecture that forwards encrypted media packets with minimal processing, low latency ($<150\text{ms}$), multi-region routing capability, real-time audio track extraction for live speech-to-text transcription, and post-huddle transcript aggregation into the AI summarization pipeline.

---

## Decision Drivers

1. **Low Latency & Bandwidth Efficiency**: Sub-150ms audio/video delivery with adaptive bitrates and dynamic layer selection (Simulcast/SVC).
2. **Tenant Isolation & Room Scoping**: Media sessions must be strictly scoped to `workspace_id` and `channel_id`, validated via cryptographically signed room join tokens.
3. **Live Audio Transcription Pipeline**: Ability to tap audio tracks for real-time speech-to-text processing (Amazon Transcribe / Whisper GPU) and stream live captions back to participants via WebSockets.
4. **Post-Huddle AI Meeting Recap**: Automatic aggregation of transcribed huddle dialogue upon room closure into `AISummarizationService` to auto-post meeting notes into the channel.
5. **CAP & Architectural Isolation**: WebRTC SFU media routing is AP (Availability + Partition Tolerance), operating ephemerally. Signal state and room metadata leverage NestJS WebSocket Gateway and Redis adapter. Media failure must never block text messaging or database transactions.

---

## Considered Alternatives

1. **Mesh WebRTC (Peer-to-Peer)**
   - *Pros*: Simple, no media server deployment required.
   - *Cons*: Severe bandwidth explosion; unviable for rooms $>4$ users.
2. **AWS Chime SDK / LiveKit SFU Cluster Architecture** $\leftarrow$ **SELECTED**
   - *Pros*: Scale up to 100+ concurrent active video/audio tracks per room, native Simulcast, spatial audio support, WebSockets signaling protocol, and direct audio track streaming hooks for real-time speech transcription.
   - *Cons*: Requires media server container scaling and WebSocket signaling gateway integration.

---

## Decision Outcome

We select **Selective Forwarding Unit (SFU) Gateway Architecture (LiveKit / AWS Chime SDK Adapter Model)** integrated with NestJS WebSocket Signaling Gateway and Amazon Transcribe / Whisper processing service.

### Implementation Specifics

1. **Signaling & Authorization Protocol**:
   - `HuddleGateway` handles room signaling (`huddle:join`, `huddle:offer`, `huddle:answer`, `huddle:ice-candidate`, `huddle:leave`, `huddle:mute-audio`, `huddle:toggle-video`, `huddle:screen-share`).
   - Access tokens are signed JWTs containing `workspace_id`, `channel_id`, `user_id`, and granted permissions (audio, video, screen-share).
2. **Live Audio Transcription & Captions Pipeline**:
   - Audio tracks are streamed to `TranscriptionService` (simulated/integrated Amazon Transcribe engine).
   - Transcribed caption chunks are emitted in real-time over WebSocket via `huddle:caption` events to room subscribers.
3. **Automated Post-Huddle AI Meeting Recap**:
   - `HuddleRecapService` listens for `huddle:ended` events.
   - Aggregates room transcript log, invokes `AISummarizationService` for key decisions, action items, and structured summary, and auto-posts the formatted recap to the channel via `MessageService`.

---

## CAP Theorem & Architectural Trade-offs

- **CAP Choice**: **AP (Availability + Partition Tolerance)** for WebRTC media channels and audio streaming.
- **Rationale**: Media frames and live caption streams are ephemeral. Minor packet loss or temporary transcription delay must prioritize low latency and continuous availability over strict storage consistency.
- **Consistency Boundary**: Post-huddle meeting recaps persisted in PostgreSQL adhere strictly to **CP** system-of-record rules.

---

## Consequences & Validation

### Positive
- Sub-150ms media latency for 25+ concurrent users per room.
- Real-time accessibility through live subtitle captions.
- Zero manual effort needed to document meeting notes due to automated AI recaps.

### Negative / Mitigation
- Increased server bandwidth during video screen-share sessions. *Mitigation*: Dynamically scale bandwidth using Simulcast and default users to audio-first huddles.
