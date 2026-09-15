"use client";

import React, { useState } from "react";

export interface CalendarEventProps {
  id: string;
  title: string;
  timeRange: string;
  location?: string;
  organizer: string;
  provider: "google" | "outlook" | "native";
  initialRsvp?: "yes" | "no" | "maybe";
  initialCounts?: { yes: number; maybe: number; no: number };
}

export const CalendarEventWidget: React.FC<CalendarEventProps> = ({
  title,
  timeRange,
  location = "NexusHub Huddle Room",
  organizer,
  provider,
  initialRsvp = "yes",
  initialCounts = { yes: 4, maybe: 1, no: 0 },
}) => {
  const [rsvpStatus, setRsvpStatus] = useState<"yes" | "no" | "maybe">(initialRsvp);
  const [counts, setCounts] = useState(initialCounts);

  const handleRsvp = (newStatus: "yes" | "no" | "maybe") => {
    if (newStatus === rsvpStatus) return;

    setCounts((prev) => {
      const updated = { ...prev };
      updated[rsvpStatus] = Math.max(0, updated[rsvpStatus] - 1);
      updated[newStatus] = updated[newStatus] + 1;
      return updated;
    });

    setRsvpStatus(newStatus);
  };

  const getProviderBadge = () => {
    if (provider === "google") return { label: "📅 Google Calendar", color: "#ea4335" };
    if (provider === "outlook") return { label: "📅 Outlook Calendar", color: "#0078d4" };
    return { label: "📅 Nexus Calendar", color: "#8b5cf6" };
  };

  const badge = getProviderBadge();

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={{ ...styles.providerBadge, backgroundColor: badge.color }}>
          {badge.label}
        </span>
        <span style={styles.organizerText}>Organized by {organizer}</span>
      </div>

      <h4 style={styles.eventTitle}>{title}</h4>
      <div style={styles.metaRow}>
        <span>🕒 {timeRange}</span>
        <span>📍 {location}</span>
      </div>

      {/* RSVP Action Bar */}
      <div style={styles.rsvpRow}>
        <div style={styles.buttonsGroup}>
          <button
            onClick={() => handleRsvp("yes")}
            style={{
              ...styles.rsvpBtn,
              backgroundColor: rsvpStatus === "yes" ? "#10b981" : "#1f2937",
              borderColor: rsvpStatus === "yes" ? "#10b981" : "#374151",
            }}
          >
            ✅ Going ({counts.yes})
          </button>
          <button
            onClick={() => handleRsvp("maybe")}
            style={{
              ...styles.rsvpBtn,
              backgroundColor: rsvpStatus === "maybe" ? "#f59e0b" : "#1f2937",
              borderColor: rsvpStatus === "maybe" ? "#f59e0b" : "#374151",
            }}
          >
            🤔 Maybe ({counts.maybe})
          </button>
          <button
            onClick={() => handleRsvp("no")}
            style={{
              ...styles.rsvpBtn,
              backgroundColor: rsvpStatus === "no" ? "#ef4444" : "#1f2937",
              borderColor: rsvpStatus === "no" ? "#ef4444" : "#374151",
            }}
          >
            ❌ Declined ({counts.no})
          </button>
        </div>

        <span style={styles.currentStatusText}>
          Your RSVP: <strong style={{ color: "#ffffff" }}>{rsvpStatus.toUpperCase()}</strong>
        </span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: "#111827",
    border: "1px solid #1f2937",
    borderRadius: "12px",
    padding: "16px",
    color: "#f3f4f6",
    maxWidth: "540px",
    margin: "12px 0",
    fontFamily: "system-ui, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  providerBadge: {
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: "6px",
  },
  organizerText: {
    fontSize: "12px",
    color: "#9ca3af",
  },
  eventTitle: {
    fontSize: "16px",
    fontWeight: 700,
    margin: "4px 0 8px 0",
    color: "#f9fafb",
  },
  metaRow: {
    display: "flex",
    gap: "16px",
    fontSize: "13px",
    color: "#d1d5db",
    marginBottom: "14px",
  },
  rsvpRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "12px",
    borderTop: "1px solid #1f2937",
    flexWrap: "wrap",
    gap: "8px",
  },
  buttonsGroup: {
    display: "flex",
    gap: "8px",
  },
  rsvpBtn: {
    color: "#ffffff",
    borderWidth: "1px",
    borderStyle: "solid",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  currentStatusText: {
    fontSize: "12px",
    color: "#9ca3af",
  },
};
