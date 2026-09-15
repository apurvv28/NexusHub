"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase-client";
import { HuddleRoom } from "./huddle/huddle-room";
import { CalendarEventWidget } from "./calendar/calendar-event-widget";
import { ConvertToTaskModal } from "./tasks/convert-to-task-modal";
import { ScheduledMessagesPanel } from "./messages/scheduled-messages-panel";
import { SSOConfigPanel } from "./enterprise/sso-config-panel";
import { SCIMTokenPanel } from "./enterprise/scim-token-panel";
import { AuditLogViewer } from "./enterprise/audit-log-viewer";
import { RetentionPolicyPanel } from "./enterprise/retention-policy-panel";
import { DataResidencyPanel } from "./enterprise/data-residency-panel";
import { TenantGraduationPanel } from "./enterprise/tenant-graduation-panel";
import { DisasterRecoveryPanel } from "./enterprise/disaster-recovery-panel";
import { DeveloperPortal } from "./developer/developer-portal";
import { MobileViewPanel } from "./mobile/mobile-view";

export interface SlackMessageUI {
  id: string;
  user: string;
  avatar: string;
  role: string;
  timestamp: string;
  text: string;
  reactions: Array<{ emoji: string; count: number; userReacted?: boolean }>;
  replyCount?: number;
}

export interface SlackChannelUI {
  id: string;
  name: string;
  unreadCount?: number;
  isPrivate?: boolean;
}

