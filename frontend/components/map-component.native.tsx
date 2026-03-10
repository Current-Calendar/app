import React, { useState } from "react";
import { Image } from "react-native";
import MapView, { Marker } from "react-native-maps";
import EventDetailsModal from "./event-details-modal";
import API_CONFIG from "../constants/api";
import { mapComponentNativeStyles } from "@/styles/ui-styles";

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
        style={mapComponentNativeStyles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {events.map((event, index) => {
          const lat = parseFloat(event.latitud);
          const lon = parseFloat(event.longitud);
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
              {index === 0 ? (
                <Image
                  source={require("../assets/images/star_marker.png")}
                  style={mapComponentNativeStyles.starMarker}
                  resizeMode="contain"
                />
              ) : (
                <Image
                  source={require("../assets/images/marcador_evento.png")}
                  style={mapComponentNativeStyles.defaultMarker}
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

