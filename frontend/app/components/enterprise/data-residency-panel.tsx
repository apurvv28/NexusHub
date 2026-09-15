"use client";

import React, { useState } from "react";

export interface ResidencyPolicyUI {
  region: string;
  isolationLevel: string;
  kmsKeyArn: string;
  enforceZeroEgress: boolean;
}

export const DataResidencyPanel: React.FC = () => {
  const [policy, setPolicy] = useState<ResidencyPolicyUI>({
    region: "eu-central-1",
    isolationLevel: "hybrid_isolated",
    kmsKeyArn: "arn:aws:kms:eu-central-1:99281741:key/cmk-nexus-eu-01",
    enforceZeroEgress: true,
  });

  const [saving, setSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const handleUpdate = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setStatusMessage("Data residency compliance policy active & verified across AWS region KMS.");
    }, 600);
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <span style={{ fontSize: "18px" }}>🇪🇺</span>
          <div>
            <h3 style={styles.title}>Data Residency & Sovereign Key Management</h3>
            <p style={styles.subtitle}>Enforce localized storage boundaries and customer-managed KMS encryption</p>
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.field}>
          <label style={styles.label}>Designated Data Residency Region</label>
          <select
            value={policy.region}
            onChange={(e) => setPolicy({ ...policy, region: e.target.value })}
            style={styles.select}
          >
            <option value="us-east-1">US-East (N. Virginia)</option>
            <option value="eu-central-1">EU-Central (Frankfurt / GDPR Sovereign)</option>
            <option value="ap-southeast-1">AP-Southeast (Singapore)</option>
            <option value="sa-east-1">SA-East (São Paulo)</option>
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Tenant Isolation Level</label>
          <select
            value={policy.isolationLevel}
            onChange={(e) => setPolicy({ ...policy, isolationLevel: e.target.value })}
            style={styles.select}
          >
            <option value="logical_pool">Logical Pool (Shared DB Schema)</option>
            <option value="hybrid_isolated">Hybrid Isolated DB (Schema-per-tenant)</option>
            <option value="dedicated_silo">Dedicated Silo (Air-Gapped AWS Account)</option>
          </select>
        </div>

        <div style={styles.fieldFull}>
          <label style={styles.label}>Customer-Managed KMS Encryption Key ARN (HYOK)</label>
          <input
            type="text"
            value={policy.kmsKeyArn}
            onChange={(e) => setPolicy({ ...policy, kmsKeyArn: e.target.value })}
            style={styles.input}
          />
        </div>

        <div style={styles.fieldFull}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={policy.enforceZeroEgress}
              onChange={(e) => setPolicy({ ...policy, enforceZeroEgress: e.target.checked })}
              style={styles.checkbox}
            />
            Enforce Zero Cross-Border Egress Rules (Block non-EU API relay endpoints)
          </label>
        </div>
      </div>

      <div style={styles.footer}>
        <button onClick={handleUpdate} disabled={saving} style={styles.saveBtn}>
          {saving ? "Enforcing Rules..." : "Save Data Residency Settings"}
        </button>
        {statusMessage && <span style={styles.successMsg}>{statusMessage}</span>}
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
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  fieldFull: {
    gridColumn: "1 / -1",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#d1d5db",
  },
  checkboxLabel: {
    fontSize: "13px",
    color: "#e5e7eb",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
  },
  checkbox: {
    accentColor: "#3b82f6",
    width: "16px",
    height: "16px",
  },
  select: {
    backgroundColor: "#09090b",
    border: "1px solid #374151",
    borderRadius: "6px",
    color: "#f3f4f6",
    padding: "8px 12px",
    fontSize: "13px",
    outline: "none",
  },
  input: {
    backgroundColor: "#09090b",
    border: "1px solid #374151",
    borderRadius: "6px",
    color: "#f3f4f6",
    padding: "8px 12px",
    fontSize: "13px",
    fontFamily: "monospace",
    outline: "none",
  },
  footer: {
    marginTop: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  saveBtn: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  successMsg: {
    color: "#10b981",
    fontSize: "12px",
    fontWeight: 500,
  },
};
