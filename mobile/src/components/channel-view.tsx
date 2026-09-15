import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from "react-native";

export interface MobileMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export interface ChannelViewProps {
  channelName: string;
}

export const ChannelView: React.FC<ChannelViewProps> = ({ channelName }) => {
  const [messages, setMessages] = useState<MobileMessage[]>([
    { id: "1", sender: "Alex Rivers", text: "Welcome to mobile NexusHub client!", timestamp: "10:00 AM" },
    { id: "2", sender: "Sarah Chen", text: "APNs & FCM push notifications with deep links are live.", timestamp: "10:02 AM" },
  ]);
  const [inputText, setInputText] = useState("");

  const handleSend = () => {
    if (!inputText.trim()) return;
    const newMsg: MobileMessage = {
      id: Date.now().toString(),
      sender: "You (Mobile)",
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
  };

  return (
    <View style={styles.container}>
      <View style={styles.channelHeader}>
        <Text style={styles.channelTitle}>#{channelName}</Text>
        <Text style={styles.channelSub}>Sharded Gateway WS Connected</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.messageBubble}>
            <View style={styles.msgHeader}>
              <Text style={styles.senderText}>{item.sender}</Text>
              <Text style={styles.timeText}>{item.timestamp}</Text>
            </View>
            <Text style={styles.msgText}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.inputContainer}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder={`Message #${channelName}`}
          placeholderTextColor="#6b7280"
          style={styles.textInput}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  channelHeader: {
    padding: 16,
    backgroundColor: "#111827",
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  channelTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  channelSub: {
    color: "#10b981",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
  },
  messageBubble: {
    backgroundColor: "#18181b",
    borderColor: "#27272a",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  msgHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  senderText: {
    color: "#60a5fa",
    fontWeight: "700",
    fontSize: 13,
  },
  timeText: {
    color: "#6b7280",
    fontSize: 11,
  },
  msgText: {
    color: "#f3f4f6",
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#111827",
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#09090b",
    borderColor: "#374151",
    borderWidth: 1,
    borderRadius: 8,
    color: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  sendButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
});
