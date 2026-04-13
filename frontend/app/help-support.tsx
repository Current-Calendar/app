import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const SUPPORT_EMAIL = "support@currentcalendar.es";

export default function HelpSupportScreen() {
  const sendSupportEmail = async () => {
    const subject = encodeURIComponent("Current support request");
    const body = encodeURIComponent("Hello Current support team,\n\nI need help with...");
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    await Linking.openURL(mailtoUrl);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Help & support</Text>
        <Text style={styles.subtitle}>
          If you need help or want to contact the Current team, send us an email and we will get
          back to you as soon as possible.
        </Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrap}>
              <Ionicons name="mail-outline" size={22} color="#10464d" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Contact us</Text>
              <Text style={styles.cardSubtitle}>Send a message to our support inbox.</Text>
            </View>
          </View>

          <Text style={styles.email}>{SUPPORT_EMAIL}</Text>

          <Pressable style={styles.button} onPress={sendSupportEmail}>
            <Text style={styles.buttonText}>Send email</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e7e3d3",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2f2f2f",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#5d5d5d",
    lineHeight: 20,
    marginBottom: 14,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#c9c4b8",
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e9e7e7",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#10464d",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#6e6e6e",
    marginTop: 2,
  },
  email: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2f2f2f",
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#10464d",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
});