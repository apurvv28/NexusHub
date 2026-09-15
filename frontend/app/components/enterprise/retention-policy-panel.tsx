"use client";

import React, { useState } from "react";

export const RetentionPolicyPanel: React.FC = () => {
  const [retentionDays, setRetentionDays] = useState(90);
  const [autoPurge, setAutoPurge] = useState(true);
  const [legalHoldActive, setLegalHoldActive] = useState(false);
  const [legalHoldReason, setLegalHoldReason] = useState("SEC Compliance Audit #2026");
  const [lastPurgedCount, setLastPurgedCount] = useState<number | null>(null);

  const toggleLegalHold = () => {
    setLegalHoldActive((prev) => !prev);
  };

  const runRetentionWorker = () => {
    if (legalHoldActive) {
      setLastPurgedCount(0); // Legal hold prevented purge!
    } else {
      setLastPurgedCount(14);
    }
  };

  return (
    <div style={{ ...styles.card, borderColor: legalHoldActive ? "#ef4444" : "#1f2937" }}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={{ fontSize: "18px" }}>🛡️</span>
          <h3 style={styles.title}>Message Retention & Legal Hold Governance</h3>
        </div>
        {legalHoldActive && (
          <span style={styles.legalHoldActiveBadge}>⚠️ LEGAL HOLD ACTIVE</span>
        )}
      </div>

      <div style={styles.body}>
        {/* Retention Settings */}
        <div style={styles.row}>
          <label style={styles.label}>Message Retention TTL (Days):</label>
          <input
            type="number"
            value={retentionDays}
            onChange={(e) => setRetentionDays(parseInt(e.target.value, 10))}
            style={styles.numberInput}
            min={30}
            max={3650}
          />
        </div>

        <div style={styles.row}>
          <label style={styles.label}>Automatic Retention Purge:</label>
          <button
            onClick={() => setAutoPurge(!autoPurge)}
            style={{
              ...styles.toggleBtn,
              backgroundColor: autoPurge ? "#10b981" : "#4b5563",
            }}
          >
            {autoPurge ? "Enabled" : "Disabled"}
          </button>
        </div>

        {/* Legal Hold Override Toggle */}
        <div style={styles.legalHoldBox}>
          <div style={styles.legalHoldHeader}>
            <div>
              <h4 style={styles.legalHoldTitle}>⚖️ Compliance Legal Hold</h4>
              <p style={styles.legalHoldSub}>
                Strictly freezes and prevents any automated retention purge for compliance/legal discovery.
              </p>
            </div>
            <button
              onClick={toggleLegalHold}
              style={{
                ...styles.legalHoldBtn,
                backgroundColor: legalHoldActive ? "#dc2626" : "#3b82f6",
              }}
            >
              {legalHoldActive ? "Disable Legal Hold" : "Enable Legal Hold"}
            </button>
          </div>

          {legalHoldActive && (
            <div style={styles.reasonField}>
              <span style={styles.label}>Legal Hold Reason:</span>
              <input
                type="text"
                value={legalHoldReason}
                onChange={(e) => setLegalHoldReason(e.target.value)}
                style={styles.input}
              />
            </div>
          )}
        </div>

        {/* Manual Worker Run */}
        <div style={styles.footer}>
          <button onClick={runRetentionWorker} style={styles.runWorkerBtn}>
            ⚡ Run Retention Worker Now
          </button>

          {lastPurgedCount !== null && (
            <span style={{ fontSize: "13px", fontWeight: 600, color: legalHoldActive ? "#f87171" : "#34d399" }}>
              {legalHoldActive
                ? "⚠️ 0 messages purged (Protected by Legal Hold)"
                : `✅ Successfully purged ${lastPurgedCount} expired messages older than ${retentionDays} days.`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: "#111827",
    borderWidth: "1px",
    borderStyle: "solid",
    borderRadius: "12px",
    padding: "20px",
    color: "#f3f4f6",
    fontFamily: "system-ui, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    borderBottom: "1px solid #1f2937",
    paddingBottom: "10px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  title: {
    fontSize: "16px",
    fontWeight: 700,
    margin: 0,
    color: "#ffffff",
  },
  legalHoldActiveBadge: {
    backgroundColor: "#dc2626",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: 800,
    padding: "4px 8px",
    borderRadius: "6px",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: "13px",
    color: "#9ca3af",
    fontWeight: 600,
  },
  numberInput: {
    width: "100px",
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid #374151",
    backgroundColor: "#1f2937",
    color: "#ffffff",
    fontSize: "13px",
  },
  toggleBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "none",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  legalHoldBox: {
    backgroundColor: "#1f2937",
    borderRadius: "8px",
    padding: "14px",
    border: "1px solid #374151",
    marginTop: "6px",
  },
  legalHoldHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legalHoldTitle: {
    fontSize: "14px",
    fontWeight: 700,
    margin: "0 0 4px 0",
    color: "#ffffff",
  },
  legalHoldSub: {
    fontSize: "12px",
    color: "#9ca3af",
    margin: 0,
  },
  legalHoldBtn: {
    padding: "8px 14px",
    borderRadius: "6px",
    border: "none",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  reasonField: {
    marginTop: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  input: {
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid #4b5563",
    backgroundColor: "#111827",
    color: "#ffffff",
    fontSize: "13px",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "10px",
  },
  runWorkerBtn: {
    padding: "8px 16px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#6366f1",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },
};
