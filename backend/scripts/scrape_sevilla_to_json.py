import argparse
import datetime as dt
import hashlib
import html as html_lib
import json
import re
from pathlib import Path

import requests


ONSEVILLA_URL = "https://onsevilla.com/agenda-de-sevilla"
ICAS_URL = "https://icas.sevilla.org/agenda"
YUZIN_URL = "https://yuzin.com/ciudad/sevilla/"

SPANISH_MONTHS = {
    "enero": 1,
    "febrero": 2,
    "marzo": 3,
    "abril": 4,
    "mayo": 5,
    "junio": 6,
    "julio": 7,
    "agosto": 8,
    "septiembre": 9,
    "setiembre": 9,
    "octubre": 10,
    "noviembre": 11,
    "diciembre": 12,
}

DATE_LINE_RE = re.compile(
    r"^(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+(\d{1,2})\s+de\s+([a-záéíóú]+)$",
    re.IGNORECASE,
)

CATEGORY_WORDS = {
    "música",
    "musica",
    "danza",
    "experiencias",
    "en familia",
    "artes escénicas",
    "artes escenicas",
    "cine",
    "teatro",
    "exposiciones",
}


def fetch_html(url: str, timeout: int = 20) -> str:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    }
    response = requests.get(url, timeout=timeout, headers=headers)
    response.raise_for_status()
    if not response.encoding or response.encoding.lower() in {"iso-8859-1", "latin-1"}:
        response.encoding = response.apparent_encoding or "utf-8"
    return response.text


def strip_tags(html: str) -> str:
    # Remove script/style and then tags
    cleaned = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
    cleaned = re.sub(r"<style[\s\S]*?</style>", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"<[^>]+>", "\n", cleaned)
    cleaned = cleaned.replace("&nbsp;", " ")
    cleaned = re.sub(r"\r", "\n", cleaned)
    cleaned = re.sub(r"\n{2,}", "\n", cleaned)
    return cleaned


