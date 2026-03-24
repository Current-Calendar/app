import React, { useEffect, useMemo, useRef, useState } from "react";
import { Asset } from "expo-asset";
import { API_CONFIG } from "../constants/api";
import EventDetailsModal from "./event-details-modal";
import { mapComponentWebStyles } from "@/styles/ui-styles";

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

function buildImageUrl(apiBaseUrl: string, foto: any) {
  const raw = foto?.url ?? foto;
  if (!raw) return null;

  const s = String(raw);

  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  const origin = getOriginFromApiBase(apiBaseUrl);

  if (s.startsWith("/media/")) return `${origin}${s}`;

  const path = s.startsWith("/") ? s.slice(1) : s;
  return `${origin}/media/${path}`;
}

export default function MapComponent({ location, events }: { location: any; events: any[] }) {
  const isBrowser = typeof window !== "undefined";

  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [sheetOffsetRatio, setSheetOffsetRatio] = useState(0.76);
  const [sheetDragging, setSheetDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);

  const SHEET_SNAP_POINTS = [0, 0.42, 0.76];

  const leafletReact = useMemo(() => {
    if (!isBrowser) return null;
    return require("react-leaflet");
  }, [isBrowser]);

  const leaflet = useMemo(() => {
    if (!isBrowser) return null;
    return require("leaflet");
  }, [isBrowser]);

  useEffect(() => {
    if (!isBrowser) return;
    require("./leaflet-fix.css");
  }, [isBrowser]);

  useEffect(() => {
    if (!isBrowser) return;

    const mediaQuery = window.matchMedia("(max-width: 980px)");
    const syncLayout = () => {
      const isCompact = mediaQuery.matches;
      setIsCompactLayout(isCompact);
      if (!isCompact) {
        setSheetOffsetRatio(0);
      } else {
        setSheetOffsetRatio((prev) => (prev > 0.76 ? 0.76 : prev));
      }
    };

    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);
    window.addEventListener("resize", syncLayout);

    return () => {
      mediaQuery.removeEventListener("change", syncLayout);
      window.removeEventListener("resize", syncLayout);
    };
  }, [isBrowser]);

  const apiBase = String(API_CONFIG.BaseURL || "");
  const fallbackEventImage = useMemo(
    () => Asset.fromModule(require("../assets/images/nube_login.png")).uri,
    []
  );

  const nearbyEvents = useMemo(() => {
    return events
      .map((event, index) => {
        const id = String(event?.id ?? event?._id ?? `event-${index}`);
        const lat = Number(event?.latitude);
        const lon = Number(event?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

        const title = String(event?.title ?? "Evento");
        const place = String(event?.place_name ?? "");
        const dateStr = formatDate(event?.date);
        const timeStr = formatTime(event?.time);
        const when = `${dateStr}${timeStr ? ` · ${timeStr}` : ""}`;

        return {
          raw: event,
          id,
          index,
          lat,
          lon,
          title,
          place,
          when,
          imgUrl: buildImageUrl(apiBase, event?.photo),
        };
      })
      .filter((event): event is NonNullable<typeof event> => Boolean(event));
  }, [apiBase, events]);

  const defaultIcon = useMemo(() => {
    if (!leaflet) return null;
    const markerUri = Asset.fromModule(require("../assets/images/marcador_evento.png")).uri;
    const markerRetinaUri = Asset.fromModule(require("../assets/images/marcador_evento_2x.png")).uri;

    return new leaflet.Icon({
      iconUrl: markerUri,
      iconRetinaUrl: markerRetinaUri,
      iconSize: [40, 40],
      iconAnchor: [12, 41],
      popupAnchor: [0, -34],
    });
  }, [leaflet]);

  const starIcon = useMemo(() => {
    if (!leaflet) return null;
    const starUri = Asset.fromModule(require("../assets/images/star_marker.png")).uri;

    return new leaflet.Icon({
      iconUrl: starUri,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -40],
    });
  }, [leaflet]);

  const yourPositionIcon = useMemo(() => {
    if (!leaflet) return null;
    const markerUri = Asset.fromModule(require("../assets/images/position_icon.png")).uri;

    return new leaflet.Icon({
      iconUrl: markerUri,
      iconSize: [40, 40],
      iconAnchor: [12, 41],
      popupAnchor: [0, -34],
    });
  }, [leaflet]);

  const center: [number, number] = [location.latitude, location.longitude];

  const openEventModal = (event: any) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedEvent(null);
  };

  const getSheetHeight = () => {
    const height = sheetRef.current?.getBoundingClientRect().height ?? 0;
    return height > 0 ? height : 1;
  };

  const startSheetDrag = (clientY: number) => {
    if (!isCompactLayout) return;
    dragStartY.current = clientY;
    dragStartOffset.current = sheetOffsetRatio;
    setSheetDragging(true);
  };

  const updateSheetDrag = (clientY: number) => {
    if (!isCompactLayout || !sheetDragging) return;
    const deltaY = clientY - dragStartY.current;
    const ratioDelta = deltaY / getSheetHeight();
    const next = Math.max(0, Math.min(0.76, dragStartOffset.current + ratioDelta));
    setSheetOffsetRatio(next);
  };

  const endSheetDrag = () => {
    if (!isCompactLayout || !sheetDragging) return;
    let nearest = SHEET_SNAP_POINTS[0];
    let nearestDistance = Math.abs(sheetOffsetRatio - nearest);

    for (const snap of SHEET_SNAP_POINTS) {
      const distance = Math.abs(sheetOffsetRatio - snap);
      if (distance < nearestDistance) {
        nearest = snap;
        nearestDistance = distance;
      }
    }

    setSheetOffsetRatio(nearest);
    setSheetDragging(false);
  };

  const onHandlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    startSheetDrag(event.clientY);
  };

  const onHandlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!sheetDragging) return;
    updateSheetDrag(event.clientY);
  };

  const onHandlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    endSheetDrag();
  };

  const compactSidebarStyle = isCompactLayout
    ? (({ ["--sheet-offset" as string]: `${sheetOffsetRatio * 100}%` }) as React.CSSProperties)
    : undefined;

  const listRevealProgress = !isCompactLayout
    ? 1
    : Math.max(0, Math.min(1, (0.76 - sheetOffsetRatio) / 0.2));

  const compactListStyle: React.CSSProperties | undefined = isCompactLayout
    ? {
        opacity: listRevealProgress,
        transform: `translateY(${(1 - listRevealProgress) * 18}px)`,
        pointerEvents: listRevealProgress < 0.08 ? "none" : "auto",
      }
    : undefined;

  if (!isBrowser || !leafletReact || !leaflet || !defaultIcon || !starIcon || !yourPositionIcon) {
    return null;
  }

  const { MapContainer, TileLayer, Marker, Popup } = leafletReact;

  return (
    <>
      <style>{`
        .radarLayout {
          height: 100vh;
          width: 100%;
          display: grid;
          grid-template-columns: minmax(280px, 360px) 1fr;
          background: #fffded;
          font-family: "Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        }
        .radarSidebar {
          border-right: 1px solid rgba(16,70,77,0.14);
          background: #fff;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .radarSheetHandle {
          display: none;
        }
        .radarSheetGrip {
          display: block;
          width: 52px;
          height: 6px;
          border-radius: 999px;
          background: rgba(16,70,77,0.24);
          margin: 0 auto;
        }
        .radarSidebarHeader {
          padding: 16px 14px 12px 14px;
          border-bottom: 1px solid rgba(16,70,77,0.12);
        }
        .radarSidebarTitle {
          color: #10464D;
          margin: 0;
          font-size: 18px;
          font-weight: 900;
          line-height: 1.2;
        }
        .radarSidebarSubtitle {
          margin: 6px 0 0 0;
          color: rgba(16,70,77,0.82);
          font-size: 12px;
          font-weight: 700;
        }
        .radarSidebarList {
          overflow-y: auto;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          -webkit-overflow-scrolling: touch;
        }
        .radarListItem {
          border: 1px solid rgba(16,70,77,0.16);
          background: #fff;
          border-radius: 12px;
          padding: 8px;
          display: grid;
          grid-template-columns: 88px 1fr;
          gap: 10px;
          cursor: pointer;
          transition: all 140ms ease;
        }
        .radarListItem:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.08);
          border-color: rgba(16,70,77,0.28);
        }
        .radarListItem.isActive {
          border-color: #10464D;
          box-shadow: 0 0 0 2px rgba(16,70,77,0.12);
        }
        .radarItemImage {
          width: 88px;
          height: 68px;
          border-radius: 10px;
          object-fit: cover;
          background: rgba(16,70,77,0.08);
          display: block;
        }
        .radarItemBody {
          min-width: 0;
        }
        .radarItemTitle {
          margin: 0;
          color: #10464D;
          font-size: 13px;
          font-weight: 900;
          line-height: 1.25;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .radarItemMeta {
          margin: 6px 0 0 0;
          color: #35595d;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .radarItemMetaLabel {
          font-weight: 900;
          color: #10464D;
        }
        .radarEmptyState {
          color: #35595d;
          font-size: 13px;
          font-weight: 700;
          padding: 20px 12px;
        }
        .radarMapArea {
          min-width: 0;
          height: 100%;
        }
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

        @media (max-width: 980px) {
          .radarLayout {
            display: block;
            position: relative;
            height: 100dvh;
          }
          .radarSidebar {
            position: absolute;
            left: 10px;
            right: 10px;
            bottom: calc(140px + env(safe-area-inset-bottom, 0px));
            height: min(58dvh, 460px);
            border: 1px solid rgba(16,70,77,0.14);
            border-radius: 20px;
            box-shadow: 0 14px 34px rgba(0, 0, 0, 0.22);
            transform: translateY(var(--sheet-offset, 76%));
            transition: transform 180ms ease;
            z-index: 900;
          }
          .radarSidebar.isDragging {
            transition: none;
          }
          .radarSheetHandle {
            display: block;
            padding: 12px 0 8px 0;
            cursor: ns-resize;
            touch-action: none;
          }
          .radarSidebarHeader {
            padding-top: 10px;
          }
          .radarSidebarList {
            padding-bottom: 14px;
          }
          .radarMapArea {
            height: 100dvh;
          }
        }
      `}</style>

      <div className="radarLayout">
        <aside
          ref={sheetRef}
          className={`radarSidebar ${sheetDragging ? "isDragging" : ""}`}
          style={compactSidebarStyle}
        >
          <div
            className="radarSheetHandle"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
          >
            <span className="radarSheetGrip" />
          </div>

          <div className="radarSidebarHeader">
            <h2 className="radarSidebarTitle">Radar Nearby Events</h2>
            <p className="radarSidebarSubtitle">
              {nearbyEvents.length} result{nearbyEvents.length === 1 ? "" : "s"} around your location
            </p>
          </div>

          <div className="radarSidebarList" style={compactListStyle}>
            {nearbyEvents.length === 0 ? (
              <div className="radarEmptyState">
                No events found nearby. Try again in another area.
              </div>
            ) : (
              nearbyEvents.map((event) => (
                <article
                  key={`list-${event.id}`}
                  className={`radarListItem ${selectedEvent?.id === event.raw?.id ? "isActive" : ""}`}
                  onClick={() => openEventModal(event.raw)}
                >
                  <img
                    className="radarItemImage"
                    src={event.imgUrl || fallbackEventImage}
                    alt={event.title}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = fallbackEventImage;
                    }}
                  />

                  <div className="radarItemBody">
                    <h3 className="radarItemTitle">{event.title}</h3>
                    {event.place && (
                      <p className="radarItemMeta">
                        <span className="radarItemMetaLabel">Location:</span> {event.place}
                      </p>
                    )}
                    {event.when && (
                      <p className="radarItemMeta">
                        <span className="radarItemMetaLabel">When:</span> {event.when}
                      </p>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </aside>

        <div className="radarMapArea">
          <MapContainer center={center} zoom={14} style={mapComponentWebStyles.fullScreenMap}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Marker position={center} icon={yourPositionIcon}>
              <Popup closeButton={false}>You are here</Popup>
            </Marker>

            {nearbyEvents.map((event) => (
              <Marker
                key={event.id}
                position={[event.lat, event.lon]}
                icon={event.index === 0 ? starIcon : defaultIcon}
                eventHandlers={{
                  mouseover: (e: any) => e?.target?.openPopup(),
                  mouseout: (e: any) => e?.target?.closePopup(),
                  click: () => openEventModal(event.raw),
                }}
              >
                <Popup closeButton={false} className="event-popup" offset={[0, -10]}>
                  <div className="eventCard">
                    <img
                      className="eventImg"
                      src={event.imgUrl || fallbackEventImage}
                      alt={event.title}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = fallbackEventImage;
                      }}
                    />

                    <div className="eventBody">
                      <div className="eventTitle">{event.title}</div>
                      {event.place && <div className="eventMeta">Location: {event.place}</div>}
                      {event.when && <div className="eventMeta">When: {event.when}</div>}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <EventDetailsModal
        visible={modalOpen}
        onClose={closeModal}
        event={selectedEvent}
      />
    </>
  );
}