export const SlackWorkspace: React.FC = () => {
  const [channels, setChannels] = useState<SlackChannelUI[]>([
    { id: "c_eng", name: "engineering-general", unreadCount: 2 },
    { id: "c_gen", name: "general" },
    { id: "c_hud", name: "huddle-lounge" },
    { id: "c_sec", name: "security-compliance", isPrivate: true },
  ]);

  const [activeChannel, setActiveChannel] = useState<string>("engineering-general");
  const [activeSidePanel, setActiveSidePanel] = useState<"enterprise" | "developer" | "collaboration" | "mobile" | "closed">("enterprise");
  const [showHuddleModal, setShowHuddleModal] = useState<boolean>(false);
  const [showTaskModal, setShowTaskModal] = useState<boolean>(false);
  const [showNewChannelModal, setShowNewChannelModal] = useState<boolean>(false);
  const [newChannelName, setNewChannelName] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [messageInput, setMessageInput] = useState<string>("");

  const [messages, setMessages] = useState<SlackMessageUI[]>([
    {
      id: "m1",
      user: "Alex Rivers",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      role: "Lead Systems Architect",
      timestamp: "10:15 AM",
      text: "Welcome to NexusHub Slack workspace! All 6 phases are operational: Postgres RLS, WebRTC SFU Voice/Video Huddles, SCIM 2.0, Consistent Hash Ring WS Sharding (100k connections), and OAuth 2.0 Developer Platform.",
      reactions: [
        { emoji: "🚀", count: 8, userReacted: false },
        { emoji: "🙌", count: 5, userReacted: false },
      ],
      replyCount: 3,
    },
    {
      id: "m2",
      user: "Sarah Chen",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
      role: "Principal DevOps Engineer",
      timestamp: "10:18 AM",
      text: "AWS Compute Optimizer & S3 Glacier lifecycle workers have reduced unit cost per seat by 45.9%. S3 attachments older than 90 days are automatically migrated to Glacier Instant Retrieval.",
      reactions: [{ emoji: "⚡", count: 12, userReacted: false }],
    },
    {
      id: "m3",
      user: "Nexus AI Assistant",
      avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
      role: "AI Workspace Bot",
      timestamp: "10:20 AM",
      text: "🤖 Type `/ask-ai [question]` or `/remind [text]` to trigger natural language workspace searches or schedule reminders across channels.",
      reactions: [{ emoji: "💡", count: 4, userReacted: false }],
    },
  ]);

  const [createdTasks, setCreatedTasks] = useState<Array<{ provider: string; key: string; title: string }>>([
    { provider: "jira", key: "NEXUS-104", title: "Review WebRTC SFU Media Gateway latency metrics" },
  ]);

  // Load live channels & messages from Supabase on mount
  useEffect(() => {
    async function loadSupabaseData() {
      try {
        const { data: dbChannels } = await supabase.from("channels").select("*");
        if (dbChannels && dbChannels.length > 0) {
          setChannels(
            dbChannels.map((c: any) => ({
              id: c.id,
              name: c.name,
              isPrivate: c.is_private,
            }))
          );
        }

        const { data: dbMessages } = await supabase
          .from("messages")
          .select("*, users(full_name, avatar_url)")
          .order("created_at", { ascending: true });

        if (dbMessages && dbMessages.length > 0) {
          setMessages(
            dbMessages.map((m: any) => ({
              id: m.id,
              user: m.users?.full_name || "Nexus User",
              avatar: m.users?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
              role: "Workspace Member",
              timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              text: m.content,
              reactions: [],
            }))
          );
        }
      } catch (err) {
        console.log("[SlackWorkspace] Supabase fallback to local state.");
      }
    }

    loadSupabaseData();
  }, []);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    const text = messageInput.trim();

    // Check for Slash Commands (/ask-ai or /remind)
    if (text.startsWith("/ask-ai ")) {
      const question = text.replace("/ask-ai ", "");
      const userMsg: SlackMessageUI = {
        id: `m_${Date.now()}`,
        user: "You (Software Engineer)",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
        role: "Senior Engineer",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text,
        reactions: [],
      };
      const aiResponse: SlackMessageUI = {
        id: `ai_${Date.now()}`,
        user: "Nexus AI Assistant",
        avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
        role: "AI Workspace Bot",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: `🤖 **Nexus AI RAG Response for "${question}"**:\nNexusHub indexes all channels using vector embeddings. Related context retrieved from architecture spec ADR-0008. All 6 phases are active!`,
        reactions: [{ emoji: "💡", count: 1, userReacted: false }],
      };
      setMessages((prev) => [...prev, userMsg, aiResponse]);
      setMessageInput("");
      return;
    }

    if (text.startsWith("/remind ")) {
      const reminderText = text.replace("/remind ", "");
      const userMsg: SlackMessageUI = {
        id: `m_${Date.now()}`,
        user: "You (Software Engineer)",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
        role: "Senior Engineer",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text,
        reactions: [],
      };
      const botMsg: SlackMessageUI = {
        id: `rem_${Date.now()}`,
        user: "Slackbot",
        avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
        role: "Slack System Bot",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: `⏰ Scheduled reminder: "${reminderText}". I'll remind you in #${activeChannel}!`,
        reactions: [{ emoji: "⏰", count: 1, userReacted: false }],
      };
      setMessages((prev) => [...prev, userMsg, botMsg]);
      setMessageInput("");
      return;
    }

    // Standard message send
    const newMsg: SlackMessageUI = {
      id: `m_${Date.now()}`,
      user: "You (Software Engineer)",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      role: "Senior Engineer",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text,
      reactions: [],
    };

    setMessages((prev) => [...prev, newMsg]);
    setMessageInput("");

    // Persist live to Supabase if connected
    try {
      await supabase.from("messages").insert({
        content: text,
        channel_id: "00000000-0000-0000-0000-000000000001",
        workspace_id: "a0000000-0000-0000-0000-00000000000a",
      });
    } catch (e) {
      // Ignored if local state handles display
    }
  };

  const handleToggleReaction = (msgId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const existingReaction = m.reactions.find((r) => r.emoji === emoji);
        if (existingReaction) {
          const updated = m.reactions.map((r) =>
            r.emoji === emoji
              ? {
                  ...r,
                  count: r.userReacted ? r.count - 1 : r.count + 1,
                  userReacted: !r.userReacted,
                }
              : r
          );
          return { ...m, reactions: updated.filter((r) => r.count > 0) };
        } else {
          return {
            ...m,
            reactions: [...m.reactions, { emoji, count: 1, userReacted: true }],
          };
        }
      })
    );
  };

  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return;
    const cleanName = newChannelName.toLowerCase().replace(/\s+/g, "-");
    const newChan: SlackChannelUI = {
      id: `c_${Date.now()}`,
      name: cleanName,
    };
    setChannels((prev) => [...prev, newChan]);
    setActiveChannel(cleanName);
    setNewChannelName("");
    setShowNewChannelModal(false);
  };

  const filteredMessages = searchQuery
    ? messages.filter((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()) || m.user.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div style={styles.slackContainer}>
      {/* 1. FAR-LEFT ACTIVITY RAIL */}
      <aside style={styles.rail}>
        <div style={styles.railLogo}>
          <span style={{ fontSize: "20px" }}>⚡</span>
        </div>

        <div style={styles.railNav}>
          <button style={{ ...styles.railBtn, ...styles.railBtnActive }} title="Home">
            <span style={{ fontSize: "18px" }}>🏠</span>
            <span style={styles.railLabel}>Home</span>
          </button>
          <button onClick={() => setActiveSidePanel("enterprise")} style={styles.railBtn} title="Enterprise">
            <span style={{ fontSize: "18px" }}>🏢</span>
            <span style={styles.railLabel}>Enterprise</span>
          </button>
          <button onClick={() => setActiveSidePanel("developer")} style={styles.railBtn} title="Developer">
            <span style={{ fontSize: "18px" }}>🛠️</span>
            <span style={styles.railLabel}>Dev Tools</span>
          </button>
          <button onClick={() => setActiveSidePanel("collaboration")} style={styles.railBtn} title="Huddles">
            <span style={{ fontSize: "18px" }}>🎙️</span>
            <span style={styles.railLabel}>Huddles</span>
          </button>
          <button onClick={() => setActiveSidePanel("mobile")} style={styles.railBtn} title="Mobile View">
            <span style={{ fontSize: "18px" }}>📱</span>
            <span style={styles.railLabel}>Mobile</span>
          </button>
        </div>

        <div style={styles.railFooter}>
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
            alt="Profile"
            style={styles.avatarMini}
          />
        </div>
      </aside>

      {/* 2. SLACK CHANNELS & DMS SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.workspaceDropdown}>
            <span style={styles.workspaceTitle}>NexusHub Enterprise</span>
            <span style={{ fontSize: "12px", color: "#9ca3af" }}>▼</span>
          </div>
          <button onClick={() => setShowNewChannelModal(true)} style={styles.newMsgBtn} title="New Channel">
            ✏️
          </button>
        </div>

        <div style={styles.sidebarSection}>
          <div style={styles.sectionHeader}>
            <span>Channels</span>
            <span onClick={() => setShowNewChannelModal(true)} style={styles.plusIcon}>+</span>
          </div>

          <div style={styles.channelList}>
            {channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.name)}
                style={{
                  ...styles.channelItem,
                  ...(activeChannel === ch.name ? styles.channelItemActive : {}),
                }}
              >
                <span>{ch.isPrivate ? "🔒" : "#"}</span>
                <span style={styles.channelName}>{ch.name}</span>
                {ch.unreadCount && <span style={styles.badgeUnread}>{ch.unreadCount}</span>}
              </button>
            ))}
          </div>
        </div>

        <div style={{ ...styles.sidebarSection, marginTop: "20px" }}>
          <div style={styles.sectionHeader}>
            <span>Direct Messages</span>
            <span style={styles.plusIcon}>+</span>
          </div>

          <div style={styles.channelList}>
            <div style={styles.dmItem}>
              <span style={styles.onlineDot} />
              <span>Alex Rivers</span>
            </div>
            <div style={styles.dmItem}>
              <span style={styles.onlineDot} />
              <span>Sarah Chen</span>
            </div>
            <div style={styles.dmItem}>
              <span style={styles.botDot}>🤖</span>
              <span>Nexus AI Assistant</span>
            </div>
            <div style={styles.dmItem}>
              <span style={styles.botDot}>⚙️</span>
              <span>Jira Integration Bot</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 3. MAIN WORKSPACE VIEW */}
      <main style={styles.mainContent}>
        {/* TOP CHANNEL HEADER */}
        <header style={styles.chatHeader}>
          <div style={styles.channelInfo}>
            <h2 style={styles.channelHeaderTitle}>#{activeChannel}</h2>
            <span style={styles.channelStar}>⭐</span>
            <span style={styles.memberCount}>42 members</span>
          </div>

          <div style={styles.headerActions}>
            <button onClick={() => setShowHuddleModal(!showHuddleModal)} style={styles.huddleBtn}>
              🎙️ {showHuddleModal ? "Leave Huddle" : "Start Huddle"}
            </button>
            <div style={styles.searchBarWrapper}>
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>🔍</span>
              <input
                type="text"
                placeholder="Search NexusHub..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>
        </header>

        {/* ACTIVE HUDDLE ROOM BANNER / OVERLAY */}
        {showHuddleModal && (
          <div style={styles.huddleSection}>
            <HuddleRoom
              huddleId="huddle_demo_1"
              workspaceId="ws_nexus_corp"
              channelId={activeChannel}
              channelName={activeChannel}
              currentUserId="user_dev_host"
              currentUserName="You (Software Engineer)"
            />
          </div>
        )}

        {/* MESSAGES STREAM */}
        <div style={styles.messagesStream}>
          {filteredMessages.map((msg) => (
            <div key={msg.id} style={styles.messageRow}>
              <img src={msg.avatar} alt={msg.user} style={styles.userAvatar} />
              <div style={styles.messageContent}>
                <div style={styles.msgUserHeader}>
                  <span style={styles.userName}>{msg.user}</span>
                  <span style={styles.userRole}>{msg.role}</span>
                  <span style={styles.msgTime}>{msg.timestamp}</span>
                </div>
                <p style={styles.msgBody}>{msg.text}</p>

                {/* Interactive Reactions Bar */}
                <div style={styles.reactionGroup}>
                  {msg.reactions.map((r, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleToggleReaction(msg.id, r.emoji)}
                      style={{
                        ...styles.reactionPill,
                        ...(r.userReacted ? styles.reactionPillActive : {}),
                      }}
                    >
                      {r.emoji} {r.count}
                    </button>
                  ))}
                  <button onClick={() => handleToggleReaction(msg.id, "👍")} style={styles.addReactionBtn}>
                    +👍
                  </button>
                  <button onClick={() => handleToggleReaction(msg.id, "🚀")} style={styles.addReactionBtn}>
                    +🚀
                  </button>
                  <button onClick={() => handleToggleReaction(msg.id, "❤️")} style={styles.addReactionBtn}>
                    +❤️
                  </button>
                </div>

                {msg.replyCount && (
                  <div style={styles.replyThreadLink}>
                    <span>💬 {msg.replyCount} replies</span>
                    <span style={{ fontSize: "11px", color: "#818cf8" }}>Last reply 5m ago</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* RICH MESSAGE COMPOSER */}
        <div style={styles.composerWrapper}>
          <div style={styles.composerBox}>
            <textarea
              placeholder={`Message #${activeChannel} (Try /ask-ai or /remind)`}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              style={styles.composerTextarea}
              rows={2}
            />
            <div style={styles.composerToolbar}>
              <div style={styles.toolbarIcons}>
                <button onClick={() => setMessageInput((prev) => `${prev} /ask-ai `)} style={styles.toolBtn}>
                  🤖 /ask-ai
                </button>
                <button onClick={() => setMessageInput((prev) => `${prev} /remind `)} style={styles.toolBtn}>
                  ⏰ /remind
                </button>
                <button onClick={() => setShowTaskModal(true)} style={styles.toolBtn} title="Convert to Task">
                  📌 Convert to Task
                </button>
              </div>
              <button onClick={handleSendMessage} style={styles.sendMsgBtn}>
                Send
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 4. RIGHT SIDE FEATURE INSPECTOR PANEL */}
      {activeSidePanel !== "closed" && (
        <aside style={styles.inspectorPanel}>
          <div style={styles.inspectorHeader}>
            <div style={styles.inspectorTabs}>
              <button
                onClick={() => setActiveSidePanel("enterprise")}
                style={{ ...styles.inspectorTabBtn, ...(activeSidePanel === "enterprise" ? styles.inspectorTabActive : {}) }}
              >
                🏢 Enterprise
              </button>
              <button
                onClick={() => setActiveSidePanel("developer")}
                style={{ ...styles.inspectorTabBtn, ...(activeSidePanel === "developer" ? styles.inspectorTabActive : {}) }}
              >
                🛠️ Dev Tools
              </button>
              <button
                onClick={() => setActiveSidePanel("collaboration")}
                style={{ ...styles.inspectorTabBtn, ...(activeSidePanel === "collaboration" ? styles.inspectorTabActive : {}) }}
              >
                🎙️ Huddles
              </button>
              <button
                onClick={() => setActiveSidePanel("mobile")}
                style={{ ...styles.inspectorTabBtn, ...(activeSidePanel === "mobile" ? styles.inspectorTabActive : {}) }}
              >
                📱 Mobile
              </button>
            </div>
            <button onClick={() => setActiveSidePanel("closed")} style={styles.closeBtn}>✕</button>
          </div>

          <div style={styles.inspectorContent}>
            {activeSidePanel === "enterprise" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <SSOConfigPanel />
                <SCIMTokenPanel />
                <DataResidencyPanel />
                <TenantGraduationPanel />
                <DisasterRecoveryPanel />
                <RetentionPolicyPanel />
                <AuditLogViewer />
              </div>
            )}

            {activeSidePanel === "developer" && <DeveloperPortal />}

            {activeSidePanel === "collaboration" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <CalendarEventWidget
                  id="e1"
                  title="Phase 6 Slack Integration Review"
                  timeRange="Today, 5:00 PM - 6:00 PM"
                  location="Nexus Huddle Room"
                  organizer="Alex Rivers"
                  provider="google"
                />
                <ScheduledMessagesPanel />
              </div>
            )}

            {activeSidePanel === "mobile" && <MobileViewPanel />}
          </div>
        </aside>
      )}

      {/* TASK CONVERSION MODAL */}
      {showTaskModal && (
        <ConvertToTaskModal
          messageId="m1"
          initialContent="Review WebRTC SFU Media Gateway latency metrics and Consistent Hash Ring sharding"
          onClose={() => setShowTaskModal(false)}
          onTaskCreated={(newTask) => setCreatedTasks((prev) => [...prev, newTask])}
        />
      )}

      {/* CREATE NEW CHANNEL MODAL */}
      {showNewChannelModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={{ margin: "0 0 12px 0", color: "#ffffff" }}>Create a Channel</h3>
            <p style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "16px" }}>
              Channels are where your team communicates. They are best organized around a topic (e.g. #lead-dev).
            </p>
            <input
              type="text"
              placeholder="e.g. plan-launch"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              style={styles.modalInput}
            />
            <div style={styles.modalActions}>
              <button onClick={() => setShowNewChannelModal(false)} style={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleCreateChannel} style={styles.createChanBtn}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  slackContainer: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    backgroundColor: "#1A1D21",
    color: "#D1D2D3",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    overflow: "hidden",
  },

  /* 1. RAIL */
  rail: {
    width: "64px",
    backgroundColor: "#121016",
    borderRight: "1px solid #222529",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "12px 0",
  },
  railLogo: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    backgroundColor: "#611f69",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
  },
  railNav: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "100%",
  },
  railBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "#ABABAD",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "8px 0",
    cursor: "pointer",
    fontSize: "10px",
  },
  railBtnActive: {
    color: "#ffffff",
    backgroundColor: "#222529",
  },
  railLabel: {
    marginTop: "2px",
    fontWeight: 600,
  },
  railFooter: {
    marginTop: "auto",
  },
  avatarMini: {
    width: "32px",
    height: "32px",
    borderRadius: "6px",
  },

  /* 2. SIDEBAR */
  sidebar: {
    width: "240px",
    backgroundColor: "#19171D",
    borderRight: "1px solid #222529",
    display: "flex",
    flexDirection: "column",
  },
  sidebarHeader: {
    padding: "14px 16px",
    borderBottom: "1px solid #222529",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  workspaceDropdown: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
  },
  workspaceTitle: {
    fontSize: "15px",
    fontWeight: 800,
    color: "#ffffff",
  },
  newMsgBtn: {
    backgroundColor: "#222529",
    border: "none",
    color: "#ffffff",
    borderRadius: "50%",
    width: "28px",
    height: "28px",
    cursor: "pointer",
  },
  sidebarSection: {
    padding: "16px 12px 0 12px",
  },
  sectionHeader: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#ABABAD",
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  plusIcon: {
    cursor: "pointer",
  },
  channelList: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  channelItem: {
    backgroundColor: "transparent",
    border: "none",
    color: "#ABABAD",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 10px",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
    textAlign: "left",
  },
  channelItemActive: {
    backgroundColor: "#1164A3",
    color: "#ffffff",
    fontWeight: 700,
  },
  channelName: {
    flex: 1,
  },
  badgeUnread: {
    backgroundColor: "#cd2553",
    color: "#ffffff",
    fontSize: "10px",
    fontWeight: 800,
    padding: "2px 6px",
    borderRadius: "10px",
  },
  dmItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 10px",
    fontSize: "13px",
    color: "#D1D2D3",
    cursor: "pointer",
  },
  onlineDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#2BAC76",
  },
  botDot: {
    fontSize: "11px",
  },

  /* 3. MAIN WORKSPACE */
  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#1A1D21",
  },
  chatHeader: {
    height: "56px",
    borderBottom: "1px solid #222529",
    padding: "0 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  channelInfo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  channelHeaderTitle: {
    fontSize: "16px",
    fontWeight: 800,
    color: "#ffffff",
    margin: 0,
  },
  channelStar: {
    fontSize: "14px",
    cursor: "pointer",
  },
  memberCount: {
    fontSize: "12px",
    color: "#ABABAD",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  huddleBtn: {
    backgroundColor: "#007a5a",
    color: "#ffffff",
    border: "none",
    padding: "6px 14px",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "12px",
    cursor: "pointer",
  },
  searchBarWrapper: {
    backgroundColor: "#222529",
    borderRadius: "6px",
    padding: "4px 10px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    width: "220px",
  },
  searchInput: {
    backgroundColor: "transparent",
    border: "none",
    color: "#ffffff",
    fontSize: "12px",
    outline: "none",
    width: "100%",
  },
  huddleSection: {
    padding: "16px 20px",
    borderBottom: "1px solid #222529",
  },

  /* MESSAGES STREAM */
  messagesStream: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  messageRow: {
    display: "flex",
    gap: "12px",
  },
  userAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    objectFit: "cover",
  },
  messageContent: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  msgUserHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  userName: {
    fontWeight: 800,
    fontSize: "14px",
    color: "#ffffff",
  },
  userRole: {
    fontSize: "10px",
    backgroundColor: "#222529",
    color: "#ABABAD",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  msgTime: {
    fontSize: "11px",
    color: "#ABABAD",
  },
  msgBody: {
    margin: 0,
    fontSize: "14px",
    color: "#D1D2D3",
    lineHeight: 1.5,
  },
  reactionGroup: {
    display: "flex",
    gap: "6px",
    marginTop: "4px",
    alignItems: "center",
  },
  reactionPill: {
    backgroundColor: "#222529",
    border: "1px solid #383b40",
    color: "#D1D2D3",
    padding: "2px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    cursor: "pointer",
  },
  reactionPillActive: {
    backgroundColor: "#1164A3",
    borderColor: "#2eb886",
    color: "#ffffff",
    fontWeight: 700,
  },
  addReactionBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "#ABABAD",
    fontSize: "11px",
    cursor: "pointer",
  },
  replyThreadLink: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "4px",
    fontSize: "12px",
    fontWeight: 700,
    color: "#60a5fa",
    cursor: "pointer",
  },

  /* COMPOSER */
  composerWrapper: {
    padding: "16px 20px",
  },
  composerBox: {
    backgroundColor: "#222529",
    border: "1px solid #383b40",
    borderRadius: "8px",
    padding: "10px",
  },
  composerTextarea: {
    width: "100%",
    backgroundColor: "transparent",
    border: "none",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none",
    resize: "none",
    fontFamily: "inherit",
  },
  composerToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "8px",
    borderTop: "1px solid #2c2f35",
    paddingTop: "6px",
  },
  toolbarIcons: {
    display: "flex",
    gap: "8px",
  },
  toolBtn: {
    backgroundColor: "#19171D",
    border: "1px solid #383b40",
    color: "#60a5fa",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  sendMsgBtn: {
    backgroundColor: "#007a5a",
    color: "#ffffff",
    border: "none",
    padding: "6px 14px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },

  /* 4. INSPECTOR PANEL */
  inspectorPanel: {
    width: "480px",
    backgroundColor: "#121016",
    borderLeft: "1px solid #222529",
    display: "flex",
    flexDirection: "column",
  },
  inspectorHeader: {
    padding: "10px 14px",
    borderBottom: "1px solid #222529",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inspectorTabs: {
    display: "flex",
    gap: "6px",
  },
  inspectorTabBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "#ABABAD",
    fontSize: "12px",
    fontWeight: 700,
    padding: "4px 8px",
    borderRadius: "4px",
    cursor: "pointer",
  },
  inspectorTabActive: {
    backgroundColor: "#222529",
    color: "#ffffff",
  },
  closeBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "#ABABAD",
    fontSize: "14px",
    cursor: "pointer",
  },
  inspectorContent: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
  },

  /* MODALS */
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalBox: {
    backgroundColor: "#19171D",
    border: "1px solid #383b40",
    borderRadius: "12px",
    padding: "24px",
    width: "400px",
    color: "#ffffff",
  },
  modalInput: {
    width: "100%",
    backgroundColor: "#222529",
    border: "1px solid #383b40",
    borderRadius: "6px",
    padding: "10px",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none",
    marginBottom: "20px",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
  },
  cancelBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "#ABABAD",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  createChanBtn: {
    backgroundColor: "#007a5a",
    color: "#ffffff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
