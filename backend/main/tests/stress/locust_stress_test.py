"""
Stress Testing — Current Calendar
==================================
Objetivo: Identificar el punto de ruptura del sistema y su comportamiento
al superarlo, tal como se define en el Plan de Pruebas (sección 1.7.2 y 3.5).

Uso:
    # Con interfaz web (recomendado para pruebas de estrés)
    locust -f stressfile.py --host=https://api-staging.currentcalendar.es

    # Sin interfaz web (modo headless, útil en CI)
    locust -f stressfile.py --host=https://api-staging.currentcalendar.es \
        --headless --users 700 --spawn-rate 50 --run-time 8m

Variables de entorno necesarias (copiar desde .env):
    LOCUST_JWT_TOKEN  — JWT access token válido
    LOCUST_USER_ID    — ID del usuario autenticado
    LOCUST_USERNAME   — Username del usuario autenticado
    LOCUST_CALENDAR_ID — ID de un calendario existente
    LOCUST_EVENT_ID   — ID de un evento existente
"""

import os
import random
import time

from locust import HttpUser, LoadTestShape, between, task
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Configuración desde variables de entorno
# ---------------------------------------------------------------------------
JWT_TOKEN       = os.getenv("LOCUST_JWT_TOKEN", "")
TEST_USER_ID    = int(os.getenv("LOCUST_USER_ID", "1"))
TEST_USERNAME   = os.getenv("LOCUST_USERNAME", "testuser")
TEST_CALENDAR_ID = int(os.getenv("LOCUST_CALENDAR_ID", "1"))
TEST_EVENT_ID   = int(os.getenv("LOCUST_EVENT_ID", "1"))


# ---------------------------------------------------------------------------
# Shape de carga: versión corta para iteración rápida
#
# Stage  | Usuarios | Spawn rate | Duración | Objetivo
# -------|----------|------------|----------|---------------------------
#   1    |    50    |    10/s    |   90 s   | Baseline (carga normal)
#   2    |   200    |    25/s    |   90 s   | Carga alta (umbral plan)
#   3    |   400    |    50/s    |  120 s   | Límite plan (< 5 % errores)
#   4    |   700    |    50/s    |  120 s   | Búsqueda de ruptura
#   5    |     0    |   100/s    |   30 s   | Cooldown / recuperación
# ---------------------------------------------------------------------------

class StressTestShape(LoadTestShape):
    """
    Escalada corta que permite localizar el punto de ruptura rápido.
    Total aproximado: 7.5 minutos.
    """

    stages = [
        {"duration": 90,   "users":   50, "spawn_rate":  10},   # Baseline
        {"duration": 180,  "users":  200, "spawn_rate":  25},   # Carga alta
        {"duration": 300,  "users":  400, "spawn_rate":  50},   # Límite plan
        {"duration": 420,  "users":  700, "spawn_rate":  50},   # Búsqueda ruptura
        {"duration": 450,  "users":    0, "spawn_rate": 100},   # Cooldown
    ]

    def tick(self):
        run_time = self.get_run_time()
        for stage in self.stages:
            if run_time < stage["duration"]:
                return (stage["users"], stage["spawn_rate"])
        return None  # Fin del test


# ---------------------------------------------------------------------------
# Usuarios de lectura (70 % del tráfico)
# Representa usuarios anónimos o autenticados que navegan la app.
# ---------------------------------------------------------------------------

