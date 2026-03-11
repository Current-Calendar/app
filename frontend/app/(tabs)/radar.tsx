import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import React, { useState, useEffect } from "react";
import * as Location from "expo-location";
import MapComponent from "../../components/map-component";
import { useNearbyEvents, Coordinates } from "@/hooks/use-nearby-events";

export default function RadarScreen() {
  const [location, setLocation] = useState<Coordinates | null>(null);

  const {
    events,
    loading,
  } = useNearbyEvents(location, { radiusKm: 5, enabled: !!location });

    useEffect(() => {
      (async () => {
        try {
          if (Platform.OS === "web") {
            navigator.geolocation.getCurrentPosition(async (position) => {
              const lat = position.coords.latitude;
              const lon = position.coords.longitude;
              setLocation({ latitude: lat, longitude: lon });
            });
        } else {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            console.log("We need location permissions to show nearby events.");
            return;
          }
          const currentLocation = await Location.getCurrentPositionAsync({});
          const lat = currentLocation.coords.latitude;
          const lon = currentLocation.coords.longitude;
          setLocation({ latitude: lat, longitude: lon });
        }
        } catch (error) {
          console.error("Error getting location or events:", error);
        }
      })();
    }, []);

 if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#eb8c85" />
        <Text>Buscando events cercanos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {location ? (
        <MapComponent location={location} events={events} />
      ) : (
        <View style={styles.center}><Text>No hay ubicación</Text></View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});