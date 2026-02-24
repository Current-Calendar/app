import React from "react";
import { View, Text, StyleSheet, TextInput, Pressable, Platform, useWindowDimensions } from "react-native";
import { Link } from "expo-router";

const BG = "#FBF7EA";
const PINK = "#F2A3A6";
const TEAL = "#1F6A6A";
const TEAL_DARK = "#0F4E4F";
const TEXT = "#10464D";

export default function SignUpScreen() {
  const { width } = useWindowDimensions();
  const formWidth =
    Platform.OS === "web" ? Math.min(width * 0.5, 520) : Math.min(width * 0.92, 420);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.topSmall}>sign up</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Sign Up</Text>

        <View style={[styles.form, { width: formWidth }]}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            placeholder=""
            placeholderTextColor="#999"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
          <TextInput placeholder="" placeholderTextColor="#999" secureTextEntry style={styles.input} />

          <Text style={[styles.label, { marginTop: 14 }]}>Confirm Password</Text>
          <TextInput placeholder="" placeholderTextColor="#999" secureTextEntry style={styles.input} />

          <Pressable style={styles.btn}>
            <View style={styles.btnBubbles} pointerEvents="none">
              <View style={[styles.bubbleDot, { top: 6, left: 10 }]} />
              <View style={[styles.bubbleDot, { top: 18, left: 22, width: 6, height: 6 }]} />
              <View style={[styles.bubbleDot, { bottom: 8, left: 14, width: 10, height: 10 }]} />

              <View style={[styles.bubbleDot, { top: 8, right: 12 }]} />
              <View style={[styles.bubbleDot, { top: 20, right: 26, width: 6, height: 6 }]} />
              <View style={[styles.bubbleDot, { bottom: 10, right: 16, width: 10, height: 10 }]} />
            </View>

            <Text style={styles.btnText}>Sign Up</Text>
          </Pressable>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Already have an account?</Text>
          <Link href="/auth/login" asChild>
            <Pressable>
              <Text style={styles.bottomLink}>Login</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  topRow: { paddingTop: 18, paddingHorizontal: 18, flexDirection: "row" },
  topSmall: { color: TEXT, opacity: 0.65, fontSize: 14, textTransform: "lowercase" },

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
  btnText: { textAlign: "center", color: "#EAF7F6", fontWeight: "900", letterSpacing: 0.3 },

  bottomRow: { marginTop: 30, alignItems: "center" },
  bottomText: { color: TEXT, opacity: 0.65, fontSize: 13 },
  bottomLink: { marginTop: 4, color: PINK, fontSize: 13, fontWeight: "800", textDecorationLine: "underline" },
});