"use client";

import React, { useState } from "react";

export const SCIMTokenPanel: React.FC = () => {
  const [token, setToken] = useState("scim_bearer_nexus_9876543210_token");
  const [copied, setCopied] = useState(false);

  const generateNewToken = () => {
    const newToken = `scim_bearer_nexus_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    setToken(newToken);
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={{ fontSize: "18px" }}>👥</span>
        <h3 style={styles.title}>SCIM 2.0 User Provisioning (RFC 7644)</h3>
      </div>

      <p style={styles.desc}>
        Enable automated enterprise user sync and instant deprovisioning from Okta or Azure AD.
      </p>

      <div style={styles.endpointBox}>
        <span style={styles.label}>SCIM Base URL:</span>
        <code style={styles.code}>https://api.nexushub.io/scim/v2</code>
      </div>

      <div style={styles.tokenBox}>
        <span style={styles.label}>Bearer Authorization Token:</span>
        <div style={styles.tokenRow}>
          <input type="password" value={token} readOnly style={styles.tokenInput} />
          <button onClick={copyToken} style={styles.copyBtn}>
            {copied ? "✅ Copied" : "📋 Copy Token"}
          </button>
          <button onClick={generateNewToken} style={styles.regenBtn}>
            🔄 Regenerate
          </button>
        </div>
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
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
    borderBottom: "1px solid #1f2937",
    paddingBottom: "10px",
  },
  title: {
    fontSize: "16px",
    fontWeight: 700,
    margin: 0,
    color: "#ffffff",
  },
  desc: {
    fontSize: "13px",
    color: "#9ca3af",
    margin: "0 0 14px 0",
  },
  endpointBox: {
    backgroundColor: "#1f2937",
    padding: "10px 12px",
    borderRadius: "6px",
    marginBottom: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  tokenBox: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12px",
    color: "#9ca3af",
    fontWeight: 600,
  },
  code: {
    color: "#60a5fa",
    fontFamily: "monospace",
    fontSize: "13px",
  },
  tokenRow: {
    display: "flex",
    gap: "8px",
  },
  tokenInput: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #374151",
    backgroundColor: "#1f2937",
    color: "#ffffff",
    fontSize: "13px",
  },
  copyBtn: {
    padding: "8px 14px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#059669",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "12px",
    cursor: "pointer",
  },
  regenBtn: {
    padding: "8px 14px",
    borderRadius: "6px",
    border: "1px solid #374151",
    backgroundColor: "transparent",
    color: "#d1d5db",
    fontSize: "12px",
    cursor: "pointer",
  },
};
