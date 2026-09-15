"use client";

import React, { useState } from "react";

export interface AuditLogUI {
  id: string;
  category: string;
  action: string;
  user: string;
  ip: string;
  timestamp: string;
}

export const AuditLogViewer: React.FC = () => {
  const [filter, setFilter] = useState<string>("all");
  const [logs] = useState<AuditLogUI[]>([
    {
      id: "audit_1",
      category: "auth",
      action: "SAML 2.0 Identity Provider Auth Success",
      user: "alice@acme.com",
      ip: "192.168.1.42",
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: "audit_2",
      category: "scim",
      action: "SCIM 2.0 Deprovision User (active=false)",
      user: "bot@okta.internal",
      ip: "54.210.12.8",
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: "audit_3",
      category: "security",
      action: "Legal Hold Enabled for Workspace",
      user: "security.admin@acme.com",
      ip: "10.0.4.19",
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: "audit_4",
      category: "admin",
      action: "Configured Splunk SIEM Kinesis Firehose Stream",
      user: "admin@acme.com",
      ip: "10.0.4.19",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const filteredLogs = filter === "all" ? logs : logs.filter((l) => l.category === filter);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <span style={{ fontSize: "18px" }}>📜</span>
          <h3 style={styles.title}>Compliance Audit Log Stream & SIEM Exporter</h3>
        </div>
        <div style={styles.filterGroup}>
          <button
            onClick={() => setFilter("all")}
            style={{ ...styles.filterBtn, backgroundColor: filter === "all" ? "#3b82f6" : "#1f2937" }}
          >
            All Logs
          </button>
          <button
            onClick={() => setFilter("auth")}
            style={{ ...styles.filterBtn, backgroundColor: filter === "auth" ? "#3b82f6" : "#1f2937" }}
          >
            Auth
          </button>
          <button
            onClick={() => setFilter("scim")}
            style={{ ...styles.filterBtn, backgroundColor: filter === "scim" ? "#3b82f6" : "#1f2937" }}
          >
            SCIM
          </button>
          <button
            onClick={() => setFilter("security")}
            style={{ ...styles.filterBtn, backgroundColor: filter === "security" ? "#3b82f6" : "#1f2937" }}
          >
            Security
          </button>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={styles.th}>Timestamp</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Action</th>
              <th style={styles.th}>Actor User</th>
              <th style={styles.th}>Client IP</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id} style={styles.tr}>
                <td style={styles.tdTime}>{log.timestamp}</td>
                <td style={styles.td}>
                  <span style={styles.categoryBadge}>{log.category.toUpperCase()}</span>
                </td>
                <td style={styles.tdAction}>{log.action}</td>
                <td style={styles.tdUser}>{log.user}</td>
                <td style={styles.tdIp}>{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
    flexWrap: "wrap",
    gap: "10px",
  },
  titleGroup: {
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
  filterGroup: {
    display: "flex",
    gap: "6px",
  },
  filterBtn: {
    color: "#ffffff",
    border: "none",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  tableWrapper: {
    overflowX: "auto",
    backgroundColor: "#09090b",
    borderRadius: "8px",
    border: "1px solid #1f2937",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "13px",
  },
  thRow: {
    backgroundColor: "#18181b",
    borderBottom: "1px solid #27272a",
  },
  th: {
    padding: "10px 12px",
    color: "#9ca3af",
    fontWeight: 600,
  },
  tr: {
    borderBottom: "1px solid #18181b",
  },
  tdTime: {
    padding: "10px 12px",
    color: "#6b7280",
    fontFamily: "monospace",
    fontSize: "12px",
  },
  td: {
    padding: "10px 12px",
  },
  tdAction: {
    padding: "10px 12px",
    color: "#e5e7eb",
    fontWeight: 600,
  },
  tdUser: {
    padding: "10px 12px",
    color: "#60a5fa",
  },
  tdIp: {
    padding: "10px 12px",
    color: "#9ca3af",
    fontFamily: "monospace",
    fontSize: "12px",
  },
  categoryBadge: {
    backgroundColor: "#312e81",
    color: "#c7d2fe",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: 700,
  },
};
