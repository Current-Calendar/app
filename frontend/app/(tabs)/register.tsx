import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useRegister } from "@/hooks/use-register";
import { ApiError } from "@/services/api-client";
import { Ionicons } from "@expo/vector-icons";
import { useTutorial } from "@/context/tutorial-context";

const PINK = "#F2A3A6";
const TEAL = "#1F6A6A";
const TEAL_DARK = "#0F4E4F";
const TEXT = "#10464D";

type LegalDocKey = "privacy" | "terms";

type LegalSection = {
  heading: string;
  body?: string;
  bullets?: string[];
};

const LEGAL_DOCS: Record<LegalDocKey, { title: string; button: string; content: LegalSection[] }> = {
  privacy: {
    title: "Privacy Notice",
    button: "Privacy Notice",
    content: [
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
  terms: {
    title: "Terms and Conditions of Use",
    button: "Terms and Conditions",
    content: [
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

export default function SignUpScreen() {
  const router = useRouter();
  const { user, login, isAuthenticated, isLoading } = useAuth();
  const { registerUser } = useRegister();
  const { width } = useWindowDimensions();
  const formWidth =
    Platform.OS === "web"
      ? Math.min(width * 0.5, 520)
      : Math.min(width * 0.92, 420);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocKey | null>(null);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { setShowWelcome } = useTutorial();

  useEffect(() => {
    if (!isLoading && (isAuthenticated || Boolean(user))) {
      router.replace("/(tabs)/switch-events" as any);
    }
  }, [isLoading, isAuthenticated, user, router]);

  const getRegisterErrorMessage = (error: unknown) => {
    if (error instanceof ApiError) {
      const data = error.data as Record<string, unknown> | undefined;
      const topErrors = data?.errors;
      if (Array.isArray(topErrors) && topErrors.length > 0) {
        return String(topErrors[0]);
      }
      const firstFieldWithErrors = Object.entries(data ?? {}).find(
        ([, value]) => Array.isArray(value) && value.length > 0
      );
      if (firstFieldWithErrors) {
        const [field, value] = firstFieldWithErrors;
        return `${field}: ${String((value as unknown[])[0])}`;
      }
      return error.message;
    }
    if (error instanceof Error) return error.message;
    return "No connection to API. Check API_BASE / backend is running.";
  };

  const onSignup = async () => {
    if (isAuthenticated || user) {
      router.replace("/(tabs)/switch-events" as any);
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    if (!username.trim() || !email.trim() || !password || !password2) {
      setErrorMsg("Fill in all fields.");
      return;
    }
    if (password !== password2) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (!acceptPrivacy || !acceptTerms) {
      setErrorMsg("You must accept privacy and terms to continue.");
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        username: username.trim(),
        email: email.trim(),
        password,
        password2,
        accepted_privacy: acceptPrivacy,
        accepted_cookies: false,
        accepted_terms: acceptTerms,
      });

      setSuccessMsg("Account created successfully!");
      await login(username.trim(), password);

      setTimeout(() => {
        router.push("/(tabs)/calendars" as any);
        setTimeout(() => setShowWelcome(true), 400);
      }, 300);
    } catch (error) {
      setErrorMsg(getRegisterErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <Text style={styles.title}>Sign Up</Text>

        <View style={[styles.form, { width: formWidth }]}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder=""
            placeholderTextColor="#999"
            style={styles.input}
            autoCapitalize="none"
            testID="register-username-input"
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Email address</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder=""
            placeholderTextColor="#999"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            testID="register-email-input"
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
          <View style={{ position: "relative", justifyContent: "center" }}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder=""
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              style={[styles.input, { paddingRight: 40 }]}
              testID="register-password-input"
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={{ position: "absolute", right: 10 }}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={24}
                color="#10464D"
              />
            </Pressable>
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Confirm password</Text>
          <View style={{ position: "relative", justifyContent: "center" }}>
            <TextInput
              value={password2}
              onChangeText={setPassword2}
              placeholder=""
              placeholderTextColor="#999"
              secureTextEntry={!showPassword2}
              style={[styles.input, { paddingRight: 40 }]}
              testID="register-password2-input"
            />
            <Pressable
              onPress={() => setShowPassword2(!showPassword2)}
              style={{ position: "absolute", right: 10 }}
            >
              <Ionicons
                name={showPassword2 ? "eye-off" : "eye"}
                size={24}
                color="#10464D"
              />
            </Pressable>
          </View>

          <View style={styles.legalBox}>
            <Text style={styles.legalTitle}>Legal documents</Text>
            <Text style={styles.legalSubtitle}>
              Tap each document to view it inside this screen and accept it at the end.
            </Text>

            <View style={styles.legalTabs}>
              {(Object.keys(LEGAL_DOCS) as LegalDocKey[]).map((key) => {
                const isActive = activeLegalDoc === key;
                const isAccepted =
                  (key === "privacy" && acceptPrivacy) ||
                  (key === "terms" && acceptTerms);

                return (
                  <Pressable
                    key={key}
                    style={[styles.legalTab, isActive && styles.legalTabActive]}
                    onPress={() => setActiveLegalDoc(isActive ? null : key)}
                  >
                    <Ionicons
                      name={isAccepted ? "checkbox" : isActive ? "chevron-down" : "chevron-forward"}
                      size={18}
                      color={isActive ? TEAL_DARK : TEXT}
                    />
                    <Text style={[styles.legalTabText, isActive && styles.legalTabTextActive]}>
                      {LEGAL_DOCS[key].button}
                    </Text>
                    {isAccepted && <Text style={styles.legalAcceptedMark}>Accepted</Text>}
                  </Pressable>
                );
              })}
            </View>

            {!!activeLegalDoc && (
              <View style={styles.legalPanel}>
                <Text style={styles.legalPanelTitle}>{LEGAL_DOCS[activeLegalDoc].title}</Text>
                <ScrollView style={styles.legalScroll} contentContainerStyle={styles.legalScrollContent}>
                  {LEGAL_DOCS[activeLegalDoc].content.map((section) => (
                    <View key={section.heading} style={styles.legalSection}>
                      <Text style={styles.legalSectionTitle}>{section.heading}</Text>
                      {!!section.body && <Text style={styles.legalBody}>{section.body}</Text>}
                      {section.bullets?.map((item) => (
                        <View key={item} style={styles.legalBulletRow}>
                          <Text style={styles.legalBulletDot}>-</Text>
                          <Text style={styles.legalBulletText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </ScrollView>

                <Pressable
                  style={[
                    styles.acceptDocButton,
                    ((activeLegalDoc === "privacy" && acceptPrivacy) ||
                      (activeLegalDoc === "terms" && acceptTerms)) && styles.acceptDocButtonAccepted,
                  ]}
                  onPress={() => {
                    if (activeLegalDoc === "privacy") setAcceptPrivacy(true);
                    if (activeLegalDoc === "terms") setAcceptTerms(true);
                  }}
                >
                  <Text style={styles.acceptDocButtonText}>
                    {(
                      (activeLegalDoc === "privacy" && acceptPrivacy) ||
                      (activeLegalDoc === "terms" && acceptTerms)
                    )
                      ? "Accepted"
                      : "Accept document"}
                  </Text>
                </Pressable>
              </View>
            )}

            <Text style={styles.legalHint}>You must accept privacy and terms to continue.</Text>
          </View>

          {!!errorMsg && <Text style={styles.errorText} testID="register-error-text">{errorMsg}</Text>}
          {!!successMsg && <Text style={styles.successText} testID="register-success-text">{successMsg}</Text>}

          <Pressable style={styles.btn} onPress={onSignup} disabled={loading} testID="register-submit-button">
            <View style={styles.btnBubbles} pointerEvents="none">
              <View style={[styles.bubbleDot, { top: 6, left: 10 }]} />
              <View style={[styles.bubbleDot, { top: 18, left: 22, width: 6, height: 6 }]} />
              <View style={[styles.bubbleDot, { bottom: 8, left: 14, width: 10, height: 10 }]} />
              <View style={[styles.bubbleDot, { top: 8, right: 12 }]} />
              <View style={[styles.bubbleDot, { top: 20, right: 26, width: 6, height: 6 }]} />
              <View style={[styles.bubbleDot, { bottom: 10, right: 16, width: 10, height: 10 }]} />
            </View>
            {loading ? (
              <ActivityIndicator color="#EAF7F6" />
            ) : (
              <Text style={styles.btnText}>Sign Up</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Already have an account?</Text>
          <Link href="/login" asChild>
            <Pressable testID="go-login-link">
              <Text style={styles.bottomLink}>Log in</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 52,
    paddingBottom: 24,
  },
  title: {
    fontSize: 34,
    color: TEXT,
    fontWeight: "800",
    marginBottom: 18,
  },
  form: { marginTop: 6 },
  label: {
    fontSize: 14,
    color: TEXT,
    opacity: 0.75,
    marginBottom: 6,
  },
  input: {
    height: 40,
    borderWidth: 2,
    borderColor: PINK,
    borderRadius: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  legalBox: {
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.45)",
    borderWidth: 1,
    borderColor: "#F2A3A6",
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  legalTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
  },
  legalSubtitle: {
    color: TEXT,
    opacity: 0.78,
    fontSize: 12,
    lineHeight: 16,
  },
  legalTabs: {
    gap: 8,
  },
  legalTab: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(16,70,77,0.18)",
    backgroundColor: "rgba(255,255,255,0.66)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  legalTabActive: {
    borderColor: TEAL,
    backgroundColor: "rgba(31,106,106,0.08)",
  },
  legalTabText: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 8,
  },
  legalTabTextActive: {
    color: TEAL_DARK,
  },
  legalAcceptedMark: {
    color: TEAL,
    fontSize: 11,
    fontWeight: "900",
  },
  legalPanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(31,106,106,0.22)",
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  legalPanelTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 10,
  },
  legalScroll: {
    maxHeight: 260,
  },
  legalScrollContent: {
    paddingBottom: 4,
  },
  legalSection: {
    marginBottom: 10,
  },
  legalSectionTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 4,
  },
  legalBody: {
    color: "#1A1A1A",
    fontSize: 13,
    lineHeight: 19,
  },
  legalBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
  },
  legalBulletDot: {
    width: 12,
    color: TEXT,
    fontWeight: "900",
    fontSize: 13,
    lineHeight: 19,
  },
  legalBulletText: {
    flex: 1,
    color: "#1A1A1A",
    fontSize: 13,
    lineHeight: 19,
  },
  acceptDocButton: {
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: TEAL,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  acceptDocButtonAccepted: {
    backgroundColor: "#4B8F76",
  },
  acceptDocButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  legalHint: {
    color: TEXT,
    opacity: 0.7,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  errorText: { marginTop: 10, color: "#C43B3B", fontWeight: "800" },
  successText: { marginTop: 10, color: "#1F6A6A", fontWeight: "900" },
  btn: {
    marginTop: 18,
    alignSelf: "center",
    width: 170,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: TEAL,
    borderWidth: 2,
    borderColor: "#0B3D3D",
    shadowColor: TEAL_DARK,
    shadowOpacity: 0.25,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    position: "relative",
    overflow: "hidden",
  },
  btnBubbles: { position: "absolute", inset: 0 },
  bubbleDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.75)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  btnText: {
    textAlign: "center",
    color: "#EAF7F6",
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  bottomRow: { marginTop: 30, alignItems: "center" },
  bottomText: { color: TEXT, opacity: 0.65, fontSize: 13 },
  bottomLink: {
    marginTop: 4,
    color: PINK,
    fontSize: 13,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});