import time
import unicodedata

import requests
from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand

from main.models import Event


APPROX_NOTE = "📍 Ubicación aproximada (pendiente de venue exacto)."
SEVILLA_CENTER = (37.3891, -5.9845)

# Lugares frecuentes (ajustable)
VENUE_COORDS = {
    "espacio turina": (37.3916, -5.9955),
    "teatro de la maestranza": (37.3839, -5.9981),
    "cartuja center": (37.4085, -6.0016),
    "real fabrica de artilleria": (37.3764, -5.9728),
    "teatro alameda": (37.4010, -5.9955),
    "teatro central": (37.4052, -5.9988),
    "teatro lope de vega": (37.3773, -5.9865),
    "funclub": (37.3946, -6.0014),
    "catedral de sevilla": (37.3860, -5.9925),
    "iglesia de san luis de los franceses": (37.4019, -5.9908),
    "sala x": (37.3953, -6.0005),
    "malandar": (37.3960, -6.0011),
}

KEYWORD_ZONES = {
    "triana": (37.3835, -6.0030),
    "cartuja": (37.4077, -6.0025),
    "alameda": (37.3995, -5.9945),
    "maestranza": (37.3839, -5.9981),
    "turina": (37.3916, -5.9955),
    "nervion": (37.3859, -5.9719),
}


def normalize(s: str) -> str:
    s = (s or "").strip().lower()
    s = "".join(ch for ch in unicodedata.normalize("NFKD", s) if not unicodedata.combining(ch))
    return " ".join(s.split())


def point_from_latlng(lat, lng):
    return Point(float(lng), float(lat), srid=4326)


def geocode_place(session, place):
    q = f"{place}, Sevilla, España"
    r = session.get(
        "https://nominatim.openstreetmap.org/search",
        params={"q": q, "format": "jsonv2", "limit": 1},
        timeout=20,
    )
    r.raise_for_status()
    data = r.json()
    if not data:
        return None
    return float(data[0]["lat"]), float(data[0]["lon"])


class Command(BaseCommand):
    help = "Completa location en eventos sin coordenadas (preciso si posible, aproximado como fallback)."

    def add_arguments(self, parser):
        parser.add_argument("--sleep-ms", type=int, default=900)
        parser.add_argument(
            "--no-geocode",
            action="store_true",
            help="No usar Nominatim; solo mapa de venues + fallback.",
        )

    def handle(self, *args, **options):
        sleep_ms = options["sleep_ms"]
        no_geocode = options["no_geocode"]

        qs = Event.objects.filter(location__isnull=True).order_by("id")
        total = qs.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS("No hay eventos pendientes de location."))
            return

        session = requests.Session()
        session.headers.update(
            {
                "User-Agent": "current-sevilla-backfill/1.0 (dev@currentcalendar.es)",
                "Accept-Language": "es",
            }
        )
        geocode_cache = {}

        mapped = 0
        geocoded = 0
        approx = 0

        for event in qs:
            place = (event.place_name or "").strip()
            title = event.title or ""
            place_key = normalize(place)

            latlng = None
            was_approx = False

            # 1) Venue map exacta
            if place_key and place_key in VENUE_COORDS:
                latlng = VENUE_COORDS[place_key]
                mapped += 1
            # 2) Geocoding por place_name
            elif place and not no_geocode:
                if place_key not in geocode_cache:
                    try:
                        geocode_cache[place_key] = geocode_place(session, place)
                    except Exception:
                        geocode_cache[place_key] = None
                    time.sleep(max(0, sleep_ms) / 1000)
                latlng = geocode_cache.get(place_key)
                if latlng is not None:
                    geocoded += 1

            # 3) Fallback aproximado por keywords y centro
            if latlng is None:
                txt = normalize(f"{title} {place}")
                for kw, coords in KEYWORD_ZONES.items():
                    if kw in txt:
                        latlng = coords
                        break
                if latlng is None:
                    latlng = SEVILLA_CENTER
                was_approx = True
                approx += 1

            event.location = point_from_latlng(latlng[0], latlng[1])
            if not place:
                event.place_name = "Sevilla (ubicación aproximada)"
            if was_approx and APPROX_NOTE not in (event.description or ""):
                event.description = ((event.description or "").strip() + "\n\n" + APPROX_NOTE).strip()
            event.save(update_fields=["location", "place_name", "description"])

        remaining = Event.objects.filter(location__isnull=True).count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Backfill location completado -> procesados: {total}, "
                f"venue_map: {mapped}, geocode: {geocoded}, approx: {approx}, "
                f"pendientes: {remaining}"
            )
        )
