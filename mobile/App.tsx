import React, { useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, StatusBar } from "react-native";
import { ChannelView } from "./src/components/channel-view";
import { PushBanner } from "./src/components/push-banner";

export default function App() {
  const [activeChannel, setActiveChannel] = useState("general");
  const [showPushNotification, setShowPushNotification] = useState(true);

  const handleDeepLink = (uri: string) => {
    // Simulated deep link handler: nexushub://channel/engineering/thread/t123
    if (uri.includes("channel/engineering")) {
      setActiveChannel("engineering-general");
    } else {
      setActiveChannel("general");
    }
    setShowPushNotification(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.appHeader}>
        <Text style={styles.appTitle}>NexusHub Mobile</Text>
        <Text style={styles.platformBadge}>iOS & Android (Expo)</Text>
      </View>

      {showPushNotification && (
        <PushBanner
          channelName="engineering-general"
          senderName="Sarah Chen"
          messageText="Consistent Hash Ring sharded WebSocket nodes sustain 100k active connections!"
          deepLinkUri="nexushub://channel/engineering/thread/t99"
          onPress={handleDeepLink}
        />
      )}

      <ChannelView channelName={activeChannel} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  appHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#09090b",
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  appTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  platformBadge: {
    backgroundColor: "#312e81",
    color: "#c7d2fe",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: "700",
  },
});
