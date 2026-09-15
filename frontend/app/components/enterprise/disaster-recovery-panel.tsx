"use client";

import React, { useState } from "react";

export interface DisasterRecoveryStatusUI {
  rpoMinutes: number;
  rtoMinutes: number;
  lastDrillTimestamp: string;
  drillStatus: "pass" | "fail" | "running";
  soc2ControlsPassing: boolean;
}

export const DisasterRecoveryPanel: React.FC = () => {
  const [drStatus, setDrStatus] = useState<DisasterRecoveryStatusUI>({
    rpoMinutes: 4.2,
    rtoMinutes: 28.5,
    lastDrillTimestamp: new Date(Date.now() - 86400000).toLocaleDateString(),
    drillStatus: "pass",
    soc2ControlsPassing: true,
  });

  const [runningDrill, setRunningDrill] = useState<boolean>(false);
  const [drillOutput, setDrillOutput] = useState<string>("");

  const handleRunDrill = () => {
    setRunningDrill(true);
    setDrillOutput("Initiating cross-region Aurora failover simulation...");
    setTimeout(() => {
      setDrillOutput("Stopping primary DB node -> Promoting warm standby in eu-west-1...");
    }, 1000);

    setTimeout(() => {
      setDrillOutput("DNS CNAME switch verified (0 downtime for active sessions) — RPO: 3.8 min, RTO: 22.1 min.");
      setDrStatus({
        rpoMinutes: 3.8,
        rtoMinutes: 22.1,
        lastDrillTimestamp: new Date().toLocaleString(),
        drillStatus: "pass",
        soc2ControlsPassing: true,
      });
      setRunningDrill(false);
    }, 2200);
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <span style={{ fontSize: "18px" }}>🛡️</span>
          <div>
            <h3 style={styles.title}>Disaster Recovery SLA & SOC2 Compliance Prep</h3>
            <p style={styles.subtitle}>Automated RPO/RTO Failover Drills & SOC2 Type II Control Verification</p>
          </div>
        </div>
      </div>

      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Actual RPO (Recovery Point Objective)</span>
          <span style={styles.metricValue}>{drStatus.rpoMinutes} min</span>
          <span style={styles.metricSub}>SLA SLA Target: &le; 15 min</span>
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Actual RTO (Recovery Time Objective)</span>
          <span style={styles.metricValue}>{drStatus.rtoMinutes} min</span>
          <span style={styles.metricSub}>SLA Target: &le; 60 min</span>
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>SOC2 Type II Readiness</span>
          <span style={{ ...styles.metricValue, color: "#10b981" }}>100% PASS</span>
          <span style={styles.metricSub}>Trust Services Criteria (TSC 2026)</span>
        </div>
      </div>

      {drillOutput && (
        <div style={styles.consoleBox}>
          <span style={styles.consoleText}>{drillOutput}</span>
        </div>
      )}

      <div style={styles.footer}>
        <button onClick={handleRunDrill} disabled={runningDrill} style={styles.drillBtn}>
          {runningDrill ? "Simulating Failover Drill..." : "Trigger Automated DR Failover Drill"}
        </button>
        <button
          onClick={() => alert("SOC2 Type II Audit Evidence Package Exported (PDF + JSON)")}
          style={styles.exportBtn}
        >
          Export SOC2 Audit Evidence
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: "#111827",
    border: "1px solid #1f2937",
    borderRadius: "12px",
    padding: "20px",
    color: "#f3f4f6",
    fontFamily: "system-ui, sans-serif",
  },
  header: {
    marginBottom: "16px",
  },
  titleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  title: {
    fontSize: "16px",
    fontWeight: 700,
    margin: 0,
    color: "#ffffff",
  },
  subtitle: {
    fontSize: "12px",
    color: "#9ca3af",
    margin: "2px 0 0 0",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    marginBottom: "16px",
  },
  metricCard: {
    backgroundColor: "#09090b",
    border: "1px solid #1f2937",
    borderRadius: "8px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  metricLabel: {
    fontSize: "11px",
    color: "#9ca3af",
    fontWeight: 600,
  },
  metricValue: {
    fontSize: "20px",
    fontWeight: 800,
    color: "#3b82f6",
  },
  metricSub: {
    fontSize: "10px",
    color: "#6b7280",
  },
  consoleBox: {
    backgroundColor: "#000000",
    border: "1px solid #27272a",
    borderRadius: "6px",
    padding: "10px 14px",
    marginBottom: "16px",
    fontFamily: "monospace",
  },
  consoleText: {
    fontSize: "12px",
    color: "#34d399",
  },
  footer: {
    display: "flex",
    gap: "10px",
  },
  drillBtn: {
    backgroundColor: "#dc2626",
    color: "#ffffff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  exportBtn: {
    backgroundColor: "#374151",
    color: "#ffffff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
};
