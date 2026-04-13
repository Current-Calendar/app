import os
from dotenv import load_dotenv
load_dotenv()
import random
import string
from datetime import date, timedelta
from locust import HttpUser, task, between

JWT_TOKEN = os.getenv("LOCUST_JWT_TOKEN", "")
TEST_USER_ID = int(os.getenv("LOCUST_USER_ID", "1"))
TEST_USERNAME = os.getenv("LOCUST_USERNAME", "testuser")
TEST_CALENDAR_ID = int(os.getenv("LOCUST_CALENDAR_ID", "1"))
TEST_EVENT_ID = int(os.getenv("LOCUST_EVENT_ID", "1"))
TEST_COMMENT_ID = int(os.getenv("LOCUST_COMMENT_ID", "1"))
TEST_USER_ID_TO_FOLLOW = int(os.getenv("LOCUST_USER_ID_TO_FOLLOW", "2"))
TEST_SUBSCRIBE_CALENDAR_ID = int(os.getenv("LOCUST_SUBSCRIBE_CALENDAR_ID", "4"))
TEST_PASSWORD = os.getenv("LOCUST_PASSWORD", "password123")


def _random_str(length=8):
    return "".join(random.choices(string.ascii_lowercase, k=length))


def _random_future_date():
    future = date.today() + timedelta(days=random.randint(1, 365))
    return future.strftime("%Y-%m-%d")


def _random_time():
    hour = random.randint(8, 22)
    minute = random.choice([0, 15, 30, 45])
    return f"{hour:02d}:{minute:02d}:00"


class CurrentUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        self.headers = {}
        if JWT_TOKEN:
            self.headers["Authorization"] = f"Bearer {JWT_TOKEN}"

    def get_ok(self, url, name=None, params=None, auth=True):
        headers = self.headers if auth else {}
        with self.client.get(
            url,
            headers=headers,
            params=params,
            name=name,
            catch_response=True,
        ) as response:
            if response.status_code >= 400:
                response.failure(f"HTTP {response.status_code}")
            else:
                response.success()

    def post_ok(self, url, name=None, data=None, json=None, auth=True):
        headers = dict(self.headers) if auth else {}
        with self.client.post(
            url,
            headers=headers,
            data=data,
            json=json,
            name=name,
            catch_response=True,
        ) as response:
            if response.status_code >= 400:
                response.failure(f"HTTP {response.status_code}")
            else:
                response.success()

    # -------------------------
    # GETs públicos
    # -------------------------

    @task(1)
    def api_schema(self):
        self.get_ok("/api/schema/", name="GET /api/schema/", auth=False)

    @task(1)
    def api_docs(self):
        self.get_ok("/api/docs/", name="GET /api/docs/", auth=False)

    @task(1)
    def graphql_playground(self):
        self.get_ok("/graphql/", name="GET /graphql/", auth=False)

    @task(1)
    def google_auth(self):
        self.get_ok("/api/v1/auth/google-auth", name="GET /api/v1/auth/google-auth", auth=False)

    @task(1)
    def shared_calendar_html(self):
        self.get_ok(
            f"/share/calendar/{TEST_CALENDAR_ID}/",
            name="GET /share/calendar/[calendar_id]/",
            auth=False,
        )

    # -------------------------
    # Users
    # -------------------------

    @task(4)
    def get_me(self):
        self.get_ok("/api/v1/users/me/", name="GET /api/v1/users/me/")

    @task(2)
    def search_users(self):
        queries = ["ra", "test", "user", "calendar"]
        self.get_ok(
            "/api/v1/users/search/",
            name="GET /api/v1/users/search/",
            params={"search": random.choice(queries)},
        )

    @task(1)
    def get_user_by_id(self):
        self.get_ok(
            f"/api/v1/users/{TEST_USER_ID}/",
            name="GET /api/v1/users/[pk]/",
        )

    @task(1)
    def get_user_by_username(self):
        self.get_ok(
            f"/api/v1/users/by-username/{TEST_USERNAME}/",
            name="GET /api/v1/users/by-username/[username]/",
        )

    @task(1)
    def get_followers(self):
        self.get_ok(
            f"/api/v1/users/{TEST_USER_ID}/followers/",
            name="GET /api/v1/users/[pk]/followers/",
        )

    @task(1)
    def get_following(self):
        self.get_ok(
            f"/api/v1/users/{TEST_USER_ID}/following/",
            name="GET /api/v1/users/[pk]/following/",
        )

    @task(1)
    def get_followed_calendars(self):
        self.get_ok(
            f"/api/v1/users/{TEST_USER_ID}/followed_calendars/",
            name="GET /api/v1/users/[pk]/followed_calendars/",
        )

    # -------------------------
    # Calendars
    # -------------------------

    @task(5)
    def list_calendars(self):
        possible_privacies = ["PRIVATE", "PUBLIC"]
        self.get_ok(
            "/api/v1/calendars/list/",
            name="GET /api/v1/calendars/list/",
            params={
                "q": random.choice(["music", "sport", "uni", ""]),
                "privacy": random.choice(possible_privacies),
            },
        )

    @task(2)
    def list_subscribed_calendars(self):
        self.get_ok(
            "/api/v1/calendars/subscribed/",
            name="GET /api/v1/calendars/subscribed/",
        )

    @task(2)
    def list_my_calendars(self):
        self.get_ok(
            "/api/v1/calendars/my-calendars/",
            name="GET /api/v1/calendars/my-calendars/",
        )

    @task(1)
    def list_co_owned_calendars(self):
        self.get_ok(
            "/api/v1/calendars/co_owned/",
            name="GET /api/v1/calendars/co_owned/",
        )

    @task(1)
    def get_calendar_share_info(self):
        self.get_ok(
            f"/api/v1/calendars/{TEST_CALENDAR_ID}/share/",
            name="GET /api/v1/calendars/[calendar_id]/share/",
        )

    # -------------------------
    # Events
    # -------------------------

    @task(5)
    def list_events(self):
        self.get_ok(
            "/api/v1/events/list",
            name="GET /api/v1/events/list",
        )

    @task(2)
    def list_events_with_calendar_filter(self):
        self.get_ok(
            "/api/v1/events/list",
            name="GET /api/v1/events/list?calendarIds",
            params={"calendarIds": TEST_CALENDAR_ID},
        )

    # -------------------------
    # Comments
    # -------------------------

    @task(3)
    def list_comments_event(self):
        self.get_ok(
            "/api/v1/comments/",
            name="GET /api/v1/comments/?EVENT",
            params={
                "target_type": "EVENT",
                "target_id": TEST_EVENT_ID,
                "limit": 10,
                "sort": "new",
            },
        )

    @task(2)
    def list_comments_calendar(self):
        self.get_ok(
            "/api/v1/comments/",
            name="GET /api/v1/comments/?CALENDAR",
            params={
                "target_type": "CALENDAR",
                "target_id": TEST_CALENDAR_ID,
                "limit": 10,
                "sort": "new",
            },
        )

    @task(1)
    def list_replies(self):
        self.get_ok(
            f"/api/v1/comments/{TEST_COMMENT_ID}/replies/",
            name="GET /api/v1/comments/[comment_id]/replies/",
            params={"limit": 10, "sort": "new"},
        )

    # -------------------------
    # Radar / Notifications / Chat / Recommendations
    # -------------------------

    @task(4)
    def radar(self):
        self.get_ok(
            "/api/v1/radar/",
            name="GET /api/v1/radar/",
            params={
                "lat": 40.4168,
                "lon": -3.7038,
            },
        )

    @task(3)
    def notifications(self):
        self.get_ok(
            "/api/v1/notifications/",
            name="GET /api/v1/notifications/",
        )

    @task(1)
    def event_chat_history(self):
        self.get_ok(
            f"/api/v1/events/{TEST_EVENT_ID}/chat/",
            name="GET /api/v1/events/[event_id]/chat/",
        )

    @task(2)
    def recommended_calendars(self):
        self.get_ok(
            "/api/v1/recommendations/calendars/",
            name="GET /api/v1/recommendations/calendars/",
        )

    @task(2)
    def recommended_events(self):
        self.get_ok(
            "/api/v1/recommendations/events/",
            name="GET /api/v1/recommendations/events/",
        )

    # -------------------------
    # POSTs — Auth
    # -------------------------

    @task(3)
    def login(self):
        self.post_ok(
            "/api/v1/token/",
            name="POST /api/v1/token/",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD},
            auth=False,
        )

    # -------------------------
    # POSTs — Users
    # -------------------------

    @task(2)
    def follow_unfollow_user(self):
        self.post_ok(
            f"/api/v1/users/{TEST_USER_ID_TO_FOLLOW}/follow/",
            name="POST /api/v1/users/[pk]/follow/",
        )

    # -------------------------
    # POSTs — Calendars
    # -------------------------

    @task(5)
    def toggle_like_calendar(self):
        self.post_ok(
            f"/api/v1/calendars/{TEST_CALENDAR_ID}/like/",
            name="POST /api/v1/calendars/[calendar_id]/like/",
        )

    @task(2)
    def subscribe_calendar(self):
        self.post_ok(
            f"/api/v1/calendars/{TEST_SUBSCRIBE_CALENDAR_ID}/subscribe/",
            name="POST /api/v1/calendars/[calendar_id]/subscribe/",
        )

    @task(1)
    def create_calendar(self):
        self.post_ok(
            "/api/v1/calendars/create/",
            name="POST /api/v1/calendars/create/",
            json={
                "name": f"Load Test Cal {_random_str()}",
                "description": "Generated by load test",
                "privacy": random.choice(["PUBLIC", "PRIVATE"]),
            },
        )

    # -------------------------
    # POSTs — Events
    # -------------------------

    @task(5)
    def toggle_like_event(self):
        self.post_ok(
            f"/api/v1/events/{TEST_EVENT_ID}/like/",
            name="POST /api/v1/events/[event_id]/like/",
        )

    @task(3)
    def toggle_save_event(self):
        self.post_ok(
            f"/api/v1/events/{TEST_EVENT_ID}/save/",
            name="POST /api/v1/events/[event_id]/save/",
        )

    @task(1)
    def create_event(self):
        self.post_ok(
            "/api/v1/events/create/",
            name="POST /api/v1/events/create/",
            data={
                "title": f"Load Test Event {_random_str()}",
                "description": "Generated by load test",
                "date": _random_future_date(),
                "time": _random_time(),
                "calendars": f"[{TEST_CALENDAR_ID}]",
            },
        )

    # -------------------------
    # POSTs — Comments
    # -------------------------

    @task(3)
    def create_comment_on_event(self):
        self.post_ok(
            "/api/v1/comments/",
            name="POST /api/v1/comments/ (EVENT)",
            json={
                "target_type": "EVENT",
                "target_id": TEST_EVENT_ID,
                "body": f"Load test comment {_random_str()}",
            },
        )

    @task(2)
    def create_comment_on_calendar(self):
        self.post_ok(
            "/api/v1/comments/",
            name="POST /api/v1/comments/ (CALENDAR)",
            json={
                "target_type": "CALENDAR",
                "target_id": TEST_CALENDAR_ID,
                "body": f"Load test comment {_random_str()}",
            },
        )

    # -------------------------
    # POSTs — Reports
    # -------------------------

    @task(1)
    def create_report(self):
        self.post_ok(
            "/api/v1/reports/create/",
            name="POST /api/v1/reports/create/",
            json={
                "reported_type": "EVENT",
                "reported_event": TEST_EVENT_ID,
                "reason": "Load test report",
            },
        )
