import React, { useMemo, useState } from "react";
import { Asset } from "expo-asset";
import API_CONFIG from "../constants/api";
import EventDetailsModal from "./event-details-modal";

function formatDate(dateLike: any) {
  const s = String(dateLike ?? "");
  return s || "";
}

function formatTime(timeLike: any) {
  const s = String(timeLike ?? "");
  if (!s) return "";
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function getOriginFromApiBase(apiBaseUrl: string) {
  try {
    const u = new URL(apiBaseUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return String(apiBaseUrl).replace(/\/$/, "").replace(/\/api\/v1\/?$/, "");
  }
}

function buildImageUrl(apiBaseUrl: string, photo: any) {
  const raw = photo?.url ?? photo;
  if (!raw) return null;

  const s = String(raw);

  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  const origin = getOriginFromApiBase(apiBaseUrl);

  if (s.startsWith("/media/")) return `${origin}${s}`;

  const path = s.startsWith("/") ? s.slice(1) : s;
  return `${origin}/media/${path}`;
}

export default function MapComponent({ location, events }: { location: any; events: any[] }) {
  if (typeof window === "undefined") return null;

  const { MapContainer, TileLayer, Marker, Popup } = require("react-leaflet");
  const L = require("leaflet");
  require("./leaflet-fix.css");

  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const apiBase = String(API_CONFIG.baseURL || "");
  const mediaOrigin = getOriginFromApiBase(apiBase);

  // Default marker icon
  const defaultIcon = useMemo(() => {
    const markerUri = Asset.fromModule(require("../assets/images/marcador_evento.png")).uri;
    const markerRetinaUri = Asset.fromModule(require("../assets/images/marcador_evento_2x.png")).uri;

    return new L.Icon({
      iconUrl: markerUri,
      iconRetinaUrl: markerRetinaUri,
      iconSize: [40, 40],
      iconAnchor: [12, 41],
      popupAnchor: [0, -34],
    });
  }, [L]);

  // Star icon for the closest event
  const starIcon = useMemo(() => {
    const starUri = Asset.fromModule(require("../assets/images/star_marker.png")).uri;

    return new L.Icon({
      iconUrl: starUri,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -40],
    });
  }, [L]);

  // User position icon
  const yourPositionIcon = useMemo(() => {
    const markerUri = Asset.fromModule(require("../assets/images/position_icon.png")).uri;

    return new L.Icon({
      iconUrl: markerUri,
      iconSize: [40, 40],
      iconAnchor: [12, 41],
      popupAnchor: [0, -34],
    });
  }, [L]);

  const center: [number, number] = [location.latitude, location.longitude];

  const openEventModal = (event: any) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedEvent(null);
  };

  return (
    <>
      <style>{`
        .event-popup .leaflet-popup-content-wrapper {
          border-radius: 16px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.22);
          background: transparent;
        }
        .event-popup .leaflet-popup-content { margin: 0; }
        .eventCard {
          width: 260px;
          border-radius: 16px;
          overflow: hidden;
          background: #E8E5D8;
          border: 2px solid rgba(16,70,77,0.18);
        }
        .eventImg {
          width: 100%;
          height: 120px;
          object-fit: cover;
          display: block;
          background: rgba(255,255,255,0.55);
        }
        .eventBody { padding: 10px; }
        .eventTitle {
          color: #000;
          font-weight: 900;
          font-size: 14px;
          margin-bottom: 6px;
        }
        .eventMeta {
          color: #10464D;
          font-weight: 800;
          font-size: 12px;
          margin-top: 4px;
        }
      `}</style>

      <MapContainer center={center} zoom={14} style={{ height: "100vh", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={center} icon={yourPositionIcon}>
          <Popup closeButton={false}>You are here</Popup>
        </Marker>

        {events.map((event, index) => {
          const id = String(event?.id ?? "");
          const lat = Number(event.latitude);
          const lon = Number(event.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

          const title = String(event?.title ?? "Event");
          const place = String(event?.place_name ?? "");
          const dateStr = formatDate(event?.date);
          const timeStr = formatTime(event?.time);
          const when = `${dateStr}${timeStr ? ` · ${timeStr}` : ""}`;

          const imgUrl = buildImageUrl(apiBase, event?.photo);

          return (
            <Marker
              key={id}
              position={[lat, lon]}
              icon={index === 0 ? starIcon : defaultIcon} // star for closest event
              eventHandlers={{
                mouseover: (e: any) => e?.target?.openPopup(),
                mouseout: (e: any) => e?.target?.closePopup(),
                click: () => openEventModal(event),
              }}
            >
              <Popup closeButton={false} className="event-popup" offset={[0, -10]}>
                <div className="eventCard">
                  {imgUrl && (
                    <img
                      className="eventImg"
                      src={imgUrl}
                      alt={title}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}

                  <div className="eventBody">
                    <div className="eventTitle">{title}</div>

                    {place && <div className="eventMeta">📍 {place}</div>}
                    {when && <div className="eventMeta">🗓 {when}</div>}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <EventDetailsModal
        visible={modalOpen}
        onClose={closeModal}
        event={selectedEvent}
        apiBaseUrl={apiBase}
      />
    </>
  );
}