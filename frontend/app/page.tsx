"use client";

import React, { useState } from "react";
import { HuddleRoom } from "./components/huddle/huddle-room";
import { CalendarEventWidget } from "./components/calendar/calendar-event-widget";
import { ConvertToTaskModal } from "./components/tasks/convert-to-task-modal";
import { ScheduledMessagesPanel } from "./components/messages/scheduled-messages-panel";
import { SSOConfigPanel } from "./components/enterprise/sso-config-panel";
import { SCIMTokenPanel } from "./components/enterprise/scim-token-panel";
import { AuditLogViewer } from "./components/enterprise/audit-log-viewer";
import { RetentionPolicyPanel } from "./components/enterprise/retention-policy-panel";
import { DataResidencyPanel } from "./components/enterprise/data-residency-panel";
import { TenantGraduationPanel } from "./components/enterprise/tenant-graduation-panel";
import { DisasterRecoveryPanel } from "./components/enterprise/disaster-recovery-panel";
import { DeveloperPortal } from "./components/developer/developer-portal";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"collaboration" | "enterprise" | "developer">("developer");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [createdTasks, setCreatedTasks] = useState<Array<{ provider: string; key: string; title: string }>>([
    { provider: "jira", key: "NEXUS-104", title: "Review WebRTC SFU Media Gateway latency metrics" },
  ]);

  return (
    <div style={{ backgroundColor: "#000000", minHeight: "100vh", padding: "32px 16px", color: "#f4f4f5", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ textAlign: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#ffffff", margin: "0 0 8px 0" }}>
          NexusHub — Enterprise Platform
        </h1>
        <p style={{ color: "#a1a1aa", fontSize: "14px", margin: "0 0 20px 0" }}>
          Real-Time Voice/Video Huddles, SAML/OIDC SSO, SCIM 2.0, SIEM Audit Logging & Developer Platform
        </p>

        {/* Tab Navigation */}
        <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveTab("developer")}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: activeTab === "developer" ? "#2563eb" : "#1f2937",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            🛠️ Phase 6: Developer Platform & Cost Optimization
          </button>
          <button
            onClick={() => setActiveTab("enterprise")}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: activeTab === "enterprise" ? "#2563eb" : "#1f2937",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            🏢 Phase 5: Enterprise & Compliance
          </button>
          <button
            onClick={() => setActiveTab("collaboration")}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: activeTab === "collaboration" ? "#2563eb" : "#1f2937",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            🎙️ Phase 4: WebRTC & Collaboration
          </button>
        </div>
      </header>

      <main style={{ maxWidth: "960px", margin: "0 auto" }}>
        {activeTab === "developer" ? (
          /* Phase 6: Developer Platform & Infrastructure Cost Optimization Dashboard */
          <DeveloperPortal />
        ) : activeTab === "enterprise" ? (
          /* Phase 5: Enterprise Readiness & Compliance Dashboard */
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))", gap: "20px" }}>
              <SSOConfigPanel />
              <SCIMTokenPanel />
            </div>

            <DataResidencyPanel />
            <TenantGraduationPanel />
            <DisasterRecoveryPanel />
            <RetentionPolicyPanel />
            <AuditLogViewer />
          </div>
        ) : (
          /* Phase 4: WebRTC Huddles & Collaboration Dashboard */
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            <section>
              <HuddleRoom
                huddleId="huddle_demo_1"
                workspaceId="ws_nexus_corp"
                channelId="channel_eng_general"
                channelName="engineering-general"
                currentUserId="user_dev_host"
                currentUserName="You (Software Engineer)"
              />
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#e4e4e7", marginBottom: "12px" }}>
                  📅 Channel Calendar RSVP Widget
                </h3>
                <CalendarEventWidget
                  id="event_1"
                  title="Phase 5 Architecture & Compliance Sync"
                  timeRange="Today, 4:00 PM - 5:00 PM"
                  location="Nexus Huddle Room"
                  organizer="Alex Rivers"
                  provider="google"
                />
              </div>

              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#e4e4e7", marginBottom: "12px" }}>
                  ⏱️ Scheduled Messages Engine
                </h3>
                <ScheduledMessagesPanel />
              </div>
            </section>

            <section style={{ backgroundColor: "#111827", padding: "20px", borderRadius: "12px", border: "1px solid #1f2937" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>
                  📌 Convert Message to Task (Jira / Linear / Native)
                </h3>
                <button
                  onClick={() => setShowTaskModal(true)}
                  style={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ➕ Convert Sample Message to Task
                </button>
              </div>

              <div style={{ backgroundColor: "#1f2937", padding: "14px", borderRadius: "8px", border: "1px solid #374151", marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "4px" }}>
                  <strong>Alex Rivers</strong> in #engineering-general:
                </div>
                <p style={{ margin: 0, fontSize: "14px", color: "#e5e7eb" }}>
                  "Please review the PR for /remind natural language parser and scheduled message delivery worker."
                </p>
              </div>

              <div>
                <div style={{ fontSize: "13px", color: "#9ca3af", fontWeight: 600, marginBottom: "8px" }}>
                  Converted Tasks Tracker ({createdTasks.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {createdTasks.map((t, idx) => (
                    <div key={idx} style={{ backgroundColor: "#09090b", padding: "10px 14px", borderRadius: "6px", border: "1px solid #27272a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px" }}>
                        <strong style={{ color: "#60a5fa" }}>[{t.key}]</strong> {t.title}
                      </span>
                      <span style={{ backgroundColor: "#312e81", color: "#c7d2fe", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", textTransform: "uppercase" }}>
                        {t.provider}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {showTaskModal && (
        <ConvertToTaskModal
          messageId="msg_alex_pr_review"
          initialContent="Review the PR for /remind natural language parser and scheduled message delivery worker"
          onClose={() => setShowTaskModal(false)}
          onTaskCreated={(newTask) => setCreatedTasks((prev) => [...prev, newTask])}
        />
      )}
    </div>
  );
}
