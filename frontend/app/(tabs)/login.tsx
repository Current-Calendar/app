import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/use-auth";
import apiClient, { ApiError } from "@/services/api-client";

const PINK = "#F2A3A6";
const TEAL = "#1F6A6A";
const TEAL_DARK = "#0F4E4F";
const TEXT = "#10464D";

const Otter = require("../../assets/images/Mascota.png");
const Cloud = require("../../assets/images/nube_login.png");

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

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const usernameRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);

  const formWidth =
    Platform.OS === "web" ? Math.min(width * 0.5, 520) : Math.min(width * 0.92, 420);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocKey | null>(null);
  const [acceptedDocs, setAcceptedDocs] = useState<Record<LegalDocKey, boolean>>({
    privacy: false,
    terms: false,
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const parseErrorMessage = (error: unknown): string => {
    if (error instanceof ApiError) {
      if (error.status === 401) return "Invalid credentials.";
      if (error.status === 0) {
        return "Could not connect to the server. Check that the backend is running and try again.";
      }
      if (typeof error.message === "string" && error.message.trim()) return error.message;
    }
    const anyErr = error as any;
    const detail = anyErr?.data?.detail || anyErr?.detail || anyErr?.message;
    if (
      typeof detail === "string" &&
      ["Failed to fetch", "Network request failed", "Load failed"].includes(detail.trim())
    ) {
      return "Could not connect to the server. Check that the backend is running and try again.";
    }
    if (typeof detail === "string" && detail.trim()) return detail;
    return "Could not sign in. Please try again.";
  };

  const onLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const u = username.trim();
    if (!u || !password) {
      setErrorMsg("Fill in username and password.");
      return;
    }
    if (!acceptedDocs.privacy || !acceptedDocs.terms) {
      setErrorMsg("You must accept privacy and terms to continue.");
      return;
    }

    setLoading(true);

    try {
      await login(u, password);
      await apiClient.post("/auth/accept-legal/", {
        accepted_privacy: acceptedDocs.privacy,
        accepted_cookies: false,
        accepted_terms: acceptedDocs.terms,
      });

      setSuccessMsg("Login successful.");
      setTimeout(() => router.push("/"), 250);
    } catch (error) {
      setSuccessMsg(null);
      setErrorMsg(parseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        // Leave room for the custom bottom navigation bar and the Android gesture bar
        // so the login button never gets covered.
        { paddingBottom: 90 + insets.bottom },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <View style={styles.hero}>
          <Image source={Otter} style={styles.otter} resizeMode="contain" />
          <ImageBackground source={Cloud} style={styles.cloudImg} resizeMode="contain">
            <Text style={styles.cloudText}>Welcome Back</Text>
          </ImageBackground>
        </View>

        <Text style={styles.title}>Log In</Text>

        <View style={[styles.form, { width: formWidth }]}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder=""
            placeholderTextColor="#999"
            autoCapitalize="none"
            style={styles.input}
            testID="login-username-input"
            ref={usernameRef}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
          <View style={{ position: "relative", justifyContent: "center" }}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder=""
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              style={[styles.input, { paddingRight: 40 }]}
              autoCapitalize="none"
              testID="login-password-input"
              ref={passwordRef}
              returnKeyType="done"
              onSubmitEditing={onLogin}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={{ position: "absolute", right: 10 }}
            >
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color={TEXT} />
            </Pressable>
          </View>

          <Pressable style={styles.forgot}>
            <Link href={"/forgot-password" as any} asChild>
              <Pressable>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            </Link>
          </Pressable>

          <View style={styles.inlineAuthPrompt}>
            <Text style={styles.inlineAuthPromptText}>No account yet?</Text>
            <Link href="/register" asChild>
              <Pressable testID="go-register-inline-link">
                <Text style={styles.inlineAuthPromptLink}>Sign up</Text>
              </Pressable>
            </Link>
          </View>

          <View style={styles.legalBox}>
            <Text style={styles.legalTitle}>Legal documents</Text>
            <Text style={styles.legalSubtitle}>
              Tap each document to view it inside this screen and accept it at the end.
            </Text>

            <View style={styles.legalTabs}>
              {(Object.keys(LEGAL_DOCS) as LegalDocKey[]).map((key) => {
                const isActive = activeLegalDoc === key;
                const isAccepted = acceptedDocs[key];

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
                <ScrollView
                  style={styles.legalScroll}
                  contentContainerStyle={styles.legalScrollContent}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                >
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
                    acceptedDocs[activeLegalDoc] && styles.acceptDocButtonAccepted,
                  ]}
                  onPress={() => setAcceptedDocs((prev) => ({ ...prev, [activeLegalDoc]: true }))}
                >
                  <Text style={styles.acceptDocButtonText}>
                    {acceptedDocs[activeLegalDoc] ? "Accepted" : "Accept document"}
                  </Text>
                </Pressable>
              </View>
            )}

            <Text style={styles.legalHint}>You must accept privacy and terms to continue.</Text>
          </View>

          {!!errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}
          {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}

          <Pressable
            style={[styles.btn, loading && { opacity: 0.75 }]}
            onPress={onLogin}
            disabled={loading}
            testID="login-submit-button"
          >
            <View style={styles.btnBubbles} pointerEvents="none">
              <View style={[styles.bubbleDot, { top: 6, left: 10 }]} />
              <View style={[styles.bubbleDot, { top: 18, left: 22, width: 6, height: 6 }]} />
              <View style={[styles.bubbleDot, { bottom: 8, left: 14, width: 10, height: 10 }]} />
              <View style={[styles.bubbleDot, { top: 8, right: 12 }]} />
              <View style={[styles.bubbleDot, { top: 20, right: 26, width: 6, height: 6 }]} />
              <View style={[styles.bubbleDot, { bottom: 10, right: 16, width: 10, height: 10 }]} />
            </View>

            {loading ? <ActivityIndicator color="#EAF7F6" /> : <Text style={styles.btnText}>Login</Text>}
          </Pressable>
        </View>

        <View style={{ height: 18 }} />
      </View>
    </ScrollView>
  );
}

const W = Dimensions.get("window").width;

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 24,
  },
  hero: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginTop: 4,
    marginBottom: 4,
    height: 190,
  },
  otter: {
    width: Math.min(150, W * 0.32),
    height: Math.min(150, W * 0.32),
    marginTop: 30,
  },
  cloudImg: {
    position: "absolute",
    top: 6,
    left: "50%",
    transform: [{ translateX: -20 }],
    width: 210,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  cloudText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "800",
    marginTop: -4,
  },
  title: {
    fontSize: 32,
    color: TEXT,
    fontWeight: "800",
    marginTop: 2,
    marginBottom: 8,
  },
  form: { marginTop: 2 },
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
  forgot: { alignSelf: "flex-end", marginTop: 8, marginBottom: 8 },
  forgotText: { color: "#3A9A9A", fontSize: 12, fontWeight: "700" },
  inlineAuthPrompt: {
    marginTop: 2,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(31,106,106,0.08)",
    borderWidth: 1,
    borderColor: "rgba(31,106,106,0.16)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  inlineAuthPromptText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
  inlineAuthPromptLink: {
    color: PINK,
    fontSize: 13,
    fontWeight: "900",
    textDecorationLine: "underline",
  },
  legalBox: {
    marginTop: 6,
    marginBottom: 8,
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
  errorBox: {
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(196,59,59,0.12)",
    borderColor: "#C43B3B",
    borderWidth: 1,
    borderRadius: 8,
  },
  errorText: { color: "#C43B3B", fontWeight: "800" },
  successText: { marginTop: 6, color: TEAL, fontWeight: "900" },
  btn: {
    marginTop: 4,
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
});
