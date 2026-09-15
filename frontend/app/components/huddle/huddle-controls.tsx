"use client";

import React, { useState } from "react";

interface HuddleControlsProps {
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onSendSpeechChunk: (text: string) => void;
  onLeaveHuddle: () => void;
}

export const HuddleControls: React.FC<HuddleControlsProps> = ({
  isMuted,
  isVideoOn,
  isScreenSharing,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onSendSpeechChunk,
  onLeaveHuddle,
}) => {
  const [speechText, setSpeechText] = useState("");

  const handleSpeechSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!speechText.trim()) return;
    onSendSpeechChunk(speechText.trim());
    setSpeechText("");
  };

  return (
    <div style={styles.controlsContainer}>
      <div style={styles.buttonGroup}>
        {/* Mute Button */}
        <button
          onClick={onToggleMute}
          style={{
            ...styles.controlBtn,
            backgroundColor: isMuted ? "#ef4444" : "#3b82f6",
          }}
          title={isMuted ? "Unmute Audio" : "Mute Audio"}
        >
          {isMuted ? "🎙️ Unmute" : "🎙️ Muted: No"}
        </button>

        {/* Video Button */}
        <button
          onClick={onToggleVideo}
          style={{
            ...styles.controlBtn,
            backgroundColor: isVideoOn ? "#10b981" : "#6b7280",
          }}
          title={isVideoOn ? "Turn Camera Off" : "Turn Camera On"}
        >
          {isVideoOn ? "📹 Video On" : "📹 Video Off"}
        </button>

        {/* Screen Share Button */}
        <button
          onClick={onToggleScreenShare}
          style={{
            ...styles.controlBtn,
            backgroundColor: isScreenSharing ? "#8b5cf6" : "#4b5563",
          }}
          title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
        >
          {isScreenSharing ? "🖥️ Sharing Screen" : "🖥️ Share Screen"}
        </button>

        {/* Leave Huddle Button */}
        <button
          onClick={onLeaveHuddle}
          style={{
            ...styles.controlBtn,
            backgroundColor: "#dc2626",
            fontWeight: "bold",
          }}
        >
          🚪 Leave Huddle
        </button>
      </div>

      {/* Live Audio Transcription Input Simulator */}
      <form onSubmit={handleSpeechSubmit} style={styles.speechForm}>
        <input
          type="text"
          value={speechText}
          onChange={(e) => setSpeechText(e.target.value)}
          placeholder="Speak or type audio chunk for live AI transcription..."
          style={styles.speechInput}
        />
        <button type="submit" style={styles.sendSpeechBtn}>
          🗣️ Transcribe Audio
        </button>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  controlsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    backgroundColor: "#18181b",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #27272a",
    marginTop: "16px",
  },
  buttonGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    justifyContent: "center",
  },
  controlBtn: {
    padding: "10px 18px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  speechForm: {
    display: "flex",
    gap: "8px",
    width: "100%",
  },
  speechInput: {
    flex: 1,
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #3f3f46",
    backgroundColor: "#09090b",
    color: "#f4f4f5",
    fontSize: "14px",
    outline: "none",
  },
  sendSpeechBtn: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#6366f1",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
  },
};
