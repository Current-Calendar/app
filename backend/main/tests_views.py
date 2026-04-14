from datetime import date, time
from unittest.mock import patch, MagicMock

from django.test import TestCase, RequestFactory
from rest_framework.test import APITestCase, APIClient
from django.contrib.gis.geos import Point

from main.models import User, Event, Calendar, MockElement, ChatMessage
from main.views import hello_world


class HelloWorldViewTests(TestCase):
    """Tests for the hello_world view using RequestFactory and mocked cache."""

    def setUp(self):
        self.factory = RequestFactory()

    @patch("main.views.cache")
    def test_hello_world_returns_cached_data(self, mock_cache):
        """When data is found in cache, the view returns it with source 'Redis (Cache)'."""
        cached_payload = {
            "id": 1,
            "name": "La Giralda Mock",
            "coordinates": {"longitude": -5.9926, "latitude": 37.3861},
            "created_in_db": True,
            "timestamp": "2026-01-01 00:00:00+00:00",
        }
        mock_cache.get.return_value = cached_payload

        request = self.factory.get("/fake-url/")
        response = hello_world(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["source"], "Redis (Cache)")
        self.assertEqual(response.data["data"], cached_payload)
        mock_cache.get.assert_called_once_with("sevilla_point_data")
        mock_cache.set.assert_not_called()

    @patch("main.views.cache")
    def test_hello_world_uncached_creates_object_and_caches(self, mock_cache):
        """When cache is empty, the view creates a MockElement, caches it, and returns DB source."""
        mock_cache.get.return_value = None

        request = self.factory.get("/fake-url/")
        response = hello_world(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["source"], "PostgreSQL (Database)")

        data = response.data["data"]
        self.assertEqual(data["name"], "La Giralda Mock")
        self.assertAlmostEqual(data["coordinates"]["longitude"], -5.9926, places=4)
        self.assertAlmostEqual(data["coordinates"]["latitude"], 37.3861, places=4)
        self.assertIn("id", data)
        self.assertIn("timestamp", data)
        self.assertTrue(data["created_in_db"])

        mock_cache.set.assert_called_once()
        call_args = mock_cache.set.call_args
        self.assertEqual(call_args[0][0], "sevilla_point_data")
        self.assertEqual(call_args[0][2], 60)

        self.assertTrue(MockElement.objects.filter(name="La Giralda Mock").exists())

    @patch("main.views.cache")
    def test_hello_world_uncached_uses_existing_object(self, mock_cache):
        """When cache is empty but the MockElement already exists, get_or_create returns it."""
        mock_cache.get.return_value = None
        existing = MockElement.objects.create(
            name="La Giralda Mock",
            geo_point=Point(-5.9926, 37.3861),
        )

        request = self.factory.get("/fake-url/")
        response = hello_world(request)

        self.assertEqual(response.status_code, 200)
        data = response.data["data"]
        self.assertEqual(data["id"], existing.id)
        self.assertFalse(data["created_in_db"])

    @patch("main.views.cache")
    def test_hello_world_response_has_cors_header_cached(self, mock_cache):
        """The CORS header is present even when serving from cache."""
        mock_cache.get.return_value = {"id": 1, "name": "test"}

        request = self.factory.get("/fake-url/")
        response = hello_world(request)

        self.assertEqual(response["Access-Control-Allow-Origin"], "*")

    @patch("main.views.cache")
    def test_hello_world_response_has_cors_header_uncached(self, mock_cache):
        """The CORS header is present when serving from the database."""
        mock_cache.get.return_value = None

        request = self.factory.get("/fake-url/")
        response = hello_world(request)

        self.assertEqual(response["Access-Control-Allow-Origin"], "*")


class EventChatHistoryViewTests(APITestCase):
    """Tests for the event_chat_history view via the URL /api/v1/events/<id>/chat/."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="testuser@example.com",
            password="testpass123",
        )
        self.calendar = Calendar.objects.create(
            name="Test Calendar",
            privacy="PUBLIC",
            creator=self.user,
        )
        self.event = Event.objects.create(
            title="Test Event",
            date=date(2026, 6, 15),
            time=time(18, 0),
            creator=self.user,
        )
        self.event.calendars.add(self.calendar)
        self.client = APIClient()

    def _url(self, event_id):
        return f"/api/v1/events/{event_id}/chat/"

    # --- Authentication tests ---

    def test_unauthenticated_returns_401(self):
        """GET without credentials returns 401 Unauthorized."""
        response = self.client.get(self._url(self.event.id))
        self.assertEqual(response.status_code, 401)

    # --- Not found tests ---

    def test_event_not_found_returns_404(self):
        """GET with a non-existent event ID returns 404."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self._url(999999))
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["error"], "Evento no encontrado")

    # --- Success tests ---

    def test_returns_empty_list_for_event_with_no_messages(self):
        """An event with no chat messages returns an empty list."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self._url(self.event.id))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_returns_messages_for_event(self):
        """Messages belonging to the event are returned with correct fields."""
        msg1 = ChatMessage.objects.create(
            event=self.event, sender=self.user, text="Hello!"
        )
        msg2 = ChatMessage.objects.create(
            event=self.event, sender=self.user, text="How are you?"
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(self._url(self.event.id))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

        first = response.data[0]
        self.assertEqual(first["id"], msg1.id)
        self.assertEqual(first["text"], "Hello!")
        self.assertEqual(first["sender"], self.user.id)
        self.assertEqual(first["sender_username"], self.user.username)
        self.assertIn("timestamp", first)

        second = response.data[1]
        self.assertEqual(second["id"], msg2.id)
        self.assertEqual(second["text"], "How are you?")

    def test_messages_ordered_by_timestamp(self):
        """Messages are returned ordered by timestamp (ascending)."""
        msg_a = ChatMessage.objects.create(
            event=self.event, sender=self.user, text="First"
        )
        msg_b = ChatMessage.objects.create(
            event=self.event, sender=self.user, text="Second"
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(self._url(self.event.id))

        self.assertEqual(response.data[0]["text"], "First")
        self.assertEqual(response.data[1]["text"], "Second")

    def test_messages_limited_to_50(self):
        """At most 50 messages are returned even if more exist."""
        for i in range(55):
            ChatMessage.objects.create(
                event=self.event, sender=self.user, text=f"Message {i}"
            )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(self._url(self.event.id))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 50)

    def test_does_not_return_messages_from_other_events(self):
        """Only messages for the requested event are returned, not other events' messages."""
        other_event = Event.objects.create(
            title="Other Event",
            date=date(2026, 7, 1),
            time=time(10, 0),
            creator=self.user,
        )
        ChatMessage.objects.create(
            event=other_event, sender=self.user, text="Wrong event"
        )
        ChatMessage.objects.create(
            event=self.event, sender=self.user, text="Right event"
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(self._url(self.event.id))

        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["text"], "Right event")

    def test_multiple_senders(self):
        """Messages from different senders are all returned with correct sender info."""
        user2 = User.objects.create_user(
            username="user2", email="user2@example.com", password="pass2"
        )
        ChatMessage.objects.create(
            event=self.event, sender=self.user, text="From user1"
        )
        ChatMessage.objects.create(
            event=self.event, sender=user2, text="From user2"
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(self._url(self.event.id))

        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["sender_username"], "testuser")
        self.assertEqual(response.data[1]["sender_username"], "user2")
