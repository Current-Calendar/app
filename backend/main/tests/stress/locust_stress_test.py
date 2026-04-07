import os
import random
import time

from locust import HttpUser, LoadTestShape, between, task
from dotenv import load_dotenv

load_dotenv()

JWT_TOKEN       = os.getenv("LOCUST_JWT_TOKEN", "")
TEST_USER_ID    = int(os.getenv("LOCUST_USER_ID", "1"))
TEST_USERNAME   = os.getenv("LOCUST_USERNAME", "testuser")
TEST_CALENDAR_ID = int(os.getenv("LOCUST_CALENDAR_ID", "1"))
TEST_EVENT_ID   = int(os.getenv("LOCUST_EVENT_ID", "1"))

class StressTestShape(LoadTestShape):


    stages = [
        {"duration":  90,  "users":  50, "spawn_rate": 10},   # Baseline
        {"duration": 210,  "users": 100, "spawn_rate": 10},   # Smooth ramp-up
        {"duration": 330,  "users": 150, "spawn_rate": 10},   # Critical zone
        {"duration": 450,  "users": 200, "spawn_rate": 10},   # Known limit
        {"duration": 690,  "users":   0, "spawn_rate": 50},   # Cooldown / recovery
    ]

    def tick(self):
        run_time = self.get_run_time()
        for stage in self.stages:
            if run_time < stage["duration"]:
                return (stage["users"], stage["spawn_rate"])
        return None  # End of test




class ReadHeavyUser(HttpUser):
    """
    Simulates a user who mostly reads content.
    Real traffic is usually read-heavy (~70%).
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

    # --- Heavier endpoints (main stress-test targets) ---

    @task(5)
    def radar_cercano(self):
        """
        Geospatial endpoint — PostGIS query with spatial index.
        One of the most CPU/memory expensive paths.
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
        """Calendar recommendations (RS-based) — expensive shelve operation."""
        self._get(
            "/api/v1/recommendations/calendars/",
            name="GET /api/v1/recommendations/calendars/",
        )

    @task(4)
    def recomendaciones_eventos(self):
        """Event recommendations — another expensive RS operation."""
        self._get(
            "/api/v1/recommendations/events/",
            name="GET /api/v1/recommendations/events/",
        )

    @task(5)
    def listar_calendarios(self):
        """Calendar listing with optional filters."""
        self._get(
            "/api/v1/calendars/list/",
            name="GET /api/v1/calendars/list/",
            auth=False,
            params={"privacy": random.choice(["PUBLIC", ""])},
        )

    @task(5)
    def listar_eventos(self):
        """Event listing — query with privacy filters."""
        self._get(
            "/api/v1/events/list",
            name="GET /api/v1/events/list",
            params={"calendarId": TEST_CALENDAR_ID} if random.random() > 0.5 else None,
        )

    @task(3)
    def perfil_propio(self):
        """Authenticated user profile."""
        self._get("/api/v1/users/me/", name="GET /api/v1/users/me/")

    @task(3)
    def buscar_usuarios(self):
        """User search — LIKE query on PostgreSQL."""
        query = random.choice(["user", "test", "sevi", "cal"])
        self._get(
            "/api/v1/users/search/",
            name="GET /api/v1/users/search/",
            params={"search": query},
        )

    @task(2)
    def comentarios_evento(self):
        """List comments for an event."""
        self._get(
            "/api/v1/comments/",
            name="GET /api/v1/comments/?EVENT",
            params={"target_type": "EVENT", "target_id": TEST_EVENT_ID, "limit": 10},
        )

    @task(2)
    def historial_chat(self):
        """Event chat history (WebSocket REST fallback)."""
        self._get(
            f"/api/v1/events/{TEST_EVENT_ID}/chat/",
            name="GET /api/v1/events/[id]/chat/",
        )

    @task(1)
    def compartir_calendario(self):
        """Calendar share HTML page — includes OG tag logic."""
        self._get(
            f"/share/calendar/{TEST_CALENDAR_ID}/",
            name="GET /share/calendar/[id]/",
            auth=False,
        )


# ---------------------------------------------------------------------------
# Write users (20% of traffic)
# Represents users creating and editing content.
# ---------------------------------------------------------------------------

class WriteUser(HttpUser):
    """
    Simulates a user creating and modifying content.
    Writes generate higher DB and cache load.
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
                resp.success()  # Duplicates / validation errors are expected
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
        Event creation — PostgreSQL write + cache invalidation.
        One of the most common write paths.
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
                "description": "Event created during stress test",
            },
        )

    @task(2)
    def toggle_like_calendario(self):
        """
        Toggle like — atomic transaction + counter-update signal.
        """
        self._post(
            f"/api/v1/calendars/{TEST_CALENDAR_ID}/like/",
            name="POST /api/v1/calendars/[id]/like/",
        )

    @task(2)
    def toggle_like_evento(self):
        """Toggle like on an event."""
        self._post(
            f"/api/v1/events/{TEST_EVENT_ID}/like/",
            name="POST /api/v1/events/[id]/like/",
        )

    @task(1)
    def rsvp_evento(self):
        """RSVP to an event — update_or_create in DB."""
        self._patch(
            f"/api/v1/events/{TEST_EVENT_ID}/rsvp/",
            name="PATCH /api/v1/events/[id]/rsvp/",
            json={"status": random.choice(["ASSISTING", "NOT_ASSISTING"])},
        )

    @task(1)
    def crear_comentario(self):
        """Create comment — write + replies_count increment."""
        uid = int(time.time() * 1000) % 1000000
        self._post(
            "/api/v1/comments/",
            name="POST /api/v1/comments/",
            json={
                "target_type": "EVENT",
                "target_id": TEST_EVENT_ID,
                "body": f"Stress comment #{uid}",
            },
        )


# ---------------------------------------------------------------------------
# Anonymous users (10% of traffic)
# Represents non-authenticated visitors viewing public content.
# ---------------------------------------------------------------------------

class AnonymousUser(HttpUser):
    """
    Simulates unauthenticated visitors browsing public content.
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