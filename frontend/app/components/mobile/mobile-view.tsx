"use client";

import React, { useState } from "react";

export interface MobileMsgUI {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export const MobileViewPanel: React.FC = () => {
  const [activeChannel, setActiveChannel] = useState<string>("engineering-general");
  const [messages, setMessages] = useState<MobileMsgUI[]>([
    { id: "1", sender: "Alex Rivers", text: "Welcome to mobile NexusHub client!", timestamp: "10:00 AM" },
    { id: "2", sender: "Sarah Chen", text: "APNs & FCM push notifications with deep links are live.", timestamp: "10:02 AM" },
  ]);
  const [inputMsg, setInputMsg] = useState<string>("");
  const [showPushBanner, setShowPushBanner] = useState<boolean>(true);
  const [registeredDevice, setRegisteredDevice] = useState<string>("");

  const handleSend = () => {
    if (!inputMsg.trim()) return;
    const newMsg: MobileMsgUI = {
      id: Date.now().toString(),
      sender: "You (Mobile Web)",
      text: inputMsg.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputMsg("");
  };

  const handleRegisterPush = (platform: "ios" | "android") => {
    setRegisteredDevice(`Registered ${platform.toUpperCase()} device push token for APNs/FCM delivery.`);
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <span style={{ fontSize: "20px" }}>📱</span>
          <div>
            <h3 style={styles.title}>Cross-Platform Mobile Application Simulator</h3>
            <p style={styles.subtitle}>Responsive mobile view with APNs / FCM push notification banner & deep-linking</p>
          </div>
        </div>
      </div>

      <div style={styles.deviceWrapper}>
        <div style={styles.phoneMockup}>
          <div style={styles.phoneNotch} />
          
          {/* Mobile Header */}
          <div style={styles.phoneHeader}>
            <div>
              <h4 style={styles.channelTitle}>#{activeChannel}</h4>
              <span style={styles.statusIndicator}>🟢 Connected (Sharded WS Gateway)</span>
            </div>
            <div style={styles.deviceBtnGroup}>
              <button onClick={() => handleRegisterPush("ios")} style={styles.platformBadge}>
                🍎 APNs (iOS)
              </button>
              <button onClick={() => handleRegisterPush("android")} style={styles.platformBadge}>
                🤖 FCM (Android)
              </button>
            </div>
          </div>

          {registeredDevice && <div style={styles.regNotice}>{registeredDevice}</div>}

          {/* Deep Link Push Notification Banner */}
          {showPushBanner && (
            <div style={styles.pushBanner} onClick={() => setShowPushBanner(false)}>
              <div style={styles.pushHeader}>
                <span style={{ fontSize: "14px" }}>🔔</span>
                <strong style={{ fontSize: "12px", color: "#ffffff" }}>#engineering-general • Sarah Chen</strong>
                <span style={{ fontSize: "10px", color: "#818cf8", marginLeft: "auto" }}>Just now</span>
              </div>
              <p style={styles.pushBody}>
                Consistent Hash Ring sharded WebSocket nodes sustain 100,000 active connections!
              </p>
              <span style={styles.deepLinkUri}>nexushub://channel/engineering/thread/t99</span>
            </div>
          )}

          {/* Message List */}
          <div style={styles.messageList}>
            {messages.map((m) => (
              <div key={m.id} style={styles.msgBubble}>
                <div style={styles.msgHeader}>
                  <span style={styles.sender}>{m.sender}</span>
                  <span style={styles.time}>{m.timestamp}</span>
                </div>
                <p style={styles.text}>{m.text}</p>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div style={styles.inputContainer}>
            <input
              type="text"
              placeholder={`Message #${activeChannel}`}
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              style={styles.input}
            />
            <button onClick={handleSend} style={styles.sendBtn}>
              Send
            </button>
          </div>
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
  deviceWrapper: {
    display: "flex",
    justifyContent: "center",
    marginTop: "10px",
  },
  phoneMockup: {
    width: "100%",
    maxWidth: "400px",
    height: "580px",
    backgroundColor: "#000000",
    border: "2px solid #374151",
    borderRadius: "32px",
    padding: "16px 12px 12px 12px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
    position: "relative",
    overflow: "hidden",
  },
  phoneNotch: {
    width: "120px",
    height: "18px",
    backgroundColor: "#1f2937",
    borderRadius: "0 0 10px 10px",
    margin: "-16px auto 10px auto",
  },
  phoneHeader: {
    backgroundColor: "#111827",
    padding: "10px 12px",
    borderRadius: "8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid #1f2937",
  },
  channelTitle: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 800,
    color: "#ffffff",
  },
  statusIndicator: {
    fontSize: "10px",
    color: "#34d399",
  },
  deviceBtnGroup: {
    display: "flex",
    gap: "4px",
  },
  platformBadge: {
    backgroundColor: "#312e81",
    color: "#c7d2fe",
    border: "none",
    padding: "3px 6px",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
  },
  regNotice: {
    marginTop: "6px",
    backgroundColor: "#065f46",
    color: "#a7f3d0",
    fontSize: "11px",
    padding: "4px 8px",
    borderRadius: "4px",
    textAlign: "center",
  },
  pushBanner: {
    marginTop: "8px",
    backgroundColor: "#1e1b4b",
    border: "1px solid #4338ca",
    borderRadius: "8px",
    padding: "10px",
    cursor: "pointer",
  },
  pushHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  pushBody: {
    margin: "4px 0",
    fontSize: "11px",
    color: "#e0e7ff",
  },
  deepLinkUri: {
    fontSize: "10px",
    color: "#a5b4fc",
    fontFamily: "monospace",
  },
  messageList: {
    flex: 1,
    overflowY: "auto",
    padding: "10px 0",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  msgBubble: {
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    borderRadius: "8px",
    padding: "8px 10px",
  },
  msgHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "2px",
  },
  sender: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#60a5fa",
  },
  time: {
    fontSize: "10px",
    color: "#6b7280",
  },
  text: {
    margin: 0,
    fontSize: "12px",
    color: "#f3f4f6",
  },
  inputContainer: {
    display: "flex",
    gap: "6px",
    paddingTop: "8px",
    borderTop: "1px solid #1f2937",
  },
  input: {
    flex: 1,
    backgroundColor: "#09090b",
    border: "1px solid #374151",
    borderRadius: "6px",
    color: "#ffffff",
    padding: "6px 10px",
    fontSize: "12px",
    outline: "none",
  },
  sendBtn: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
