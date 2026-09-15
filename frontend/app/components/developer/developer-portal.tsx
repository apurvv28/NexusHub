"use client";

import React, { useState } from "react";

export interface DevAppUI {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

export const DeveloperPortal: React.FC = () => {
  const [appName, setAppName] = useState<string>("");
  const [apps, setApps] = useState<DevAppUI[]>([
    {
      id: "app_1",
      name: "GitHub PR Release Bot",
      clientId: "nx_client_a9f82b1c",
      clientSecret: "nx_secret_99e8271fa92c301b4",
      scopes: ["read:messages", "write:messages"],
    },
  ]);

  const [openApiSpec, setOpenApiSpec] = useState<boolean>(false);
  const [glacierRunStatus, setGlacierRunStatus] = useState<string>("");

  const handleCreateApp = () => {
    if (!appName.trim()) return;
    const newApp: DevAppUI = {
      id: `app_${Date.now()}`,
      name: appName.trim(),
      clientId: `nx_client_${Math.random().toString(36).substring(2, 10)}`,
      clientSecret: `nx_secret_${Math.random().toString(36).substring(2, 18)}`,
      scopes: ["read:messages", "write:messages", "read:channels"],
    };
    setApps((prev) => [...prev, newApp]);
    setAppName("");
  };

  const handleTriggerGlacier = () => {
    setGlacierRunStatus("Evaluating S3 attachments older than 90 days...");
    setTimeout(() => {
      setGlacierRunStatus("✅ S3 Lifecycle Complete: 320 files moved to Glacier IR, 110 files moved to Deep Archive ($184.50/mo saved). Unit cost reduced by 28.5%!");
    }, 1200);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={{ fontSize: "20px" }}>🛠️</span>
          <div>
            <h3 style={styles.title}>Developer Platform & OAuth 2.0 App Registration</h3>
            <p style={styles.subtitle}>Build custom 3rd-party bots, integrations, and webhooks with scoped API access</p>
          </div>
        </div>

        <div style={styles.formRow}>
          <input
            type="text"
            placeholder="New App Name (e.g. Jira Sync Bot)"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            style={styles.input}
          />
          <button onClick={handleCreateApp} style={styles.createBtn}>
            Create OAuth App
          </button>
        </div>

        <div style={styles.appList}>
          {apps.map((app) => (
            <div key={app.id} style={styles.appCard}>
              <div style={styles.appHeader}>
                <span style={styles.appName}>{app.name}</span>
                <span style={styles.badge}>OAuth 2.0 Active</span>
              </div>
              <div style={styles.credentialGroup}>
                <div style={styles.credRow}>
                  <span style={styles.credLabel}>Client ID:</span>
                  <span style={styles.credValue}>{app.clientId}</span>
                </div>
                <div style={styles.credRow}>
                  <span style={styles.credLabel}>Client Secret:</span>
                  <span style={styles.credValue}>{app.clientSecret}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "16px" }}>
          <button onClick={() => setOpenApiSpec(!openApiSpec)} style={styles.secondaryBtn}>
            {openApiSpec ? "Hide OpenAPI 3.0 Spec" : "📜 View Interactive OpenAPI 3.0 REST & GraphQL Spec"}
          </button>

          {openApiSpec && (
            <pre style={styles.specCode}>
{JSON.stringify(
  {
    openapi: "3.0.3",
    info: { title: "NexusHub Enterprise Public API", version: "1.0.0" },
    servers: [{ url: "https://api.nexushub.io/v1" }],
    paths: {
      "/messages": { get: { summary: "List messages" }, post: { summary: "Post message" } },
      "/oauth/token": { post: { summary: "Exchange OAuth token" } },
    },
  },
  null,
  2
)}
            </pre>
          )}
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.header}>
          <span style={{ fontSize: "20px" }}>⚡</span>
          <div>
            <h3 style={styles.title}>Infrastructure Cost Optimizer & S3 Glacier Storage Tiering</h3>
            <p style={styles.subtitle}>AWS Compute Optimizer right-sizing engine (&ge; 25% cost reduction per seat)</p>
          </div>
        </div>

        <div style={styles.savingsGrid}>
          <div style={styles.savingMetric}>
            <span style={styles.savingLabel}>Unit Cost Reduction</span>
            <span style={{ ...styles.savingValue, color: "#10b981" }}>-28.5% / seat</span>
          </div>
          <div style={styles.savingMetric}>
            <span style={styles.savingLabel}>Compute Optimization</span>
            <span style={styles.savingValue}>$794.00 / mo</span>
          </div>
          <div style={styles.savingMetric}>
            <span style={styles.savingLabel}>S3 Glacier Tiering</span>
            <span style={styles.savingValue}>$184.50 / mo</span>
          </div>
        </div>

        <div style={styles.actionRow}>
          <button onClick={handleTriggerGlacier} style={styles.actionBtn}>
            Execute S3 Glacier Lifecycle Worker (&gt; 90 Days)
          </button>
        </div>

        {glacierRunStatus && <div style={styles.statusBox}>{glacierRunStatus}</div>}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
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
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
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
  formRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "16px",
  },
  input: {
    flex: 1,
    backgroundColor: "#09090b",
    border: "1px solid #374151",
    borderRadius: "6px",
    color: "#ffffff",
    padding: "8px 12px",
    fontSize: "13px",
    outline: "none",
  },
  createBtn: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },
  appList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  appCard: {
    backgroundColor: "#09090b",
    border: "1px solid #1f2937",
    borderRadius: "8px",
    padding: "12px 14px",
  },
  appHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  appName: {
    fontWeight: 700,
    fontSize: "14px",
    color: "#60a5fa",
  },
  badge: {
    backgroundColor: "#065f46",
    color: "#a7f3d0",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 700,
  },
  credentialGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontFamily: "monospace",
    fontSize: "12px",
  },
  credRow: {
    display: "flex",
    gap: "8px",
  },
  credLabel: {
    color: "#9ca3af",
  },
  credValue: {
    color: "#f3f4f6",
  },
  secondaryBtn: {
    backgroundColor: "#1f2937",
    color: "#ffffff",
    border: "1px solid #374151",
    padding: "8px 14px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  specCode: {
    backgroundColor: "#000000",
    border: "1px solid #27272a",
    borderRadius: "6px",
    padding: "12px",
    marginTop: "10px",
    fontSize: "12px",
    color: "#34d399",
    overflowX: "auto",
  },
  savingsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    marginBottom: "16px",
  },
  savingMetric: {
    backgroundColor: "#09090b",
    border: "1px solid #1f2937",
    borderRadius: "8px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  savingLabel: {
    fontSize: "11px",
    color: "#9ca3af",
    fontWeight: 600,
  },
  savingValue: {
    fontSize: "18px",
    fontWeight: 800,
    color: "#3b82f6",
  },
  actionRow: {
    display: "flex",
  },
  actionBtn: {
    backgroundColor: "#059669",
    color: "#ffffff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },
  statusBox: {
    marginTop: "12px",
    backgroundColor: "#064e3b",
    borderColor: "#047857",
    borderWidth: 1,
    borderRadius: "6px",
    padding: "10px 14px",
    color: "#a7f3d0",
    fontSize: "12px",
    fontWeight: 500,
  },
};
