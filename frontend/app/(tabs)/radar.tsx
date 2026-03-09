import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Pressable,
} from "react-native";
import React, { useState, useEffect } from "react";
import * as Location from "expo-location";
import apiConfig from "../../constants/api";
import MapComponent from "../../components/map-component";

const DEFAULT_COORDS = { latitude: 37.3891, longitude: -5.9845 }; // Sevilla

export default function RadarScreen() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState("Obteniendo ubicacion...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [usingDefaultLocation, setUsingDefaultLocation] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadRadar = async () => {
      setLoading(true);
      setErrorMessage(null);
      setUsingDefaultLocation(false);
      setLoadingStage("Obteniendo ubicacion...");

      try {
        let lat: number;
        let lon: number;

        if (Platform.OS === "web") {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
              });
            });

            lat = position.coords.latitude;
            lon = position.coords.longitude;
          } catch {
            lat = DEFAULT_COORDS.latitude;
            lon = DEFAULT_COORDS.longitude;
            setUsingDefaultLocation(true);
          }
        } else {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            lat = DEFAULT_COORDS.latitude;
            lon = DEFAULT_COORDS.longitude;
            setUsingDefaultLocation(true);
          } else {
            const currentLocation = await Location.getCurrentPositionAsync({});
            lat = currentLocation.coords.latitude;
            lon = currentLocation.coords.longitude;
          }
        }

        if (cancelled) return;
        setLocation({ latitude: lat, longitude: lon });

        setLoadingStage("Buscando eventos cercanos...");
        const response = await fetch(apiConfig.endpoints.nearbyEvents(lat, lon, 5));
        if (!response.ok) {
          throw new Error("No se pudieron cargar los eventos cercanos.");
        }

        const data = await response.json();
        const eventList =
          (Array.isArray(data) && data) ||
          (Array.isArray(data?.eventos) && data.eventos) ||
          (Array.isArray(data?.results) && data.results) ||
          [];

        if (!cancelled) {
          setEvents(eventList);
        }
      } catch (error) {
        console.error("Error getting location or events:", error);
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : typeof error === "object" && error !== null && "message" in error
                ? String((error as { message?: string }).message || "")
                : "";
          setErrorMessage(message || "Error cargando Radar.");
          setEvents([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadRadar();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#eb8c85" />
        <Text style={styles.loadingTitle}>Preparando Radar</Text>
        <Text style={styles.loadingSubtitle}>{loadingStage}</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.errorTitle}>No se pudo cargar Radar</Text>
        <Text style={styles.loadingSubtitle}>{errorMessage}</Text>
        <Pressable style={styles.retryButton} onPress={() => setReloadKey((k) => k + 1)}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {usingDefaultLocation && (
        <View style={styles.noticeBar}>
          <Text style={styles.noticeText}>Mostrando radar con ubicacion por defecto.</Text>
        </View>
      )}
      {location ? (
        <MapComponent location={location} events={events} />
      ) : (
        <View style={styles.loadingScreen}>
          <Text style={styles.loadingSubtitle}>No hay ubicacion disponible.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  noticeBar: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    zIndex: 5,
    borderRadius: 10,
    backgroundColor: "#10464d",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noticeText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 12,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "#FFFDED",
  },
  loadingTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "700",
    color: "#10464d",
  },
  loadingSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#325a5f",
    textAlign: "center",
    opacity: 0.9,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#c75146",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 14,
    backgroundColor: "#10464d",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});