
import React, { useState } from "react";
import { Image } from "react-native";
import MapView, { Marker } from "react-native-maps";
import EventDetailsModal from "./event-details-modal";
import { mapComponentNativeStyles } from "@/styles/ui-styles";

type EventMarker = {
  id?: string | number;
  _id?: string | number;
  latitude?: number | string;
  longitude?: number | string;
};

type LocationPoint = {
  latitude: number;
  longitude: number;
};

export default function MapComponent({ location, events }: { location: LocationPoint; events: EventMarker[] }) {
  const [selectedEvent, setSelectedEvent] = useState<EventMarker | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const initialRegion = {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const openEventModal = (event: EventMarker) => {
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
        {events.map((event: EventMarker, index: number) => {
          const lat = parseFloat(String(event.latitude));
          const lon = parseFloat(String(event.longitude));
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
      />
    </>
  );
}
