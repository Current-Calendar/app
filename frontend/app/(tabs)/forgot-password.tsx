import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  Dimensions,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { API_CONFIG } from "@/constants/api";

const BG = "#E8E5D8";
const PINK = "#F2A3A6";
const TEAL = "#1F6A6A";
const TEAL_DARK = "#0F4E4F";
const TEXT = "#10464D";




const Otter = require("../../assets/images/Mascota.png");

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const formWidth =
    Platform.OS === "web" ? Math.min(width * 0.5, 520) : Math.min(width * 0.92, 420);

  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const recoverpass = async (email: string) => {
    const fallbackMessage =
      "If an account exists with this email, a password reset link has been sent.";
    const genericErrorMessage = "Error sending password recovery email.";
    const source = window.location.origin;
    const response = await fetch(API_CONFIG.endpoints.recoverPassword, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, source: source }),
    });
    const data = (await response.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null;
    if (!response.ok) {
      throw new Error(genericErrorMessage);
    }
    return data?.message ?? fallbackMessage;
  };

  const onForgotPassword = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const u = email.trim();
    if (!u) {
      setErrorMsg("Please, enter the email address associated with your account.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(u)) {
      setErrorMsg("Please, enter a valid email address.");
      return;
    }
    setLoading(true);

    try {
      const message = await recoverpass(u);
      setSuccessMsg(message);
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : "Error sending password recovery email."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Image source={Otter} style={styles.otter} resizeMode="contain" />
        </View>

        <Text style={styles.title}>Forgot Password</Text>

        <View style={[styles.form, { width: formWidth }]}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder=""
            placeholderTextColor="#999"
            autoCapitalize="none"
            style={styles.input}
          />


          {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
          {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}

          <Pressable
            style={[styles.btn, loading && { opacity: 0.75 }]}
            onPress={onForgotPassword}
            disabled={loading}
          >

            {loading ? (
              <ActivityIndicator color="#EAF7F6" />
            ) : (
              <Text style={styles.btnText}>Send Recovery Email</Text>
            )}
          </Pressable>
        </View>

        <View style={{ height: 18 }} />
      </View>
    </View>
  );
}

const W = Dimensions.get("window").width;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 14,
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

  errorText: { marginTop: 6, color: "#C43B3B", fontWeight: "800" },
  successText: { marginTop: 6, color: TEAL, fontWeight: "900" },

  btn: {
    marginTop: 20,
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
  btnBubbles: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 },
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

  bottomRow: { marginTop: 18, alignItems: "center" },
  bottomText: { color: TEXT, opacity: 0.65, fontSize: 13 },
  bottomLink: {
    marginTop: 4,
    color: PINK,
    fontSize: 13,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
