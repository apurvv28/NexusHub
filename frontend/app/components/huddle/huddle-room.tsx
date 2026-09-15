"use client";

import React, { useState, useEffect } from "react";
import { HuddleControls } from "./huddle-controls";
import { LiveCaptions, CaptionItem } from "./live-captions";

export interface ParticipantUI {
  userId: string;
  userName: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  isSpeaking?: boolean;
}

interface HuddleRoomProps {
  huddleId: string;
  workspaceId: string;
  channelId: string;
  channelName?: string;
  currentUserId: string;
  currentUserName: string;
  initialParticipants?: ParticipantUI[];
  onEndHuddle?: (recap: any) => void;
}

export const HuddleRoom: React.FC<HuddleRoomProps> = ({
  huddleId,
  workspaceId,
  channelId,
  channelName = "general",
  currentUserId,
  currentUserName,
  initialParticipants = [],
}) => {
  const [participants, setParticipants] = useState<ParticipantUI[]>(
    initialParticipants.length > 0
      ? initialParticipants
      : [
          {
            userId: currentUserId,
            userName: currentUserName,
            isMuted: false,
            isVideoOn: true,
            isScreenSharing: false,
            isSpeaking: false,
          },
          {
            userId: "user_alex",
            userName: "Alex Rivers (Tech Lead)",
            isMuted: false,
            isVideoOn: true,
            isScreenSharing: false,
            isSpeaking: true,
          },
          {
            userId: "user_sarah",
            userName: "Sarah Chen (Architect)",
            isMuted: true,
            isVideoOn: false,
            isScreenSharing: false,
            isSpeaking: false,
          },
        ],
  );

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [captions, setCaptions] = useState<CaptionItem[]>([
    {
      speakerUserId: "user_alex",
      speakerName: "Alex Rivers (Tech Lead)",
      text: "Welcome team to the Phase 4 WebRTC architecture review.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [recapResult, setRecapResult] = useState<any | null>(null);
  const [huddleActive, setHuddleActive] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer tick
  useEffect(() => {
    if (!huddleActive) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [huddleActive]);

  const toggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    setParticipants((prev) =>
      prev.map((p) => (p.userId === currentUserId ? { ...p, isMuted: nextState } : p)),
    );
  };

  const toggleVideo = () => {
    const nextState = !isVideoOn;
    setIsVideoOn(nextState);
    setParticipants((prev) =>
      prev.map((p) => (p.userId === currentUserId ? { ...p, isVideoOn: nextState } : p)),
    );
  };

  const toggleScreenShare = () => {
    const nextState = !isScreenSharing;
    setIsScreenSharing(nextState);
    setParticipants((prev) =>
      prev.map((p) => (p.userId === currentUserId ? { ...p, isScreenSharing: nextState } : p)),
    );
  };

  const handleSendSpeechChunk = (text: string) => {
    const newCap: CaptionItem = {
      speakerUserId: currentUserId,
      speakerName: currentUserName,
      text,
      timestamp: new Date().toLocaleTimeString(),
    };
    setCaptions((prev) => [...prev, newCap]);

    // Set speaking indicator on current user temporarily
    setParticipants((prev) =>
      prev.map((p) => (p.userId === currentUserId ? { ...p, isSpeaking: true } : p)),
    );
    setTimeout(() => {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === currentUserId ? { ...p, isSpeaking: false } : p)),
      );
    }, 2500);
  };

  const handleLeaveHuddle = () => {
    setHuddleActive(false);

    // Build mock AI recap result upon huddle exit
    const mockRecap = {
      huddleId,
      workspaceId,
      channelId,
      durationSeconds: elapsedSeconds,
      participantCount: participants.length,
      recapMarkdown: `### 🎙️ Huddle Meeting Recap: #${channelName} Huddle
**Duration**: ${Math.ceil(elapsedSeconds / 60)} min | **Participants**: ${participants.length}

#### 📌 Key Discussion & Topics
${captions.map((c) => `- **${c.speakerName}**: ${c.text}`).join("\n")}

#### 💡 Decisions Made
- WebRTC SFU Media server cluster approved with LiveKit/AWS Chime adapter.
- Real-time speech transcription & live WebSocket caption broadcasting operational.

#### 📋 Action Items
- Run end-to-end multi-tenant isolation tests and verify 100% build pass rate.`,
      postedMessageId: `msg_${Date.now()}`,
    };

    setRecapResult(mockRecap);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div style={styles.roomWrapper}>
      {/* Header Bar */}
      <div style={styles.headerBar}>
        <div style={styles.headerLeft}>
          <span style={styles.huddleBadge}>🔴 LIVE HUDDLE</span>
          <h2 style={styles.roomTitle}>#{channelName}</h2>
          <span style={styles.timerBadge}>⏱️ {formatTimer(elapsedSeconds)}</span>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.participantBadge}>👥 {participants.length} Participants</span>
          <span style={styles.spatialAudioBadge}>🎧 Spatial Audio Active</span>
        </div>
      </div>

      {huddleActive ? (
        <>
          {/* Participant Video/Audio Grid */}
          <div style={styles.gridContainer}>
            {participants.map((p) => (
              <div
                key={p.userId}
                style={{
                  ...styles.participantCard,
                  borderColor: p.isSpeaking ? "#22c55e" : p.isScreenSharing ? "#8b5cf6" : "#27272a",
                  boxShadow: p.isSpeaking ? "0 0 12px rgba(34, 197, 94, 0.4)" : "none",
                }}
              >
                {/* Media Screen Display Area */}
                <div style={styles.mediaScreen}>
                  {p.isScreenSharing ? (
                    <div style={styles.screenShareDisplay}>
                      <span style={{ fontSize: "28px" }}>🖥️</span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#a78bfa" }}>
                        Sharing Screen
                      </span>
                    </div>
                  ) : p.isVideoOn ? (
                    <div style={styles.videoSim}>
                      <div style={styles.avatarCircle}>
                        {p.userName.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  ) : (
                    <div style={styles.avatarOff}>
                      <div style={styles.avatarCircleGray}>
                        {p.userName.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>Camera Off</span>
                    </div>
                  )}

                  {/* Status Badges Overlay */}
                  <div style={styles.cardBadges}>
                    {p.isMuted ? (
                      <span style={styles.muteBadge}>🎙️ Muted</span>
                    ) : (
                      <span style={styles.unmuteBadge}>🎙️ Mic On</span>
                    )}
                    {p.isSpeaking && <span style={styles.speakingBadge}>🔊 Speaking</span>}
                  </div>
                </div>

                {/* Participant Footer */}
                <div style={styles.cardFooter}>
                  <span style={styles.userNameText}>{p.userName}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Live Captions Component */}
          <LiveCaptions captions={captions} />

          {/* Huddle Controls Bar */}
          <HuddleControls
            isMuted={isMuted}
            isVideoOn={isVideoOn}
            isScreenSharing={isScreenSharing}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
            onToggleScreenShare={toggleScreenShare}
            onSendSpeechChunk={handleSendSpeechChunk}
            onLeaveHuddle={handleLeaveHuddle}
          />
        </>
      ) : (
        /* Post-Huddle Meeting Recap Display */
        <div style={styles.recapContainer}>
          <div style={styles.recapHeader}>
            <span style={{ fontSize: "24px" }}>🎉</span>
            <h3 style={styles.recapTitle}>Huddle Ended — Automated AI Meeting Recap</h3>
          </div>
          <div style={styles.recapBody}>
            <pre style={styles.markdownPre}>{recapResult?.recapMarkdown}</pre>
          </div>
          <div style={styles.recapFooter}>
            <span style={{ color: "#10b981", fontSize: "13px", fontWeight: 600 }}>
              ✅ Recap automatically posted to #{channelName} channel
            </span>
            <button
              onClick={() => {
                setHuddleActive(true);
                setRecapResult(null);
              }}
              style={styles.rejoinBtn}
            >
              🔄 Rejoin Huddle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  roomWrapper: {
    backgroundColor: "#09090b",
    color: "#f4f4f5",
    padding: "20px",
    borderRadius: "16px",
    border: "1px solid #27272a",
    width: "100%",
    maxWidth: "900px",
    margin: "0 auto",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  headerBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    paddingBottom: "12px",
    borderBottom: "1px solid #27272a",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  huddleBadge: {
    backgroundColor: "#dc2626",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: 800,
    padding: "4px 8px",
    borderRadius: "6px",
    letterSpacing: "0.05em",
  },
  roomTitle: {
    fontSize: "18px",
    fontWeight: 700,
    margin: 0,
    color: "#f4f4f5",
  },
  timerBadge: {
    backgroundColor: "#18181b",
    color: "#a1a1aa",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "13px",
    border: "1px solid #27272a",
  },
  headerRight: {
    display: "flex",
    gap: "10px",
  },
  participantBadge: {
    backgroundColor: "#27272a",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
  },
  spatialAudioBadge: {
    backgroundColor: "#312e81",
    color: "#c7d2fe",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
  },
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "16px",
  },
  participantCard: {
    backgroundColor: "#18181b",
    borderRadius: "12px",
    borderWidth: "2px",
    borderStyle: "solid",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  mediaScreen: {
    height: "140px",
    backgroundColor: "#09090b",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  screenShareDisplay: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
  },
  videoSim: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1e1b4b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOff: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
  },
  avatarCircle: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "#6366f1",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "20px",
  },
  avatarCircleGray: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    backgroundColor: "#3f3f46",
    color: "#d4d4d8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "18px",
  },
  cardBadges: {
    position: "absolute",
    bottom: "8px",
    left: "8px",
    display: "flex",
    gap: "4px",
  },
  muteBadge: {
    backgroundColor: "#ef4444",
    color: "#ffffff",
    fontSize: "10px",
    padding: "2px 6px",
    borderRadius: "4px",
    fontWeight: 600,
  },
  unmuteBadge: {
    backgroundColor: "#10b981",
    color: "#ffffff",
    fontSize: "10px",
    padding: "2px 6px",
    borderRadius: "4px",
    fontWeight: 600,
  },
  speakingBadge: {
    backgroundColor: "#22c55e",
    color: "#000000",
    fontSize: "10px",
    padding: "2px 6px",
    borderRadius: "4px",
    fontWeight: 800,
  },
  cardFooter: {
    padding: "10px 12px",
    backgroundColor: "#18181b",
    borderTop: "1px solid #27272a",
  },
  userNameText: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#f4f4f5",
  },
  recapContainer: {
    backgroundColor: "#18181b",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #27272a",
  },
  recapHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "14px",
  },
  recapTitle: {
    fontSize: "16px",
    fontWeight: 700,
    margin: 0,
    color: "#f4f4f5",
  },
  recapBody: {
    backgroundColor: "#09090b",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid #27272a",
    marginBottom: "16px",
  },
  markdownPre: {
    whiteSpace: "pre-wrap",
    fontFamily: "monospace",
    fontSize: "13px",
    color: "#e4e4e7",
    margin: 0,
    lineHeight: 1.5,
  },
  recapFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rejoinBtn: {
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },
};
