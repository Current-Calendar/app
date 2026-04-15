import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function CookiesPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Current Calendar</Text>
        <Text style={styles.title}>Cookies Policy</Text>
        <Text style={styles.heroText}>
          Here we explain which cookies we use, what they are for and how you can
          manage them.
        </Text>
      </View>

      <Section
        title="1. What is a cookie?"
        body="A cookie is a small text file stored in your browser when you visit our platform. It allows the system to remember your visit, keep your session open and analyze how you interact with the website to improve your experience."
      />

      <Section
        title="2. Cookie controller"
        bullets={[
          "Controller: Current development team",
          "Academic project - University of Seville",
          "Contact: support@currentcalendar.es",
        ]}
      />

      <Section
        title="3. Types of cookies we use"
        bullets={[
          "Technical cookies (necessary): Required for the website to function.",
          "Preference cookies: Remember your settings (such as language or time zone).",
          "Analytics cookies: Tell us how many people visit and which sections are most popular. They are only enabled if you give consent.",
        ]}
      />

      <Section
        title="4. Cookie inventory"
        bullets={[
          "sessionid (First-party): Identify your session. Technical cookie. Session duration.",
          "csrftoken (First-party): CSRF protection. Technical cookie. Duration: 1 year.",
          "cookie_consent (First-party): Remember whether you accepted or rejected cookies. Technical cookie. Duration: 6 months.",
          "_ga (Google): Usage statistics. Analytics cookie. Duration: 2 years.",
          "_gid (Google): Distinguish users. Analytics cookie. Duration: 24 hours.",
        ]}
      />

      <Section
        title="5. How to manage or withdraw consent"
        body="You can change your mind at any time from the platform cookie settings or from your browser privacy settings (Chrome, Firefox, Safari and Edge)."
      />

      <Section
        title="6. International transfers"
        body="When using tools such as Google Analytics, some data may travel to servers in the U.S. We ensure these providers comply with the Data Privacy Framework or have signed the European Union Standard Contractual Clauses."
      />

      <Text style={styles.footer}>Last updated: April 11, 2026</Text>
    </ScrollView>
  );
}

function Section({
  title,
  body,
  bullets,
}: {
  title: string;
  body?: string;
  bullets?: string[];
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!body && <Text style={styles.body}>{body}</Text>}
      {bullets?.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>-</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7EFE6",
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: "#10464D",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  eyebrow: {
    color: "#AEE6DC",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#EAF7F4",
  },
  section: {
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6D8C9",
    padding: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#10464D",
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: "#1A1A1A",
    marginBottom: 2,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
  },
  bulletDot: {
    width: 12,
    color: "#10464D",
    fontWeight: "800",
    fontSize: 14,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#1A1A1A",
  },
  footer: {
    marginTop: 6,
    fontSize: 13,
    color: "#10464D",
    fontWeight: "700",
    textAlign: "right",
  },
});
