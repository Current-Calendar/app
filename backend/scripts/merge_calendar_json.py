import argparse
import json
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="Fusiona varios JSON compatibles con load_calendar_data.")
    parser.add_argument("--inputs", nargs="+", required=True, help="Rutas de JSON a fusionar")
    parser.add_argument("--output", required=True, help="Ruta JSON resultante")
    return parser.parse_args()


def load_payload(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    args = parse_args()

    merged = {"calendars": [], "events": []}
    seen_cal = set()
    seen_evt = set()

    for raw_path in args.inputs:
        path = Path(raw_path)
        payload = load_payload(path)

        for calendar in payload.get("calendars", []):
            key = (calendar.get("external_id") or "", calendar.get("name") or "")
            if key in seen_cal:
                continue
            seen_cal.add(key)
            merged["calendars"].append(calendar)

        for event in payload.get("events", []):
            key = (
                event.get("external_id") or "",
                event.get("title") or "",
                event.get("date") or "",
                event.get("time") or "",
                event.get("calendar_key") or "",
            )
            if key in seen_evt:
                continue
            seen_evt.add(key)
            merged["events"].append(event)

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"Fusionado en {output}: "
        f"{len(merged['calendars'])} calendarios, {len(merged['events'])} eventos."
    )


if __name__ == "__main__":
    main()
