"use client";

import React, { useState } from "react";

export const SSOConfigPanel: React.FC = () => {
  const [provider, setProvider] = useState<"okta" | "azure_ad" | "ping_identity">("okta");
  const [entityId, setEntityId] = useState("urn:nexushub:saml2:ws_nexus_corp");
  const [ssoUrl, setSsoUrl] = useState("https://dev-12345.okta.com/app/nexushub/sso/saml");
  const [domains, setDomains] = useState("enterprise.com, nexuscorp.io");
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={{ fontSize: "18px" }}>🔑</span>
        <h3 style={styles.title}>Enterprise SSO (SAML 2.0 / OIDC)</h3>
      </div>

      <form onSubmit={handleSave} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Identity Provider (IdP):</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as any)}
            style={styles.select}
          >
            <option value="okta">Okta Identity Cloud</option>
            <option value="azure_ad">Microsoft Entra ID (Azure AD)</option>
            <option value="ping_identity">Ping Identity Federation</option>
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>SAML Entity ID / Issuer URI:</label>
          <input
            type="text"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            style={styles.input}
            required
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Single Sign-On (SSO) URL:</label>
          <input
            type="text"
            value={ssoUrl}
            onChange={(e) => setSsoUrl(e.target.value)}
            style={styles.input}
            required
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Allowed Email Domains (comma-separated):</label>
          <input
            type="text"
            value={domains}
            onChange={(e) => setDomains(e.target.value)}
            style={styles.input}
            required
          />
        </div>

        <div style={styles.footer}>
          <span style={{ fontSize: "12px", color: isSaved ? "#10b981" : "#9ca3af" }}>
            {isSaved ? "✅ SSO configuration updated successfully!" : "Requires WorkspaceAdmin role."}
          </span>
          <button type="submit" style={styles.saveBtn}>
            💾 Save SSO Config
          </button>
        </div>
      </form>
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
    marginBottom: "16px",
    borderBottom: "1px solid #1f2937",
    paddingBottom: "10px",
  },
  title: {
    fontSize: "16px",
    fontWeight: 700,
    margin: 0,
    color: "#ffffff",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12px",
    color: "#9ca3af",
    fontWeight: 600,
  },
  input: {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #374151",
    backgroundColor: "#1f2937",
    color: "#ffffff",
    fontSize: "13px",
    outline: "none",
  },
  select: {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #374151",
    backgroundColor: "#1f2937",
    color: "#ffffff",
    fontSize: "13px",
    outline: "none",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "8px",
  },
  saveBtn: {
    padding: "8px 16px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },
};
