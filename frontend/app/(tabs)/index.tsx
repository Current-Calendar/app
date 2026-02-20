import React, { useEffect, useState } from "react";
import { Image } from "expo-image";
import { StyleSheet } from "react-native";

import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API_CONFIG } from "@/constants/api";

export default function HomeScreen() {
  const [mock, setMock] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMock = async () => {
      try {
        const res = await fetch(API_CONFIG.endpoints.mock);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setMock(json);
      } catch (e: any) {
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };
    fetchMock();
  }, []);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome to Current Calendar!</ThemedText>
        <HelloWave />
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        {loading ? (
          <ThemedText>Loading...</ThemedText>
        ) : error ? (
          <ThemedText>{`Error: ${error}`}</ThemedText>
        ) : mock ? (
          <>
            <ThemedText type="subtitle">Fuente: {mock.source}</ThemedText>
            <ThemedText>ID: {mock.data?.id ?? "-"}</ThemedText>
            <ThemedText>Nombre: {mock.data?.nombre ?? "-"}</ThemedText>
            <ThemedText>{`Latitud: ${mock.data?.coordenadas?.latitude ?? "-"} · Longitud: ${mock.data?.coordenadas?.longitude ?? "-"}`}</ThemedText>
            <ThemedText>{`Creado en DB: ${mock.data?.created_in_db ? "Sí" : "No"}`}</ThemedText>
          </>
        ) : (
          <ThemedText>No hay datos</ThemedText>
        )}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
