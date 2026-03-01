// MapComponent.native.js
import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function MapComponent({ location, events }) {
  const initialRegion = {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <MapView
      style={styles.map}
      initialRegion={initialRegion}
      showsUserLocation={true}
      showsMyLocationButton={true}
    >
      {events.map((event) => (
        <Marker
          key={event.id || event._id}
          coordinate={{ 
            latitude: parseFloat(event.latitud), 
            longitude: parseFloat(event.longitud) 
          }}
          title={event.titulo}
          description={event.descripcion}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
  },
});