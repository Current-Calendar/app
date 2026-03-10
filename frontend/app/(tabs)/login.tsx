import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  ImageBackground,
  Dimensions,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";

const BG = "#E8E5D8";
const PINK = "#F2A3A6";
const TEAL = "#1F6A6A";
const TEAL_DARK = "#0F4E4F";
const TEXT = "#10464D";




const Otter = require("../../assets/images/Mascota.png");
const Cloud = require("../../assets/images/nube_login.png");

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const { login } = useAuth();

  const formWidth =
    Platform.OS === "web" ? Math.min(width * 0.5, 520) : Math.min(width * 0.92, 420);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const onLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const u = username.trim();
    if (!u || !password) {
      setErrorMsg("Rellena username y password.");
      return;
    }

    setLoading(true);

    try {
      await login(username, password);

      setSuccessMsg("Login exitoso.");
      setTimeout(() => router.push("/"), 250);
    } catch (error) {
      setErrorMsg("User o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
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
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder=""
            placeholderTextColor="#999"
            secureTextEntry
            style={styles.input}
          />

          <Pressable style={styles.forgot}>
          <Link href="/forgot-password" asChild>
            <Pressable>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          </Link>
          </Pressable>

          {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
          {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}

          <Pressable
            style={[styles.btn, loading && { opacity: 0.75 }]}
            onPress={onLogin}
            disabled={loading}
          >
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
              <Text style={styles.btnText}>Login</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Don’t have an account?</Text>
          <Link href="/register" asChild>
            <Pressable>
              <Text style={styles.bottomLink}>Sign Up</Text>
            </Pressable>
          </Link>
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