class ReadHeavyUser(HttpUser):
    """
    Simula un usuario que principalmente lee contenido.
    70 % del tráfico real suele ser lectura.
    """

    weight = 7
    wait_time = between(0.5, 2)

    def on_start(self):
        self.headers = {}
        if JWT_TOKEN:
            self.headers["Authorization"] = f"Bearer {JWT_TOKEN}"

    def _get(self, url, name, auth=True, params=None):
        headers = self.headers if auth else {}
        with self.client.get(
            url,
            headers=headers,
            params=params,
            name=name,
            catch_response=True,
        ) as resp:
            if resp.status_code >= 500:
                resp.failure(f"Server error {resp.status_code}")
            elif resp.status_code >= 400:
                resp.failure(f"Client error {resp.status_code}")
            else:
                resp.success()

    # --- Endpoints más pesados (targets principales del stress test) ---

    @task(5)
    def radar_cercano(self):
        """
        Endpoint geoespacial — consulta PostGIS con índice espacial.
        Uno de los más costosos en CPU/memoria.
        """
        lat = round(random.uniform(37.30, 37.45), 6)
        lon = round(random.uniform(-6.05, -5.90), 6)
        self._get(
            "/api/v1/radar/",
            name="GET /api/v1/radar/",
            auth=False,
            params={"lat": lat, "lon": lon, "radio": random.choice([5, 15, 35])},
        )

    @task(4)
    def recomendaciones_calendarios(self):
        """Recomendaciones basadas en RS — operación costosa con shelve."""
        self._get(
            "/api/v1/recommendations/calendars/",
            name="GET /api/v1/recommendations/calendars/",
        )

    @task(4)
    def recomendaciones_eventos(self):
        """Recomendaciones de eventos — otra operación RS costosa."""
        self._get(
            "/api/v1/recommendations/events/",
            name="GET /api/v1/recommendations/events/",
        )

    @task(5)
    def listar_calendarios(self):
        """Listado de calendarios con filtros opcionales."""
        self._get(
            "/api/v1/calendars/list/",
            name="GET /api/v1/calendars/list/",
            auth=False,
            params={"privacy": random.choice(["PUBLIC", ""])},
        )

    @task(5)
    def listar_eventos(self):
        """Listado de eventos — query con filtros de privacidad."""
        self._get(
            "/api/v1/events/list",
            name="GET /api/v1/events/list",
            params={"calendarId": TEST_CALENDAR_ID} if random.random() > 0.5 else None,
        )

    @task(3)
    def perfil_propio(self):
        """Perfil autenticado del usuario."""
        self._get("/api/v1/users/me/", name="GET /api/v1/users/me/")

    @task(3)
    def buscar_usuarios(self):
        """Búsqueda de usuarios — LIKE sobre PostgreSQL."""
        query = random.choice(["user", "test", "sevi", "cal"])
        self._get(
            "/api/v1/users/search/",
            name="GET /api/v1/users/search/",
            params={"search": query},
        )

    @task(2)
    def comentarios_evento(self):
        """Listado de comentarios de un evento."""
        self._get(
            "/api/v1/comments/",
            name="GET /api/v1/comments/?EVENT",
            params={"target_type": "EVENT", "target_id": TEST_EVENT_ID, "limit": 10},
        )

    @task(2)
    def historial_chat(self):
        """Historial de chat de un evento (WebSocket REST fallback)."""
        self._get(
            f"/api/v1/events/{TEST_EVENT_ID}/chat/",
            name="GET /api/v1/events/[id]/chat/",
        )

    @task(1)
    def compartir_calendario(self):
        """Página HTML de compartir — incluye lógica OG tags."""
        self._get(
            f"/share/calendar/{TEST_CALENDAR_ID}/",
            name="GET /share/calendar/[id]/",
            auth=False,
        )


# ---------------------------------------------------------------------------
# Usuarios de escritura (20 % del tráfico)
# Representa usuarios que crean y modifican contenido.
# ---------------------------------------------------------------------------

