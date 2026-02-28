import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { Link, useRouter } from "expo-router";

const BG = "#E8E5D8";
const PINK = "#F2A3A6";
const TEAL = "#1F6A6A";
const TEAL_DARK = "#0F4E4F";
const TEXT = "#10464D";

// Cambia esto según dónde esté tu API
// - Web: normalmente http://localhost:8000
// - Android emulator: http://10.0.2.2:8000
// - iPhone físico: http://TU_IP_LOCAL:8000
const API_BASE =
  Platform.OS === "android"
    ? "http://10.0.2.2:8000"
    : "http://localhost:8000";

export default function SignUpScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const formWidth =
    Platform.OS === "web" ? Math.min(width * 0.5, 520) : Math.min(width * 0.92, 420);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const onSignup = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!username.trim() || !email.trim() || !password || !password2) {
      setErrorMsg("Fill all fields.");
      return;
    }
    if (password !== password2) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/registro/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          password2,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          (data &&
            (data.message ||
              data.detail ||
              data.non_field_errors?.[0] ||
              data.email?.[0] ||
              data.username?.[0] ||
              data.password?.[0] ||
              data.password2?.[0])) ||
          "Register failed.";
        setErrorMsg(String(msg));
        return;
      }

      setSuccessMsg("Usuario registrado exitosamente");
      setTimeout(() => router.push("/login"), 400); // Redirige al login para que el usuario inicie sesión después de registrarse
    } catch (e: any) {
      setErrorMsg("No connection to API. Check API_BASE / backend running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>

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
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Email Address</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder=""
            placeholderTextColor="#999"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder=""
            placeholderTextColor="#999"
            secureTextEntry
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Confirm Password</Text>
          <TextInput
            value={password2}
            onChangeText={setPassword2}
            placeholder=""
            placeholderTextColor="#999"
            secureTextEntry
            style={styles.input}
          />

          {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
          {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}

          <Pressable style={styles.btn} onPress={onSignup} disabled={loading}>
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
            <Pressable>
              <Text style={styles.bottomLink}>Login</Text>
            </Pressable>
          </Link>
        </View>

        <Text style={styles.apiHint}>API: {API_BASE}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { flex: 1, alignItems: "center", paddingHorizontal: 22, paddingTop: 52 },
  title: { fontSize: 34, color: TEXT, fontWeight: "800", marginBottom: 18 },

  form: { marginTop: 6 },
  label: { fontSize: 14, color: TEXT, opacity: 0.75, marginBottom: 6 },
  input: {
    height: 40,
    borderWidth: 2,
    borderColor: PINK,
    borderRadius: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.45)",
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
    opacity: 1,
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
  btnText: { textAlign: "center", color: "#EAF7F6", fontWeight: "900", letterSpacing: 0.3 },

  bottomRow: { marginTop: 30, alignItems: "center" },
  bottomText: { color: TEXT, opacity: 0.65, fontSize: 13 },
  bottomLink: { marginTop: 4, color: PINK, fontSize: 13, fontWeight: "800", textDecorationLine: "underline" },

  apiHint: { marginTop: 16, fontSize: 11, color: TEXT, opacity: 0.45 },
});