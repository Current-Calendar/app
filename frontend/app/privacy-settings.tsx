import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type LegalDocKey = "privacy" | "cookies" | "terms";

type LegalSection = {
  heading: string;
  body?: string;
  bullets?: string[];
};

type LegalDoc = {
  title: string;
  sections: LegalSection[];
};

const LEGAL_DOCS: Record<LegalDocKey, LegalDoc> = {
  privacy: {
    title: "Privacy Notice",
    sections: [
      {
        heading: "1. Data Controller Identity",
        body: "The controller of the personal data collected through the platform is the Current development team (an academic project of the University of Seville).",
        bullets: [
          "Contact: support@currentcalendar.es",
          "Request channel: Settings > Help & support > Contact us",
        ],
      },
      {
        heading: "2. Data We Process",
        body: "We process data provided by the user (registration, profile, contact details) and technical usage data (IP, activity, security logs, and app usage).",
      },
      {
        heading: "3. Purpose and Legal Basis",
        bullets: [
          "Service delivery and account management.",
          "Security and fraud prevention.",
          "Support and user assistance.",
          "Compliance with applicable legal obligations.",
        ],
      },
      {
        heading: "4. User Rights",
        body: "You may exercise, among others, your rights of access, rectification, erasure, objection, restriction, and portability.",
        bullets: [
          "Right of access: you can request a copy of your processed data.",
          "Right to be forgotten: you can request deletion of your account and related data when legally applicable.",
          "To request access or the right to be forgotten, email us from Contact us (Settings > Help & support) at support@currentcalendar.es.",
        ],
      },
      {
        heading: "5. Retention",
        body: "Data is retained for as long as necessary to provide the service and meet legal obligations. After account closure, data is blocked for the legally required periods.",
      },
    ],
  },
  cookies: {
    title: "Cookies Policy",
    sections: [
      {
        heading: "1. What Cookies Are",
        body: "Cookies are small text files stored on your device to enable technical functions, remember preferences, and, where applicable, measure app usage.",
      },
      {
        heading: "2. Types of Cookies",
        bullets: [
          "Technical/necessary: essential for authentication, security, and core operation.",
          "Preferences: store user settings.",
          "Analytics: help understand usage and improve the experience.",
        ],
      },
      {
        heading: "3. Consent Management",
        body: "You can accept or reject non-essential cookies and change your choice at any time from settings and/or your browser.",
      },
      {
        heading: "4. Retention and Third Parties",
        body: "Each cookie may have a different duration. If third-party analytics services are used, their policies and data protection safeguards apply.",
      },
    ],
  },
  terms: {
    title: "Terms and Conditions",
    sections: [
      {
        heading: "1. Scope of the Service",
        body: "Current provides features to create, share, and manage calendars and events. Use of the service is subject to these terms.",
      },
      {
        heading: "2. Permitted Use",
        bullets: [
          "Do not publish illegal or offensive content, or content that infringes third-party rights.",
          "Do not interfere with the platform's security or technical operation.",
          "Do not perform unauthorized automated usage.",
        ],
      },
      {
        heading: "3. User Account",
        body: "Each user is responsible for keeping credentials confidential and for all actions performed through their account.",
      },
      {
        heading: "4. Measures for Breach",
        body: "The platform may limit, suspend, or cancel accounts in case of serious breaches of these terms.",
      },
      {
        heading: "5. Governing Law and Updates",
        body: "These terms are governed by applicable regulations and may be updated. When appropriate, users will be informed of relevant changes.",
      },
    ],
  },
};

export default function PrivacySettingsScreen() {
  const [openDoc, setOpenDoc] = useState<LegalDocKey | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Privacy</Text>
        <Text style={styles.subtitle}>
          Find the full content of the Privacy Notice, Cookies Policy, and Terms and Conditions here.
        </Text>

        {(Object.keys(LEGAL_DOCS) as LegalDocKey[]).map((key) => {
          const isOpen = openDoc === key;
          const doc = LEGAL_DOCS[key];

          return (
            <View key={key} style={styles.itemWrap}>
              <TouchableOpacity
                style={styles.itemHeader}
                activeOpacity={0.85}
                onPress={() => setOpenDoc(isOpen ? null : key)}
              >
                <Text style={styles.itemTitle}>{doc.title}</Text>
                <Ionicons
                  name={isOpen ? "chevron-down" : "chevron-forward"}
                  size={18}
                  color="#10464d"
                />
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.itemBody}>
                  {doc.sections.map((section) => (
                    <View key={section.heading} style={styles.sectionWrap}>
                      <Text style={styles.sectionHeading}>{section.heading}</Text>
                      {!!section.body && <Text style={styles.bodyText}>{section.body}</Text>}
                      {section.bullets?.map((item) => (
                        <View key={item} style={styles.bulletRow}>
                          <Text style={styles.bulletDot}>-</Text>
                          <Text style={styles.bodyText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e7e3d3",
  },
  scroll: {
    flex: 1,
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
    marginBottom: 14,
    lineHeight: 20,
  },
  itemWrap: {
    backgroundColor: "#e9e7e7",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#c9c4b8",
    marginBottom: 10,
    overflow: "hidden",
  },
  itemHeader: {
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemTitle: {
    flex: 1,
    marginRight: 10,
    fontSize: 16,
    fontWeight: "700",
    color: "#10464d",
  },
  itemBody: {
    borderTopWidth: 1,
    borderTopColor: "#c9c4b8",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  sectionWrap: {
    gap: 6,
    marginBottom: 6,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#10464d",
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bulletDot: {
    width: 12,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: "#10464d",
  },
  bodyText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#222222",
  },
});
