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
        body: "The controller of the collected personal data is:",
        bullets: [
          "Controller: Current development team",
          "Academic project - University of Seville",
          "Contact: support@currentcalendar.es",
        ],
      },
      {
        heading: "2. Data We Process",
        body: "We process the data you provide directly (registration, profile, contact) and the data derived from your browsing activity (IP address, cookies, technical logs). We do not process special category data (health, religion, biometrics) unless it is explicitly required for a specific platform feature.",
      },
      {
        heading: "3. Purpose and Legal Basis",
        bullets: [
          "Service management: Registration and performance of the user agreement (Art. 6.1.b GDPR).",
          "Support: Handling inquiries and improving the experience (Legitimate interest, Art. 6.1.f GDPR).",
          "Marketing: Sending newsletters or promotions only if you have checked the consent box (Consent, Art. 6.1.a GDPR).",
          "Security: Preventing fraud and cyberattacks (Legitimate interest).",
        ],
      },
      {
        heading: "4. Recipients",
        body: "Your data will not be shared with third parties outside the service, except:",
        bullets: [
          "Processors: Hosting providers, analytics tools, or email services (always under confidentiality agreements).",
          "Legal obligation: Competent authorities, law enforcement, or courts.",
        ],
      },
      {
        heading: "5. International Transfers",
        body: "If our technology providers operate outside the European Economic Area (for example, in the U.S.), we ensure they comply with the EU-U.S. Data Privacy Framework or use Standard Contractual Clauses approved by the European Commission.",
      },
      {
        heading: "6. Your Rights",
        body: "You have the right to access, rectify, erase, restrict processing, object to processing, and data portability.",
        bullets: [
          "You can exercise these rights by emailing support@currentcalendar.es.",
          "To verify your identity, include a copy of your ID card or equivalent document.",
          "You may also file a complaint with the Spanish Data Protection Agency (AEPD).",
        ],
      },
      {
        heading: "7. Retention",
        body: "We will keep your data while you do not request its deletion. After the account is closed, the data will remain blocked for the legal limitation periods to address any potential liabilities.",
      },
    ],
  },
  cookies: {
    title: "Cookies Policy",
    sections: [
      {
        heading: "1. What is a cookie?",
        body: "A cookie is a small text file stored in your browser when you visit our platform. It allows the system to remember your visit, keep your session open, and analyze how you interact with the website to improve your experience.",
      },
      {
        heading: "2. Cookie controller",
        bullets: [
          "Controller: Current development team",
          "Academic project - University of Seville",
          "Contact: support@currentcalendar.es",
        ],
      },
      {
        heading: "3. Types of cookies we use",
        bullets: [
          "Technical cookies (necessary): Required for the website to function.",
          "Preference cookies: Remember your settings (such as language or time zone).",
          "Analytics cookies: Tell us how many people visit and which sections are most popular. They are only enabled if you give consent.",
        ],
      },
      {
        heading: "4. Cookie inventory",
        bullets: [
          "sessionid (First-party): Identify your session. Technical cookie. Session duration.",
          "csrftoken (First-party): CSRF protection. Technical cookie. Duration: 1 year.",
          "cookie_consent (First-party): Remember whether you accepted or rejected cookies. Technical cookie. Duration: 6 months.",
          "_ga (Google): Usage statistics. Analytics cookie. Duration: 2 years.",
          "_gid (Google): Distinguish users. Analytics cookie. Duration: 24 hours.",
        ],
      },
      {
        heading: "5. How to manage or withdraw consent",
        body: "You can change your mind at any time from the platform cookie settings or from your browser privacy settings (Chrome, Firefox, Safari, and Edge).",
      },
      {
        heading: "6. International transfers",
        body: "When using tools such as Google Analytics, some data may travel to servers in the U.S. We ensure these providers comply with the Data Privacy Framework or have signed the European Union Standard Contractual Clauses.",
      },
    ],
  },
  terms: {
    title: "Terms and Conditions of Use",
    sections: [
      {
        heading: "1. Service scope",
        body: "Current is a digital service developed as an academic project at the University of Seville that allows users to create, share, and manage event calendars. Access to and use of the Platform is subject to acceptance of these Terms, as well as the Privacy and Cookies Policy.",
      },
      {
        heading: "2. Users and access",
        bullets: [
          "Requirements: You must be at least 14 years old. By registering, you agree to provide accurate information.",
          "Responsibility: You are solely responsible for the security of your password and for all activities carried out under your account.",
        ],
      },
      {
        heading: "3. Usage rules and conduct",
        body: "The following are expressly prohibited:",
        bullets: [
          "Publishing illegal, offensive, defamatory content, or content that violates third-party rights.",
          "Performing scraping or automated data extraction without authorization.",
          "Interfering with the security or technical operation of the platform.",
          "Spreading malware or engaging in fraudulent activity.",
          "Consequences: Breach of these terms may result in content removal or permanent account closure.",
        ],
      },
      {
        heading: "4. Content and intellectual property",
        bullets: [
          "Your content: You own what you post, but you grant us a free worldwide license to store and display that content.",
          "Current rights: The design, source code, logos, and trademarks belong to the development team. Reproduction is not allowed without permission.",
        ],
      },
      {
        heading: "5. Limitation of liability",
        bullets: [
          "Service status: The platform is provided as is. As an academic project, we do not guarantee uninterrupted availability or the accuracy of third-party events.",
          "Exclusion: We are not responsible for data loss or unauthorized access resulting from user negligence.",
        ],
      },
      {
        heading: "6. Suspension and termination",
        bullets: [
          "By you: You may request account deletion at any time.",
          "By us: We may suspend your access for breach of terms or for technical/academic reasons.",
        ],
      },
      {
        heading: "7. Governing law and jurisdiction",
        body: "These Terms are governed by Spanish law (GDPR, LOPDGDD, and LSSI-CE). Any dispute shall be submitted to the courts of Seville.",
      },
    ],
  },
};

export default function PrivacySettingsScreen() {
  const [openDocs, setOpenDocs] = useState<Record<LegalDocKey, boolean>>({
    privacy: false,
    cookies: false,
    terms: false,
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Privacy</Text>
        <Text style={styles.subtitle}>
          Find the full content of the Privacy Notice, Cookies Policy, and Terms and Conditions here.
        </Text>

        {(Object.keys(LEGAL_DOCS) as LegalDocKey[]).map((key) => {
          const isOpen = openDocs[key];
          const doc = LEGAL_DOCS[key];

          return (
            <View key={key} style={styles.itemWrap}>
              <TouchableOpacity
                style={styles.itemHeader}
                activeOpacity={0.85}
                onPress={() =>
                  setOpenDocs((prev) => ({
                    ...prev,
                    [key]: !prev[key],
                  }))
                }
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
    backgroundColor: "#FFFDED",
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
    backgroundColor: "#ffffff",
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