class WriteUser(HttpUser):
    """
    Simula un usuario que crea y modifica contenido.
    Las escrituras generan mayor carga en BD y caché.
    """

    weight = 2
    wait_time = between(1, 4)

    def on_start(self):
        if not JWT_TOKEN:
            self.environment.runner.quit()
        self.headers = {
            "Authorization": f"Bearer {JWT_TOKEN}",
            "Content-Type": "application/json",
        }
        self._event_counter = int(time.time() * 1000) % 100000

    def _post(self, url, name, json=None):
        with self.client.post(
            url,
            json=json,
            headers=self.headers,
            name=name,
            catch_response=True,
        ) as resp:
            if resp.status_code >= 500:
                resp.failure(f"Server error {resp.status_code}")
            elif resp.status_code in (400, 409):
                resp.success()  # Duplicados / validación son respuestas esperadas
            elif resp.status_code >= 400:
                resp.failure(f"Client error {resp.status_code}")
            else:
                resp.success()

    def _patch(self, url, name, json=None):
        with self.client.patch(
            url,
            json=json,
            headers=self.headers,
            name=name,
            catch_response=True,
        ) as resp:
            if resp.status_code >= 500:
                resp.failure(f"Server error {resp.status_code}")
            elif resp.status_code in (400, 409):
                resp.success()
            elif resp.status_code >= 400:
                resp.failure(f"Client error {resp.status_code}")
            else:
                resp.success()

    @task(3)
    def crear_evento(self):
        """
        Creación de evento — escritura en PostgreSQL + invalidación de caché.
        Uno de los paths de escritura más comunes.
        """
        self._event_counter += 1
        uid = f"{TEST_USER_ID}_{int(time.time())}_{self._event_counter}"
        self._post(
            "/api/v1/events/create/",
            name="POST /api/v1/events/create/",
            json={
                "title": f"Stress Event {uid}",
                "date": "2099-01-01",
                "time": f"{random.randint(0, 23):02d}:{random.randint(0, 59):02d}:00",
                "calendars": [TEST_CALENDAR_ID],
                "description": "Evento creado durante stress test",
            },
        )

    @task(2)
    def toggle_like_calendario(self):
        """
        Toggle like — transacción atómica + señal de actualización del contador.
        """
        self._post(
            f"/api/v1/calendars/{TEST_CALENDAR_ID}/like/",
            name="POST /api/v1/calendars/[id]/like/",
        )

    @task(2)
    def toggle_like_evento(self):
        """Toggle like sobre un evento."""
        self._post(
            f"/api/v1/events/{TEST_EVENT_ID}/like/",
            name="POST /api/v1/events/[id]/like/",
        )

    @task(1)
    def rsvp_evento(self):
        """Confirmar asistencia a un evento — update_or_create en BD."""
        self._patch(
            f"/api/v1/events/{TEST_EVENT_ID}/rsvp/",
            name="PATCH /api/v1/events/[id]/rsvp/",
            json={"status": random.choice(["ASSISTING", "NOT_ASSISTING"])},
        )

    @task(1)
    def crear_comentario(self):
        """Creación de comentario — escritura + incremento replies_count."""
        uid = int(time.time() * 1000) % 1000000
        self._post(
            "/api/v1/comments/",
            name="POST /api/v1/comments/",
            json={
                "target_type": "EVENT",
                "target_id": TEST_EVENT_ID,
                "body": f"Comentario de estrés #{uid}",
            },
        )


# ---------------------------------------------------------------------------
# Usuarios anónimos (10 % del tráfico)
# Representa visitantes sin cuenta que ven contenido público.
# ---------------------------------------------------------------------------

class AnonymousUser(HttpUser):
    """
    Simula visitantes sin autenticación que navegan contenido público.
    """

    weight = 1
    wait_time = between(1, 3)

    def _get(self, url, name, params=None):
        with self.client.get(
            url,
            params=params,
            name=name,
            catch_response=True,
        ) as resp:
            if resp.status_code >= 500:
                resp.failure(f"Server error {resp.status_code}")
            else:
                resp.success()

    @task(4)
    def explorar_calendarios(self):
        self._get(
            "/api/v1/calendars/list/",
            name="GET /api/v1/calendars/list/ [anon]",
            params={"privacy": "PUBLIC"},
        )

    @task(3)
    def radar_anonimo(self):
        lat = round(random.uniform(37.30, 37.45), 6)
        lon = round(random.uniform(-6.05, -5.90), 6)
        self._get(
            "/api/v1/radar/",
            name="GET /api/v1/radar/ [anon]",
            params={"lat": lat, "lon": lon},
        )

    @task(2)
    def compartir_link(self):
        self._get(
            f"/share/calendar/{TEST_CALENDAR_ID}/",
            name="GET /share/calendar/[id]/ [anon]",
        )

    @task(1)
    def graphql_calendarios(self):
        with self.client.post(
            "/graphql/",
            json={"query": "{ allPublicCalendars { id name } }"},
            name="POST /graphql/ allPublicCalendars [anon]",
            catch_response=True,
        ) as resp:
            if resp.status_code >= 500:
                resp.failure(f"Server error {resp.status_code}")
            else:
                resp.success()