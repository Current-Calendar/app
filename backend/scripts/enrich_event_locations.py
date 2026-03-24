import argparse
import json
import time
from pathlib import Path

import requests


NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


def parse_args():
    p = argparse.ArgumentParser(
        description="Enriquece eventos JSON con lat/lng a partir de place_name usando Nominatim."
    )
    p.add_argument("--input", required=True, help="JSON de entrada (compat load_calendar_data)")
    p.add_argument("--output", required=True, help="JSON de salida enriquecido")
    p.add_argument("--city", default="Sevilla, España", help="Contexto de ciudad para geocodificar")
    p.add_argument("--sleep-ms", type=int, default=1100, help="Pausa entre requests (Nominatim rate-limit)")
    return p.parse_args()


def geocode_place(session, place, city):
    query = f"{place}, {city}"
    params = {
        "q": query,
        "format": "jsonv2",
        "limit": 1,
        "addressdetails": 0,
    }
    r = session.get(NOMINATIM_URL, params=params, timeout=20)
    r.raise_for_status()
    data = r.json()
    if not data:
        return None
    first = data[0]
    return float(first["lat"]), float(first["lon"])


def main():
    args = parse_args()
    payload = json.loads(Path(args.input).read_text(encoding="utf-8"))

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "current-sevilla-ingestion/1.0 (contact: dev@currentcalendar.es)",
            "Accept-Language": "es",
        }
    )

    cache = {}
    enriched = 0
    unresolved = 0

    for event in payload.get("events", []):
        if event.get("lat") is not None and event.get("lng") is not None:
            continue

        place = (event.get("place_name") or "").strip()
        if not place:
            unresolved += 1
            continue

        if place not in cache:
            try:
                result = geocode_place(session, place, args.city)
            except Exception:
                result = None
            cache[place] = result
            time.sleep(max(args.sleep_ms, 0) / 1000.0)

        coords = cache[place]
        if coords is None:
            unresolved += 1
            continue

        lat, lng = coords
        event["lat"] = lat
        event["lng"] = lng
        enriched += 1

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        f"Enriquecido -> lat/lng añadidos: {enriched}, sin resolver: {unresolved}, lugares cacheados: {len(cache)}"
    )


if __name__ == "__main__":
    main()
