import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Current Calendar</Text>
        <Text style={styles.title}>Privacy Notice</Text>
        <Text style={styles.heroText}>
          This document explains what data we process, why we process it and how you can
          exercise your rights.
        </Text>
      </View>

      <Section
        title="1. Data Controller Identity"
        body="The controller of the collected personal data is:"
        bullets={[
          "Controller: Current development team",
          "Academic project - University of Seville",
          "Contact: support@currentcalendar.es",
        ]}
      />

      <Section
        title="2. Data We Process"
        body="We process the data you provide directly (registration, profile, contact) and the data derived from your browsing activity (IP address, cookies, technical logs). We do not process special category data (health, religion, biometrics) unless it is explicitly required for a specific platform feature."
      />

      <Section
        title="3. Purpose and Legal Basis"
        bullets={[
          "Service management: Registration and performance of the user agreement (Art. 6.1.b GDPR).",
          "Support: Handling inquiries and improving the experience (Legitimate interest, Art. 6.1.f GDPR).",
          "Marketing: Sending newsletters or promotions only if you have checked the consent box (Consent, Art. 6.1.a GDPR).",
          "Security: Preventing fraud and cyberattacks (Legitimate interest).",
        ]}
      />

      <Section
        title="4. Recipients"
        body="Your data will not be shared with third parties outside the service, except:"
        bullets={[
          "Processors: Hosting providers, analytics tools, or email services (always under confidentiality agreements).",
          "Legal obligation: Competent authorities, law enforcement, or courts.",
        ]}
      />

      <Section
        title="5. International Transfers"
        body="If our technology providers operate outside the European Economic Area (for example, in the U.S.), we ensure they comply with the EU-U.S. Data Privacy Framework or use Standard Contractual Clauses approved by the European Commission."
      />

      <Section
        title="6. Your Rights"
        body="You have the right to access, rectify, erase, restrict processing, object to processing and data portability."
        bullets={[
          "You can exercise these rights by emailing support@currentcalendar.es.",
          "To verify your identity, include a copy of your ID card or equivalent document.",
          "You may also file a complaint with the Spanish Data Protection Agency (AEPD).",
        ]}
      />

      <Section
        title="7. Retention"
        body="We will keep your data while you do not request its deletion. After the account is closed, the data will remain blocked for the legal limitation periods to address any potential liabilities."
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
