import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import * as Location from "expo-location";
import API_CONFIG from "../../constants/api";
import MapComponent from "../../components/map-component";

export default function RadarScreen() {
    const [location, setLocation] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            console.log("We need location permissions to show nearby events.");
            return;
          }

          const currentLocation = await Location.getCurrentPositionAsync({});
          const lat = currentLocation.coords.latitude;
          const lon = currentLocation.coords.longitude;
          setLocation({ latitude: lat, longitude: lon });
          console.log(API_CONFIG.endpoints.nearbyEvents(lat, lon, 5));
          const response = await fetch(API_CONFIG.endpoints.nearbyEvents(lat, lon, 5));
          const data = await response.json();
          setEvents(data || []);
        } catch (error) {
          console.error("Error getting location or events:", error);
        } finally {
          setLoading(false);
        }
      })();
    }, []);

 if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Buscando eventos cercanos...</Text>
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