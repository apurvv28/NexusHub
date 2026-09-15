import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export interface PushBannerProps {
  channelName: string;
  senderName: string;
  messageText: string;
  deepLinkUri: string;
  onPress: (uri: string) => void;
}

export const PushBanner: React.FC<PushBannerProps> = ({
  channelName,
  senderName,
  messageText,
  deepLinkUri,
  onPress,
}) => {
  return (
    <TouchableOpacity onPress={() => onPress(deepLinkUri)} activeOpacity={0.85} style={styles.bannerContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.icon}>🔔</Text>
        <Text style={styles.title}>#{channelName} • {senderName}</Text>
        <Text style={styles.timeText}>Just now</Text>
      </View>
      <Text style={styles.bodyText} numberOfLines={2}>
        {messageText}
      </Text>
      <Text style={styles.deepLinkText}>Tap to open: {deepLinkUri}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: "#1e1b4b",
    borderColor: "#4338ca",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  icon: {
    fontSize: 16,
    marginRight: 6,
  },
  title: {
    color: "#e0e7ff",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  timeText: {
    color: "#818cf8",
    fontSize: 11,
  },
  bodyText: {
    color: "#f3f4f6",
    fontSize: 13,
    marginBottom: 6,
  },
  deepLinkText: {
    color: "#a5b4fc",
    fontSize: 11,
    fontFamily: "monospace",
  },
});