def normalize_line(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def parse_spanish_textual_date(text: str, year_fallback: int) -> dt.date | None:
    m = DATE_LINE_RE.match(normalize_line(text).lower())
    if not m:
        return None
    day = int(m.group(2))
    month_name = m.group(3).replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
    month = SPANISH_MONTHS.get(month_name)
    if not month:
        return None
    return dt.date(year_fallback, month, day)


def parse_spanish_numeric_date(text: str) -> tuple[dt.date | None, dt.time | None]:
    # Examples:
    # 28/03/2026 20:00 – 22:00
    # 06/02/2026
    m = re.search(r"(?P<d>\d{2})/(?P<m>\d{2})/(?P<y>\d{4})(?:\s+(?P<h>\d{2}):(?P<min>\d{2}))?", text)
    if not m:
        return None, None
    d = dt.date(int(m.group("y")), int(m.group("m")), int(m.group("d")))
    if m.group("h"):
        t = dt.time(int(m.group("h")), int(m.group("min")))
    else:
        t = dt.time(0, 0, 0)
    return d, t


def parse_onsevilla(year: int) -> list[dict]:
    html = fetch_html(ONSEVILLA_URL)
    lines = [normalize_line(line) for line in strip_tags(html).split("\n")]
    lines = [line for line in lines if line]

    events = []
    for idx, line in enumerate(lines):
        if not line.lower().startswith("fechas:"):
            continue
        if idx == 0:
            continue

        title = lines[idx - 1]
        if len(title) < 4:
            continue

        event_date, event_time = parse_onsevilla_date_line(line=line, title=title, default_year=year)

        if event_date is None or event_date.year != year:
            continue

        place_name = extract_place_from_title(title)

        events.append(
            {
                "title": title,
                "description": f"Importado desde OnSevilla. {line}",
                "place_name": place_name,
                "date": event_date.isoformat(),
                "time": (event_time or dt.time(0, 0, 0)).isoformat(),
            }
        )

    return dedupe_events(events)


def parse_onsevilla_date_line(line: str, title: str, default_year: int) -> tuple[dt.date | None, dt.time | None]:
    line_l = line.lower()
    title_l = title.lower()

    if any(token in line_l for token in ("distintas fechas", "todos los días", "todos los dias", "de lunes a domingo", "del lunes a domingo")):
        return None, None

    year_detected = default_year
    ym = re.search(r"(20\d{2})", line_l) or re.search(r"(20\d{2})", title_l)
    if ym:
        year_detected = int(ym.group(1))

    # jueves 26 de marzo
    m1 = re.search(r"(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+(\d{1,2})\s+de\s+([a-záéíóú]+)", line_l)
    if m1:
        day = int(m1.group(1))
        month = month_name_to_number(m1.group(2))
        if month:
            return dt.date(year_detected, month, day), dt.time(0, 0, 0)

    # del 23 al 26 de marzo
    m2 = re.search(r"del\s+(\d{1,2})\s+al\s+\d{1,2}\s+de\s+([a-záéíóú]+)", line_l)
    if m2:
        day = int(m2.group(1))
        month = month_name_to_number(m2.group(2))
        if month:
            return dt.date(year_detected, month, day), dt.time(0, 0, 0)

    # del 12 de marzo al 14 de mayo
    m3 = re.search(r"del\s+(\d{1,2})\s+de\s+([a-záéíóú]+)\s+al\s+\d{1,2}\s+de\s+([a-záéíóú]+)", line_l)
    if m3:
        day = int(m3.group(1))
        month = month_name_to_number(m3.group(2))
        if month:
            return dt.date(year_detected, month, day), dt.time(0, 0, 0)

    # 26 y 27 de marzo
    m4 = re.search(r"(\d{1,2})\s+y\s+\d{1,2}\s+de\s+([a-záéíóú]+)", line_l)
    if m4:
        day = int(m4.group(1))
        month = month_name_to_number(m4.group(2))
        if month:
            return dt.date(year_detected, month, day), dt.time(0, 0, 0)

    # fallback generic first "d de mes [de yyyy]"
    m5 = re.search(r"(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+de\s+(20\d{2}))?", line_l)
    if m5:
        day = int(m5.group(1))
        month = month_name_to_number(m5.group(2))
        y = int(m5.group(3)) if m5.group(3) else year_detected
        if month:
            return dt.date(y, month, day), dt.time(0, 0, 0)

    return None, None


def month_name_to_number(raw: str) -> int | None:
    month_name = (
        raw.lower()
        .replace("á", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ú", "u")
    )
    return SPANISH_MONTHS.get(month_name)


def parse_icas(year: int) -> list[dict]:
    html = fetch_html(ICAS_URL)
    lines = [normalize_line(line) for line in strip_tags(html).split("\n")]
    lines = [line for line in lines if line]

    events = []
    for idx in range(len(lines) - 2):
        title = lines[idx]
        start_line = lines[idx + 1]
        end_line = lines[idx + 2]

        if not looks_like_title(title):
            continue

        date_value, time_value = parse_spanish_numeric_date(start_line)
        if not date_value:
            continue
        _end_date, _end_time = parse_spanish_numeric_date(end_line)
        if _end_date is None:
            # Try single-date event layout
            date_value, time_value = parse_spanish_numeric_date(title)
            if not date_value:
                continue
            title = lines[idx - 1] if idx > 0 else ""
            if not looks_like_title(title):
                continue

        if date_value.year != year:
            continue

        place_name = ""
        if idx + 3 < len(lines):
            cand = lines[idx + 3]
            if not is_metadata_line(cand):
                place_name = cand

        events.append(
            {
                "title": title,
                "description": "Importado desde ICAS Agenda",
                "place_name": place_name,
                "date": date_value.isoformat(),
                "time": (time_value or dt.time(0, 0, 0)).isoformat(),
            }
        )

    return dedupe_events(events)


def looks_like_title(value: str) -> bool:
    v = normalize_line(value)
    if len(v) < 6:
        return False
    if re.search(r"^\d{2}/\d{2}/\d{4}", v):
        return False
    lowered = v.lower()
    banned = {
        "agenda",
        "entradas",
        "temáticas",
        "tematicas",
        "espacios",
        "categorías",
        "categorias",
        "zona flamenca",
    }
    if lowered in banned:
        return False
    return bool(re.search(r"[a-zA-ZÁÉÍÓÚáéíóúÑñ]", v))


def is_metadata_line(value: str) -> bool:
    v = normalize_line(value).lower()
    if not v:
        return True
    if v in {"categorías:", "categorias:", "temáticas", "tematicas", "espacios"}:
        return True
    if re.search(r"^\d{2}/\d{2}/\d{4}", v):
        return True
    return False


def parse_yuzin(year: int) -> list[dict]:
    html = fetch_html(YUZIN_URL)
    events = []

    # Parse from card container attributes (much more reliable than flattened text)
    card_pattern = re.compile(
        r'<div[^>]+class="[^"]*yuzin-card-item[^"]*"[^>]*>',
        flags=re.IGNORECASE,
    )
    attr_pattern = re.compile(r'([a-zA-Z0-9_-]+)="([^"]*)"')

    # Capture card body to optionally parse hour text
    body_pattern = re.compile(
        r'(<div[^>]+class="[^"]*yuzin-card-item[^"]*"[^>]*>[\s\S]*?<img[^>]+class="card-img-bottom"[^>]*>)',
        flags=re.IGNORECASE,
    )
    bodies = body_pattern.findall(html)

    for body in bodies:
        open_tag_match = card_pattern.search(body)
        if not open_tag_match:
            continue
        open_tag = open_tag_match.group(0)
        attrs = {k.lower(): html_lib.unescape(v).strip() for k, v in attr_pattern.findall(open_tag)}

        title = normalize_line(attrs.get("data-title", ""))
        place_name = normalize_line(attrs.get("data-location", ""))
        raw_dates = normalize_line(attrs.get("data-dates", ""))
        event_type = normalize_line(attrs.get("data-type", ""))
        city = normalize_line(attrs.get("data-city", ""))

        if len(title) < 3 or not raw_dates:
            continue

        date_value = None
        for token in re.split(r"[,;|/]", raw_dates):
            token = token.strip()
            try:
                d = dt.date.fromisoformat(token)
            except ValueError:
                continue
            if d.year == year:
                date_value = d
                break
        if not date_value:
            continue

        # Optional hour inside card text (dashicons-clock + "HH:MM")
        time_value = dt.time(0, 0, 0)
        tm = re.search(r'dashicons-clock[\s\S]{0,120}?(\d{1,2}:\d{2})', body, flags=re.IGNORECASE)
        if tm:
            hh, mm = tm.group(1).split(":")
            try:
                time_value = dt.time(int(hh), int(mm))
            except ValueError:
                pass

        desc_parts = ["Importado desde Yuzin Sevilla"]
        if event_type:
            desc_parts.append(f"Tipo: {event_type}")
        if city:
            desc_parts.append(f"Ciudad: {city}")

        events.append(
            {
                "title": title,
                "description": ". ".join(desc_parts),
                "place_name": place_name,
                "date": date_value.isoformat(),
                "time": time_value.isoformat(),
            }
        )

    return dedupe_events(events)


def dedupe_events(events: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for event in events:
        key = (
            normalize_line(event.get("title", "")).lower(),
            event.get("date", ""),
            event.get("time", ""),
            normalize_line(event.get("place_name", "")).lower(),
        )
        if key in seen:
            continue
        seen.add(key)
        out.append(event)
    return out


def slugify(value: str) -> str:
    value = normalize_line(value).lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def build_external_id(source_key: str, event: dict) -> str:
    # Keep stable IDs across re-scrapes even if place_name improves later.
    # (legacy-compatible with previous runs where place_name was often empty)
    raw = f"{source_key}|{event['title']}|{event['date']}|{event['time']}|"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]
    return f"{source_key}:{digest}"


def extract_place_from_title(title: str) -> str:
    t = normalize_line(title)
    # Examples:
    # "Concierto: X en Malandar Sevilla 2026"
    # "Concierto: X en el Teatro de la Maestranza de Sevilla 2026"
    m = re.search(r"\ben\s+(.+?)(?:\s+de\s+Sevilla|\s+Sevilla|\s+\d{4}|\s*\(|$)", t, flags=re.IGNORECASE)
    if not m:
        return ""
    place = normalize_line(m.group(1))
    place = re.sub(r"^(el|la|los|las)\s+", "", place, flags=re.IGNORECASE)
    return place


def build_source_payload(source_key: str, calendar_name: str, events: list[dict], year: int) -> dict:
    calendar_key = f"{source_key}-{year}"
    payload = {
        "calendars": [
            {
                "key": calendar_key,
                "name": calendar_name,
                "description": f"Eventos scrapeados desde {calendar_name} ({year})",
                "privacy": "PUBLIC",
                "origin": "CURRENT",
                "external_id": f"source:{calendar_key}",
            }
        ],
        "events": [],
    }

    for event in events:
        payload["events"].append(
            {
                "calendar_key": calendar_key,
                "title": event["title"][:150],
                "description": event.get("description", ""),
                "place_name": event.get("place_name", "")[:255],
                "date": event["date"],
                "time": event["time"],
                "external_id": build_external_id(source_key, event),
            }
        )
    return payload


def merge_payloads(payloads: list[dict]) -> dict:
    merged = {"calendars": [], "events": []}
    for payload in payloads:
        merged["calendars"].extend(payload.get("calendars", []))
        merged["events"].extend(payload.get("events", []))
    return merged


def parse_args():
    parser = argparse.ArgumentParser(description="Scrapea fuentes de Sevilla y genera JSON compatible con load_calendar_data.")
    parser.add_argument("--year", type=int, default=2026)
    parser.add_argument("--output", required=True, help="Ruta del JSON de salida")
    parser.add_argument(
        "--sources",
        default="onsevilla,icas,yuzin",
        help="Lista separada por comas: onsevilla,icas,yuzin",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    selected = {item.strip().lower() for item in args.sources.split(",") if item.strip()}

    payloads = []
    if "onsevilla" in selected:
        payloads.append(
            build_source_payload(
                source_key="onsevilla",
                calendar_name="OnSevilla Sevilla",
                events=parse_onsevilla(args.year),
                year=args.year,
            )
        )
    if "icas" in selected:
        payloads.append(
            build_source_payload(
                source_key="icas",
                calendar_name="ICAS Sevilla",
                events=parse_icas(args.year),
                year=args.year,
            )
        )
    if "yuzin" in selected:
        payloads.append(
            build_source_payload(
                source_key="yuzin",
                calendar_name="Yuzin Sevilla",
                events=parse_yuzin(args.year),
                year=args.year,
            )
        )

    merged = merge_payloads(payloads)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        f"Generado {output_path} -> "
        f"{len(merged['calendars'])} calendarios, {len(merged['events'])} eventos "
        f"(sources={','.join(sorted(selected))}, year={args.year})"
    )


if __name__ == "__main__":
    main()
