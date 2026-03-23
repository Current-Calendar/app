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

function normalizeEventList(data: any): any[] {
  return (
    (Array.isArray(data) && data) ||
    (Array.isArray(data?.events) && data.events) ||
    (Array.isArray(data?.eventos) && data.eventos) ||
    (Array.isArray(data?.results) && data.results) ||
    []
  );
}

export default function RadarScreen() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState("Getting your location...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadRadar = async () => {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              if (cancelled) return;

              const webLat = position.coords.latitude;
              const webLon = position.coords.longitude;

              setLocation({ latitude: webLat, longitude: webLon });
              setLoadingStage("Searching nearby events...");

              try {
                const radiusCandidatesKm = [5, 15, 35];
                let eventList: any[] = [];

                for (const radiusKm of radiusCandidatesKm) {
                  if (cancelled) return;
                  setLoadingStage(`Searching nearby events (${radiusKm} km)...`);

                  const response = await fetch(apiConfig.endpoints.nearbyEvents(webLat, webLon, radiusKm));
                  if (!response.ok) {
                    throw new Error("Could not load nearby events.");
                  }

                  const data = await response.json();
                  eventList = normalizeEventList(data);
                  if (eventList.length > 0) break;
                }

                if (!cancelled) {
                  setEvents(eventList);
                }
              } catch (fetchError) {
                if (!cancelled) {
                  const message =
                    fetchError instanceof Error ? fetchError.message : "Error loading Radar.";
                  setErrorMessage(message);
                }
              } finally {
                if (!cancelled) {
                  setLoading(false);
                }
              }
            },
            (geoError) => {
              if (cancelled) return;
              const code =
                typeof geoError === "object" &&
                geoError !== null &&
                "code" in geoError &&
                typeof (geoError as { code?: unknown }).code === "number"
                  ? Number((geoError as { code?: number }).code)
                  : null;

              if (code === 1) {
                setLocationMessage(
                  "Location permission was denied in the browser. Allow location for this site and tap Retry."
                );
              } else {
                setLocationMessage(
                  "Location is required to show nearby events. Please enable location services and try again."
                );
              }

              setLoading(false);
            },
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            }
          );
          return;
              "Location permission is required to show nearby events. Please enable location and try again."
            );
          } else {
            const currentLocation = await Location.getCurrentPositionAsync({});
            lat = currentLocation.coords.latitude;
            lon = currentLocation.coords.longitude;
          }
        }

        if (cancelled) return;
        setLocation({ latitude: lat, longitude: lon });

        setLoadingStage("Searching nearby events...");

        const radiusCandidatesKm = [5, 15, 35];
        let eventList: any[] = [];

        for (const radiusKm of radiusCandidatesKm) {
          if (cancelled) return;
          setLoadingStage(`Searching nearby events (${radiusKm} km)...`);

          const response = await fetch(apiConfig.endpoints.nearbyEvents(lat, lon, radiusKm));
          if (!response.ok) {
            throw new Error("Could not load nearby events.");
          }

          const data = await response.json();
          eventList = normalizeEventList(data);
          if (eventList.length > 0) break;
        }

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
          if (message.toLowerCase().includes("location") || message.toLowerCase().includes("ubicacion")) {
            setLocationMessage(message || "Getting your location...");
          } else {
            setErrorMessage(message || "Error loading Radar.");
          }
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
        <Text style={styles.loadingTitle}>Preparing Radar</Text>
        <Text style={styles.loadingSubtitle}>{loadingStage}</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.errorTitle}>Could not load Radar</Text>
        <Text style={styles.loadingSubtitle}>{errorMessage}</Text>
        <Pressable style={styles.retryButton} onPress={() => setReloadKey((k) => k + 1)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (locationMessage || !location) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#eb8c85" />
        <Text style={styles.loadingTitle}>Waiting for location</Text>
        <Text style={styles.loadingSubtitle}>
          {locationMessage || "Enable location to see nearby events."}
        </Text>
        {Platform.OS === "web" ? (
          <View style={styles.guideBox}>
            <Text style={[styles.guideStep, { fontWeight: "700", fontSize: 13, marginBottom: 8 }]}>
              📍 Location Permission Required
            </Text>
            <Text style={styles.guideStep}>1. Make sure you're using HTTPS or localhost</Text>
            <Text style={styles.guideStep}>2. Click the lock icon next to the URL in Chrome</Text>
            <Text style={styles.guideStep}>3. Find "Location" and select "Allow"</Text>
            <Text style={styles.guideStep}>4. Refresh the page and try again</Text>
          </View>
        ) : (
          <Text style={styles.loadingSubtitle}>
            Enable location in your device settings and tap Retry.
          </Text>
        )}
        <Pressable style={styles.retryButton} onPress={() => setReloadKey((k) => k + 1)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapComponent location={location} events={events} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  guideBox: {
    marginTop: 12,
    width: "100%",
    maxWidth: 460,
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#f5f1d6",
    borderWidth: 1,
    borderColor: "#e5dba4",
  },
  guideStep: {
    fontSize: 13,
    color: "#325a5f",
    marginBottom: 4,
  },
});