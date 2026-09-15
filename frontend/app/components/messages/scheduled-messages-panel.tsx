"use client";

import React, { useState } from "react";

export interface ScheduledMsgItemUI {
  id: string;
  channelName: string;
  content: string;
  scheduledAt: string;
}

interface ScheduledMessagesPanelProps {
  initialItems?: ScheduledMsgItemUI[];
}

export const ScheduledMessagesPanel: React.FC<ScheduledMessagesPanelProps> = ({
  initialItems = [
    {
      id: "sched_1",
      channelName: "engineering-general",
      content: "🚀 Phase 4 release build is deployed to staging. Please run test suites.",
      scheduledAt: "Tomorrow at 9:00 AM",
    },
    {
      id: "sched_2",
      channelName: "product-announcements",
      content: "📢 Team sync reminder: WebRTC Huddle & Task Integration demo today.",
      scheduledAt: "Today at 5:00 PM",
    },
  ],
}) => {
  const [items, setItems] = useState<ScheduledMsgItemUI[]>(initialItems);

  const handleCancel = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={{ fontSize: "16px" }}>⏱️</span>
        <h4 style={styles.title}>Scheduled Messages ({items.length})</h4>
      </div>

      {items.length === 0 ? (
        <p style={styles.emptyText}>No pending scheduled messages.</p>
      ) : (
        <div style={styles.list}>
          {items.map((item) => (
            <div key={item.id} style={styles.itemCard}>
              <div style={styles.itemHeader}>
                <span style={styles.channelTag}>#{item.channelName}</span>
                <span style={styles.timeTag}>📅 {item.scheduledAt}</span>
              </div>
              <p style={styles.itemContent}>{item.content}</p>
              <div style={styles.itemFooter}>
                <button onClick={() => handleCancel(item.id)} style={styles.cancelBtn}>
                  🗑️ Cancel Delivery
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
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
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },
  title: {
    fontSize: "14px",
    fontWeight: 700,
    margin: 0,
    color: "#f9fafb",
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: "13px",
    fontStyle: "italic",
    margin: 0,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  itemCard: {
    backgroundColor: "#1f2937",
    borderRadius: "8px",
    padding: "12px",
    border: "1px solid #374151",
  },
  itemHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  channelTag: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#60a5fa",
  },
  timeTag: {
    fontSize: "11px",
    color: "#9ca3af",
  },
  itemContent: {
    fontSize: "13px",
    color: "#e5e7eb",
    margin: "4px 0 8px 0",
    lineHeight: 1.4,
  },
  itemFooter: {
    display: "flex",
    justifyContent: "flex-end",
  },
  cancelBtn: {
    backgroundColor: "transparent",
    border: "1px solid #ef4444",
    color: "#f87171",
    fontSize: "11px",
    fontWeight: 600,
    padding: "4px 8px",
    borderRadius: "4px",
    cursor: "pointer",
  },
};
