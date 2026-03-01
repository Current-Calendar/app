
import React, { useMemo } from 'react';
import {Asset} from "expo-asset";

export default function MapComponent({ location, events }) {
  // Avoid importing Leaflet during server/SSR phase where window is undefined.
  if (typeof window === 'undefined') {
    return null;
  }

  const { MapContainer, TileLayer, Marker, Popup } = require('react-leaflet');

  const L = require('leaflet');
  require('./leaflet-fix.css');

const defaultIcon = useMemo(() => {
    // Extraemos las URIs usando expo-asset
    const markerUri = Asset.fromModule(require('../assets/images/marcador_evento.png')).uri;
    const markerRetinaUri = Asset.fromModule(require('../assets/images/marcador_evento_2x.png')).uri;

    return new L.Icon({
      iconUrl: markerUri,
      iconRetinaUrl: markerRetinaUri,
      iconSize: [40, 40],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });
  }, [L]);

const yourPositionIcon = useMemo(() => {
    const markerUri = Asset.fromModule(require('../assets/images/position_icon.png')).uri;
    const markerRetinaUri = Asset.fromModule(require('../assets/images/position_icon.png')).uri;

    return new L.Icon({
      iconUrl: markerUri,
      iconRetinaUrl: markerRetinaUri,
      iconSize: [40, 40],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });
  }, [L]);

  const center = [location.latitude, location.longitude];
  console.log('Fetched events:', events);

  return (
    <MapContainer 
      center={center} 
      zoom={14} 
      style={{ height: '100vh', width: '100%' }} 
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <Marker position={center} icon={yourPositionIcon}>
        <Popup>Estás aquí</Popup>
      </Marker>

      {events.map((event) => (
        <Marker 
          key={event.id || event._id} 
          position={[parseFloat(event.latitud), parseFloat(event.longitud)]}
          icon={defaultIcon}
        >
          <Popup>
            <strong>{event.titulo}</strong><br />
            {event.descripcion}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}