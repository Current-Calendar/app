import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function TermsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Current Calendar</Text>
        <Text style={styles.title}>Terms and Conditions of Use</Text>
        <Text style={styles.heroText}>
          These terms govern the use of the platform and the user's responsibilities.
        </Text>
      </View>

      <Section
        title="1. Service scope"
        body="Current is a digital service developed as an academic project at the University of Seville that allows users to create, share and manage event calendars. Access to and use of the Platform is subject to acceptance of these Terms, as well as the Privacy and Cookies Policy."
      />

      <Section
        title="2. Users and access"
        bullets={[
          "Requirements: You must be at least 14 years old. By registering, you agree to provide accurate information.",
          "Responsibility: You are solely responsible for the security of your password and for all activities carried out under your account.",
        ]}
      />

      <Section
        title="3. Usage rules and conduct"
        body="The following are expressly prohibited:"
        bullets={[
          "Publishing illegal, offensive, defamatory content, or content that violates third-party rights.",
          "Performing scraping or automated data extraction without authorization.",
          "Interfering with the security or technical operation of the platform.",
          "Spreading malware or engaging in fraudulent activity.",
          "Consequences: Breach of these terms may result in content removal or permanent account closure.",
        ]}
      />

      <Section
        title="4. Content and intellectual property"
        bullets={[
          "Your content: You own what you post, but you grant us a free worldwide license to store and display that content.",
          "Current rights: The design, source code, logos and trademarks belong to the development team. Reproduction is not allowed without permission.",
        ]}
      />

      <Section
        title="5. Limitation of liability"
        bullets={[
          "Service status: The platform is provided as is. As an academic project, we do not guarantee uninterrupted availability or the accuracy of third-party events.",
          "Exclusion: We are not responsible for data loss or unauthorized access resulting from user negligence.",
        ]}
      />

      <Section
        title="6. Suspension and termination"
        bullets={[
          "By you: You may request account deletion at any time.",
          "By us: We may suspend your access for breach of terms or for technical/academic reasons.",
        ]}
      />

      <Section
        title="7. Governing law and jurisdiction"
        body="These Terms are governed by Spanish law (GDPR, LOPDGDD and LSSI-CE). Any dispute shall be submitted to the courts of Seville."
      />

      <Section
        title="Contact and complaints"
        bullets={[
          "Controller: Current development team",
          "Academic project: University of Seville",
          "Contact: support@currentcalendar.es",
        ]}
      />

      <Text style={styles.footer}>Effective date: April 12, 2026</Text>
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
