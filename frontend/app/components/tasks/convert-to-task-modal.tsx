"use client";

import React, { useState } from "react";

interface ConvertToTaskModalProps {
  messageId: string;
  initialContent: string;
  onClose: () => void;
  onTaskCreated: (task: { provider: string; key: string; title: string }) => void;
}

export const ConvertToTaskModal: React.FC<ConvertToTaskModalProps> = ({
  messageId,
  initialContent,
  onClose,
  onTaskCreated,
}) => {
  const [provider, setProvider] = useState<"jira" | "linear" | "native">("jira");
  const [taskTitle, setTaskTitle] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      let key = `TASK-${Math.floor(100 + Math.random() * 900)}`;
      if (provider === "jira") key = `JIRA-${Math.floor(1000 + Math.random() * 9000)}`;
      if (provider === "linear") key = `ENG-${Math.floor(100 + Math.random() * 900)}`;

      onTaskCreated({
        provider,
        key,
        title: taskTitle,
      });
      setIsSubmitting(false);
      onClose();
    }, 600);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>📌 Convert Message to Task</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Select Target Provider:</label>
            <div style={styles.providerGrid}>
              <button
                type="button"
                onClick={() => setProvider("jira")}
                style={{
                  ...styles.providerCard,
                  borderColor: provider === "jira" ? "#0052cc" : "#374151",
                  backgroundColor: provider === "jira" ? "#1e3a8a" : "#1f2937",
                }}
              >
                🔷 Atlassian Jira
              </button>
              <button
                type="button"
                onClick={() => setProvider("linear")}
                style={{
                  ...styles.providerCard,
                  borderColor: provider === "linear" ? "#5e6ad2" : "#374151",
                  backgroundColor: provider === "linear" ? "#312e81" : "#1f2937",
                }}
              >
                📐 Linear App
              </button>
              <button
                type="button"
                onClick={() => setProvider("native")}
                style={{
                  ...styles.providerCard,
                  borderColor: provider === "native" ? "#10b981" : "#374151",
                  backgroundColor: provider === "native" ? "#064e3b" : "#1f2937",
                }}
              >
                ⚡ Nexus Tasks
              </button>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Task Summary / Title:</label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.modalFooter}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={styles.submitBtn}>
              {isSubmitting ? "Creating Task..." : `Convert to ${provider.toUpperCase()} Task`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    backgroundColor: "#111827",
    border: "1px solid #1f2937",
    borderRadius: "12px",
    width: "90%",
    maxWidth: "480px",
    padding: "20px",
    color: "#f3f4f6",
    fontFamily: "system-ui, sans-serif",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  modalTitle: {
    fontSize: "16px",
    fontWeight: 700,
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#9ca3af",
    fontSize: "18px",
    cursor: "pointer",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    color: "#9ca3af",
    fontWeight: 600,
  },
  providerGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "8px",
  },
  providerCard: {
    padding: "10px 8px",
    borderRadius: "8px",
    borderWidth: "1px",
    borderStyle: "solid",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "center",
  },
  input: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #374151",
    backgroundColor: "#1f2937",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "8px",
  },
  cancelBtn: {
    padding: "8px 16px",
    borderRadius: "6px",
    border: "1px solid #374151",
    backgroundColor: "transparent",
    color: "#d1d5db",
    fontSize: "13px",
    cursor: "pointer",
  },
  submitBtn: {
    padding: "8px 16px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
};
