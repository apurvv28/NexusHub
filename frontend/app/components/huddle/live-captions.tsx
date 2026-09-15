"use client";

import React from "react";

export interface CaptionItem {
  speakerUserId: string;
  speakerName: string;
  text: string;
  timestamp: string;
}

interface LiveCaptionsProps {
  captions: CaptionItem[];
}

export const LiveCaptions: React.FC<LiveCaptionsProps> = ({ captions }) => {
  const latestCaption = captions.length > 0 ? captions[captions.length - 1] : null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.pulseDot}></span>
        <span style={styles.title}>💬 Live AI Subtitles & Captions</span>
      </div>

      {/* Floating Active Subtitle Banner */}
      <div style={styles.activeBanner}>
        {latestCaption ? (
          <div>
            <strong style={{ color: "#a78bfa" }}>{latestCaption.speakerName}:</strong>{" "}
            <span style={{ color: "#f3f4f6" }}>"{latestCaption.text}"</span>
          </div>
        ) : (
          <span style={{ color: "#9ca3af", fontStyle: "italic" }}>
            Listening for audio dialogue... (Speak or send audio chunk to see real-time captions)
          </span>
        )}
      </div>

      {/* Full Transcript Log Dropdown/Box */}
      {captions.length > 0 && (
        <div style={styles.historyBox}>
          <div style={styles.historyTitle}>Transcript Log ({captions.length})</div>
          <div style={styles.historyList}>
            {captions.map((cap, idx) => (
              <div key={idx} style={styles.historyItem}>
                <span style={styles.timestamp}>[{cap.timestamp}]</span>{" "}
                <strong style={{ color: "#c084fc" }}>{cap.speakerName}:</strong> {cap.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: "#111827",
    borderRadius: "12px",
    padding: "14px",
    border: "1px solid #1f2937",
    marginTop: "16px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  pulseDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#22c55e",
    boxShadow: "0 0 8px #22c55e",
  },
  title: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#e5e7eb",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  activeBanner: {
    backgroundColor: "#1f2937",
    padding: "12px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
    borderLeft: "4px solid #8b5cf6",
  },
  historyBox: {
    marginTop: "12px",
    paddingTop: "12px",
    borderTop: "1px solid #374151",
  },
  historyTitle: {
    fontSize: "12px",
    color: "#9ca3af",
    marginBottom: "6px",
    fontWeight: 600,
  },
  historyList: {
    maxHeight: "120px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontSize: "13px",
  },
  historyItem: {
    color: "#d1d5db",
  },
  timestamp: {
    color: "#6b7280",
    fontSize: "11px",
  },
};
