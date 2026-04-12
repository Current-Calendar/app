import argparse
import datetime as dt
import random
import sys
import time

import requests


def _clean_base_url(base_url: str) -> str:
    return base_url.rstrip("/")


def _request_json(session: requests.Session, method: str, url: str, **kwargs):
    response = session.request(method, url, timeout=20, **kwargs)
    content_type = response.headers.get("Content-Type", "")
    data = None
    if "application/json" in content_type:
        try:
            data = response.json()
        except ValueError:
            data = None
    return response, data


def _register_user_if_needed(base_url: str, username: str, email: str, password: str):
    payload = {
        "username": username,
        "email": email,
        "password": password,
        "password2": password,
    }
    response = requests.post(
        f"{base_url}/api/v1/auth/register/",
        json=payload,
        timeout=20,
    )
    if response.status_code in (200, 201, 400):
        return
    response.raise_for_status()


def _get_jwt_token(base_url: str, username: str, password: str) -> str:
    payload = {"username": username, "password": password}
    response = requests.post(f"{base_url}/api/v1/token/", json=payload, timeout=20)
    if response.status_code != 200:
        raise RuntimeError(
            f"No se pudo obtener JWT ({response.status_code}): {response.text}"
        )
    body = response.json()
    access = body.get("access")
    if not access:
        raise RuntimeError("Respuesta de token sin campo 'access'.")
    return access


def _get_me(session: requests.Session, base_url: str):
    response, data = _request_json(session, "GET", f"{base_url}/api/v1/users/me/")
    if response.status_code != 200 or not isinstance(data, dict):
        raise RuntimeError(
            f"No se pudo obtener /users/me/ ({response.status_code}): {response.text}"
        )
    user_id = data.get("id")
    username = data.get("username")
    if not user_id or not username:
        raise RuntimeError("/users/me/ no devolvió 'id' y 'username'.")
    return int(user_id), str(username)


def _validate_calendar(session: requests.Session, base_url: str, calendar_id: int) -> bool:
    response = session.get(
        f"{base_url}/api/v1/calendars/{calendar_id}/share/",
        timeout=20,
    )
    return response.status_code == 200


def _create_calendar(session: requests.Session, base_url: str) -> int:
    timestamp = int(time.time())
    payload = {
        "name": f"locust-stress-{timestamp}",
        "description": "Calendar para stress test Locust",
        "privacy": "PUBLIC",
        "origin": "CURRENT",
    }
    response, data = _request_json(
        session,
        "POST",
        f"{base_url}/api/v1/calendars/create/",
        json=payload,
    )
    if response.status_code != 201 or not isinstance(data, dict):
        raise RuntimeError(
            f"No se pudo crear calendario ({response.status_code}): {response.text}"
        )
    calendar_id = data.get("id")
    if not calendar_id:
        raise RuntimeError("Respuesta de create calendar sin 'id'.")
    return int(calendar_id)


def _validate_event(session: requests.Session, base_url: str, event_id: int) -> bool:
    response = session.get(
        f"{base_url}/api/v1/events/{event_id}/chat/",
        timeout=20,
    )
    return response.status_code == 200


def _create_event(session: requests.Session, base_url: str, calendar_id: int) -> int:
    now = dt.datetime.utcnow()
    date_value = (now.date() + dt.timedelta(days=1)).isoformat()
    hour = random.randint(0, 23)
    minute = random.randint(0, 59)
    second = random.randint(0, 59)
    payload = {
        "title": f"locust-event-{int(time.time())}",
        "date": date_value,
        "time": f"{hour:02d}:{minute:02d}:{second:02d}",
        "calendars": [calendar_id],
        "description": "Evento para stress test Locust",
    }

    response, data = _request_json(
        session,
        "POST",
        f"{base_url}/api/v1/events/create/",
        json=payload,
    )
    if response.status_code != 201 or not isinstance(data, dict):
        raise RuntimeError(
            f"No se pudo crear evento ({response.status_code}): {response.text}"
        )
    event_id = data.get("id")
    if not event_id:
        raise RuntimeError("Respuesta de create event sin 'id'.")
    return int(event_id)


def main():
    parser = argparse.ArgumentParser(
        description="Prepara LOCUST_* para backend stress test (login + calendar + event)."
    )
    parser.add_argument("--base-url", required=True, help="Ej: http://localhost:8000")
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--email", help="Necesario solo si usas --register")
    parser.add_argument(
        "--register",
        action="store_true",
        help="Intenta registrar usuario antes de login (ignora duplicado).",
    )
    parser.add_argument("--calendar-id", type=int, help="Reutiliza un calendario existente")
    parser.add_argument("--event-id", type=int, help="Reutiliza un evento existente")
    parser.add_argument(
        "--write-env",
        help="Ruta opcional para guardar salida en formato .env",
    )

    args = parser.parse_args()
    base_url = _clean_base_url(args.base_url)

    if args.register:
        if not args.email:
            raise SystemExit("Si usas --register, debes pasar también --email")
        _register_user_if_needed(base_url, args.username, args.email, args.password)

    token = _get_jwt_token(base_url, args.username, args.password)

    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    })

    user_id, real_username = _get_me(session, base_url)

    calendar_id = args.calendar_id
    if calendar_id is not None:
        if not _validate_calendar(session, base_url, calendar_id):
            raise RuntimeError(
                f"El calendar_id={calendar_id} no existe o no es accesible para este usuario."
            )
    else:
        calendar_id = _create_calendar(session, base_url)

    event_id = args.event_id
    if event_id is not None:
        if not _validate_event(session, base_url, event_id):
            raise RuntimeError(
                f"El event_id={event_id} no existe o no es accesible para este usuario."
            )
    else:
        event_id = _create_event(session, base_url, calendar_id)

    env_lines = [
        f"LOCUST_JWT_TOKEN={token}",
        f"LOCUST_USER_ID={user_id}",
        f"LOCUST_USERNAME={real_username}",
        f"LOCUST_CALENDAR_ID={calendar_id}",
        f"LOCUST_EVENT_ID={event_id}",
    ]

    output = "\n".join(env_lines)
    print(output)

    if args.write_env:
        with open(args.write_env, "w", encoding="utf-8") as file:
            file.write(output + "\n")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
