import React, { useMemo, useState } from "react";
import { StyleSheet, Image } from "react-native";
import MapView, { Marker } from "react-native-maps";
import EventDetailsModal from "./event-details-modal";
import API_CONFIG from "../constants/api";

export default function MapComponent({ location, events }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const initialRegion = {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const openEventModal = (event) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedEvent(null);
  };

  return (
    <>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {events.map((event, index) => {
          const lat = parseFloat(event.latitude);
          const lon = parseFloat(event.longitude);
          if (!isFinite(lat) || !isFinite(lon)) return null;

          return (
            <Marker
              key={event.id || event._id}
              coordinate={{
                latitude: lat,
                longitude: lon,
              }}
              onPress={() => openEventModal(event)}
            >
              {/* Closest event */}
              {index === 0 ? (
                <Image
                  source={require("../assets/images/star_marker.png")}
                  style={styles.starMarker}
                  resizeMode="contain"
                />
              ) : (
                <Image
                  source={require("../assets/images/marcador_evento.png")}
                  style={styles.defaultMarker}
                  resizeMode="contain"
                />
              )}
            </Marker>
          );
        })}
      </MapView>

      <EventDetailsModal
        visible={modalOpen}
        onClose={closeModal}
        event={selectedEvent}
        apiBaseUrl={API_CONFIG.baseURL}
      />
    </>
  );
}

const styles = StyleSheet.create({
  map: {
    width: "100%",
    height: "100%",
  },

  defaultMarker: {
    width: 40,
    height: 40,
  },

  starMarker: {
    width: 32, // slightly smaller star marker
    height: 32,
  },
});