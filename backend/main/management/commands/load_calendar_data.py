import datetime
import json
from pathlib import Path

from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand, CommandError
from django.core.exceptions import ValidationError
from django.db import transaction

from main.models import Calendar, Event, User


class Command(BaseCommand):
    help = "Carga calendarios y eventos desde un JSON normalizado sin modificar los modelos."

    def add_arguments(self, parser):
        parser.add_argument("json_path", help="Ruta al archivo JSON de entrada.")
        parser.add_argument(
            "--creator",
            required=True,
            help="ID, username o email del usuario creador de los calendarios y eventos.",
        )
        parser.add_argument(
            "--default-privacy",
            default="PUBLIC",
            choices=[choice[0] for choice in Calendar.PRIVACY_CHOICES],
            help="Privacy por defecto para calendarios si no viene en el JSON.",
        )
        parser.add_argument(
            "--default-origin",
            default="CURRENT",
            choices=[choice[0] for choice in Calendar.ORIGIN_CHOICES],
            help="Origin por defecto para calendarios si no viene en el JSON.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Procesa y valida el JSON, pero revierte todos los cambios al final.",
        )

    def handle(self, *args, **options):
        json_path = Path(options["json_path"])
        if not json_path.exists():
            raise CommandError(f"No existe el archivo JSON: {json_path}")

        creator = self._resolve_creator(options["creator"])
        payload = self._load_payload(json_path)

        calendars_payload = payload.get("calendars", [])
        events_payload = payload.get("events", [])

        if not isinstance(calendars_payload, list):
            raise CommandError("'calendars' debe ser una lista.")
        if not isinstance(events_payload, list):
            raise CommandError("'events' debe ser una lista.")

        stats = {
            "calendars_created": 0,
            "calendars_updated": 0,
            "events_created": 0,
            "events_updated": 0,
        }
        calendar_refs = {}

        with transaction.atomic():
            for index, calendar_payload in enumerate(calendars_payload, start=1):
                calendar, created, ref_keys = self._upsert_calendar(
                    creator=creator,
                    payload=calendar_payload,
                    default_privacy=options["default_privacy"],
                    default_origin=options["default_origin"],
                    index=index,
                )
                stats["calendars_created" if created else "calendars_updated"] += 1
                for ref_key in ref_keys:
                    if ref_key:
                        calendar_refs[ref_key] = calendar

            for index, event_payload in enumerate(events_payload, start=1):
                event, created = self._upsert_event(
                    creator=creator,
                    payload=event_payload,
                    calendar_refs=calendar_refs,
                    index=index,
                )
                stats["events_created" if created else "events_updated"] += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Evento {'creado' if created else 'actualizado'}: "
                        f"{event.title} ({event.date} {event.time})"
                    )
                )

            if options["dry_run"]:
                transaction.set_rollback(True)
                self.stdout.write(self.style.WARNING("Dry-run completado. No se guardaron cambios."))

        self.stdout.write(
            self.style.SUCCESS(
                "Resumen load_calendar_data -> "
                f"calendars creados: {stats['calendars_created']}, "
                f"calendars actualizados: {stats['calendars_updated']}, "
                f"events creados: {stats['events_created']}, "
                f"events actualizados: {stats['events_updated']}"
            )
        )

    def _resolve_creator(self, creator_value):
        creator = None
        if str(creator_value).isdigit():
            creator = User.objects.filter(id=int(creator_value)).first()
        if creator is None:
            creator = User.objects.filter(username=creator_value).first()
        if creator is None:
            creator = User.objects.filter(email=creator_value).first()
        if creator is None:
            raise CommandError(f"No se encontró el usuario creator '{creator_value}'.")
        return creator

    def _load_payload(self, json_path: Path):
        try:
            return json.loads(json_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CommandError(f"JSON inválido en {json_path}: {exc}") from exc

    def _upsert_calendar(self, creator, payload, default_privacy, default_origin, index):
        if not isinstance(payload, dict):
            raise CommandError(f"Cada item de 'calendars' debe ser un objeto. Error en posición {index}.")

        name = (payload.get("name") or "").strip()
        if not name:
            raise CommandError(f"El calendario en posición {index} necesita 'name'.")

        external_id = self._blank_to_none(payload.get("external_id"))
        privacy = payload.get("privacy") or default_privacy
        origin = payload.get("origin") or default_origin

        if privacy not in {choice[0] for choice in Calendar.PRIVACY_CHOICES}:
            raise CommandError(f"Privacy inválido para calendario '{name}': {privacy}")
        if origin not in {choice[0] for choice in Calendar.ORIGIN_CHOICES}:
            raise CommandError(f"Origin inválido para calendario '{name}': {origin}")

        calendar = None
        if external_id:
            calendar = Calendar.objects.filter(creator=creator, external_id=external_id).first()
        if calendar is None:
            calendar = Calendar.objects.filter(creator=creator, name=name).first()

        created = calendar is None
        if created:
            calendar = Calendar(creator=creator)

        calendar.name = name
        calendar.description = payload.get("description", "") or ""
        calendar.privacy = privacy
        calendar.origin = origin
        calendar.external_id = external_id

        self._validate_model(calendar, f"calendario '{name}'")
        calendar.save()

        self.stdout.write(
            self.style.SUCCESS(
                f"Calendario {'creado' if created else 'actualizado'}: {calendar.name}"
            )
        )

        ref_keys = {
            self._build_ref("key", payload.get("key")),
            self._build_ref("external_id", external_id),
            self._build_ref("name", calendar.name),
        }
        return calendar, created, ref_keys

    def _upsert_event(self, creator, payload, calendar_refs, index):
        if not isinstance(payload, dict):
            raise CommandError(f"Cada item de 'events' debe ser un objeto. Error en posición {index}.")

        title = (payload.get("title") or "").strip()
        if not title:
            raise CommandError(f"El evento en posición {index} necesita 'title'.")
        title = self._truncate(title, 150)

        date_value, time_value = self._parse_date_time_payload(payload, index)
        calendars = self._resolve_event_calendars(creator, payload, calendar_refs, index)

        external_id = self._blank_to_none(payload.get("external_id"))
        event = None
        if external_id:
            event = Event.objects.filter(creator=creator, external_id=external_id).first()
        if event is None:
            query = Event.objects.filter(
                creator=creator,
                title=title,
                date=date_value,
                time=time_value,
            )
            if calendars:
                query = query.filter(calendars=calendars[0]).distinct()
            event = query.first()

        created = event is None
        if created:
            event = Event(creator=creator)

        event.title = title
        event.description = payload.get("description", "") or ""
        event.place_name = self._truncate(payload.get("place_name", "") or "", 255)
        event.date = date_value
        event.time = time_value
        event.recurrence = payload.get("recurrence")
        event.external_id = external_id
        event.location = self._build_point(payload)

        self._validate_model(event, f"evento '{title}'")
        event.save()
        event.calendars.set(calendars)
        return event, created

    def _resolve_event_calendars(self, creator, payload, calendar_refs, index):
        resolved = []
        resolved_ids = set()
        ref_candidates = []

        ref_candidates.extend(
            self._as_ref_list("key", payload.get("calendar_key"))
            + self._as_ref_list("key", payload.get("calendar_keys"))
        )
        ref_candidates.extend(
            self._as_ref_list("external_id", payload.get("calendar_external_id"))
            + self._as_ref_list("external_id", payload.get("calendar_external_ids"))
        )
        ref_candidates.extend(
            self._as_ref_list("name", payload.get("calendar_name"))
            + self._as_ref_list("name", payload.get("calendar_names"))
        )

        if not ref_candidates:
            raise CommandError(
                f"El evento en posición {index} debe indicar al menos un calendario "
                f"(calendar_key, calendar_external_id o calendar_name)."
            )

        for ref in ref_candidates:
            calendar = calendar_refs.get(ref)
            if calendar is None:
                calendar = self._lookup_calendar_by_ref(creator, ref)
            if calendar is None:
                raise CommandError(
                    f"No se encontró el calendario referenciado por '{ref}' para el evento en posición {index}."
                )
            if calendar.id not in resolved_ids:
                resolved.append(calendar)
                resolved_ids.add(calendar.id)

        return resolved

    def _parse_date_time_payload(self, payload, index):
        start_value = payload.get("start") or payload.get("start_datetime")
        if start_value:
            try:
                normalized = str(start_value).replace("Z", "+00:00")
                if "T" in normalized or " " in normalized:
                    parsed = datetime.datetime.fromisoformat(normalized)
                    return parsed.date(), parsed.time().replace(tzinfo=None, microsecond=0)
                parsed_date = datetime.date.fromisoformat(normalized)
                return parsed_date, datetime.time(0, 0, 0)
            except ValueError as exc:
                raise CommandError(
                    f"Formato inválido de 'start' en evento posición {index}: {start_value}"
                ) from exc

        date_raw = payload.get("date")
        if not date_raw:
            raise CommandError(f"El evento en posición {index} necesita 'date' o 'start'.")

        time_raw = payload.get("time") or "00:00:00"
        try:
            date_value = datetime.date.fromisoformat(str(date_raw))
        except ValueError as exc:
            raise CommandError(f"Fecha inválida en evento posición {index}: {date_raw}") from exc

        try:
            time_value = datetime.time.fromisoformat(str(time_raw))
        except ValueError as exc:
            raise CommandError(f"Hora inválida en evento posición {index}: {time_raw}") from exc

        return date_value, time_value

    def _build_point(self, payload):
        lat = payload.get("lat")
        lng = payload.get("lng")
        if lat is None or lng is None:
            return None

        try:
            return Point(float(lng), float(lat), srid=4326)
        except (TypeError, ValueError) as exc:
            raise CommandError(f"Lat/Lng inválidos para evento '{payload.get('title', '')}'.") from exc

    def _validate_model(self, instance, label):
        try:
            instance.full_clean()
        except ValidationError as exc:
            raw_messages = []
            if hasattr(exc, "message_dict"):
                for field_errors in exc.message_dict.values():
                    raw_messages.extend(field_errors)
            if not raw_messages and getattr(exc, "messages", None):
                raw_messages.extend(exc.messages)
            raise CommandError(f"Error validando {label}: {' | '.join(raw_messages)}") from exc

    def _blank_to_none(self, value):
        if value is None:
            return None
        value = str(value).strip()
        return value or None

    def _as_ref_list(self, ref_type, raw_value):
        if raw_value is None:
            return []
        values = raw_value if isinstance(raw_value, list) else [raw_value]
        return [self._build_ref(ref_type, value) for value in values if str(value).strip()]

    def _build_ref(self, ref_type, value):
        if value is None:
            return None
        normalized = str(value).strip()
        if not normalized:
            return None
        return f"{ref_type}:{normalized}"

    def _truncate(self, value, max_length):
        value = str(value or "")
        return value[:max_length] if len(value) > max_length else value

    def _lookup_calendar_by_ref(self, creator, ref):
        ref_type, _, ref_value = ref.partition(":")
        if not ref_value:
            return None

        if ref_type == "external_id":
            return Calendar.objects.filter(creator=creator, external_id=ref_value).first()
        if ref_type == "name":
            return Calendar.objects.filter(creator=creator, name=ref_value).first()
        return None
