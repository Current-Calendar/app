import argparse
import datetime
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse

import requests
from icalendar import Calendar as ICalCalendar


def slugify(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "calendar"


def normalize_text(value):
    if value is None:
        return ""
    return str(value).strip()


def load_ics_bytes(input_path=None, source_url=None, timeout=15):
    if bool(input_path) == bool(source_url):
        raise ValueError("Debes indicar exactamente una de estas opciones: --input o --url")

    if source_url:
        normalized_url = source_url.replace("webcal://", "https://", 1)
        response = requests.get(normalized_url, timeout=timeout)
        response.raise_for_status()
        return response.content, normalized_url

    path = Path(input_path)
    if not path.exists():
        raise FileNotFoundError(f"No existe el fichero ICS: {path}")
    return path.read_bytes(), str(path)


def normalize_datetime(dt_value):
    if isinstance(dt_value, datetime.datetime):
        dt = dt_value
    elif isinstance(dt_value, datetime.date):
        dt = datetime.datetime.combine(dt_value, datetime.time(0, 0, 0))
    else:
        raise ValueError(f"Tipo de fecha no soportado: {type(dt_value)}")

    if dt.tzinfo is not None:
        dt = dt.astimezone(datetime.timezone.utc).replace(tzinfo=None)
    return dt


def build_event_external_id(component, fallback_prefix, start_dt, title):
    uid = normalize_text(component.get("uid"))
    if uid:
        return uid[:255]

    fallback_raw = f"{fallback_prefix}|{title}|{start_dt.isoformat()}"
    digest = hashlib.sha256(fallback_raw.encode("utf-8")).hexdigest()
    return f"{fallback_prefix}:{digest}"[:255]


def ics_to_payload(
    ics_bytes,
    source_label,
    calendar_name,
    calendar_description,
    calendar_key,
    calendar_external_id,
    origin,
    privacy,
    target_year=None,
):
    calendar = ICalCalendar.from_ical(ics_bytes)
    payload = {
        "calendars": [
            {
                "key": calendar_key,
                "name": calendar_name,
                "description": calendar_description,
                "privacy": privacy,
                "origin": origin,
                "external_id": calendar_external_id,
            }
        ],
        "events": [],
    }

    for component in calendar.walk():
        if component.name != "VEVENT":
            continue

        dtstart = component.get("dtstart")
        if not dtstart:
            continue

        start_dt = normalize_datetime(dtstart.dt)
        if target_year is not None and start_dt.year != target_year:
            continue

        title = normalize_text(component.get("summary")) or "Sin título"
        description = normalize_text(component.get("description"))
        place_name = normalize_text(component.get("location"))
        external_id = build_event_external_id(
            component=component,
            fallback_prefix=slugify(calendar_key or calendar_name),
            start_dt=start_dt,
            title=title,
        )

        payload["events"].append(
            {
                "calendar_key": calendar_key,
                "title": title,
                "description": description,
                "place_name": place_name,
                "date": start_dt.date().isoformat(),
                "time": start_dt.time().replace(microsecond=0).isoformat(),
                "external_id": external_id,
                "source": {
                    "type": "ics",
                    "label": source_label,
                },
            }
        )

    payload["events"].sort(key=lambda item: (item["date"], item["time"], item["title"]))
    return payload


def parse_args():
    parser = argparse.ArgumentParser(
        description="Convierte un fichero/URL ICS a un JSON compatible con load_calendar_data."
    )
    parser.add_argument("--input", help="Ruta a un fichero .ics local")
    parser.add_argument("--url", help="URL https:// o webcal:// del calendario ICS")
    parser.add_argument("--output", required=True, help="Ruta del JSON de salida")
    parser.add_argument("--calendar-name", required=True, help="Nombre del calendario en BD")
    parser.add_argument("--calendar-key", help="Clave interna del calendario para enlazar eventos")
    parser.add_argument(
        "--calendar-external-id",
        help="external_id del calendario. Si no se indica, se genera a partir del nombre.",
    )
    parser.add_argument("--calendar-description", default="", help="Descripción del calendario")
    parser.add_argument("--origin", default="CURRENT", help="Origin del calendario")
    parser.add_argument("--privacy", default="PUBLIC", help="Privacy del calendario")
    parser.add_argument("--year", type=int, help="Filtra eventos por año del DTSTART")
    return parser.parse_args()


def main():
    args = parse_args()

    ics_bytes, source_label = load_ics_bytes(input_path=args.input, source_url=args.url)
    calendar_key = args.calendar_key or slugify(args.calendar_name)
    calendar_external_id = args.calendar_external_id or f"source:{calendar_key}"

    payload = ics_to_payload(
        ics_bytes=ics_bytes,
        source_label=source_label,
        calendar_name=args.calendar_name,
        calendar_description=args.calendar_description,
        calendar_key=calendar_key,
        calendar_external_id=calendar_external_id,
        origin=args.origin,
        privacy=args.privacy,
        target_year=args.year,
    )

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        f"JSON generado en {output_path} con "
        f"{len(payload['calendars'])} calendario(s) y {len(payload['events'])} evento(s)."
    )


if __name__ == "__main__":
    main()
