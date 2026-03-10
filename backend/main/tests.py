import json

from django.contrib.auth.hashers import identify_hasher, check_password
from django.test import TestCase
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password
import datetime
from main.models import User, Calendar, Event
from django.urls import reverse
from main.models import User, Calendar, Event
from django.utils import timezone
from django.contrib.gis.geos import Point
from datetime import timedelta, date, time

ENDPOINT_EVENTS = "/api/v1/events"
PUBLISH_CALENDAR_ENDPOINT = "/api/v1/calendars/{}/publish"

from .models import Event, Calendar


class CreateEventTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="eventuser",
            email="event@example.com",
            password="testpass123",
        )

        self.calendar = Calendar.objects.create(
            creator=self.user,
            name="Test Calendar",
            privacy="PRIVATE",
        )

    def test_create_event_success(self):
        self.client.force_authenticate(self.user)

        payload = {
            "title": "Test Event",
            "date": "2026-03-01",
            "time": "18:00:00",
            "calendars": [self.calendar.id],
            "creator_id": self.user.id
        }

        response = self.client.post(ENDPOINT_EVENTS, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Event.objects.filter(title="Test Event").exists()
        )

    def test_create_event_missing_title(self):
        self.client.force_authenticate(self.user)

        payload = {
            "date": "2026-03-01",
            "time": "18:00:00",
            "calendars": [self.calendar.id],
        }

        response = self.client.post(ENDPOINT_EVENTS, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_event_missing_date(self):
        self.client.force_authenticate(self.user)

        payload = {
            "title": "Test Event",
            "time": "18:00:00",
            "calendars": [self.calendar.id],
        }

        response = self.client.post(ENDPOINT_EVENTS, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_event_missing_time(self):
        self.client.force_authenticate(self.user)

        payload = {
            "title": "Test Event",
            "date": "2026-03-01",
            "calendars": [self.calendar.id],
        }

        response = self.client.post(ENDPOINT_EVENTS, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_event_missing_calendars(self):
        self.client.force_authenticate(self.user)

        payload = {
            "title": "Test Event",
            "date": "2026-03-01",
            "time": "18:00:00",
        }

        response = self.client.post(ENDPOINT_EVENTS, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_event_calendar_not_found(self):
        self.client.force_authenticate(self.user)

        payload = {
            "title": "Test Event",
            "date": "2026-03-01",
            "time": "18:00:00",
            "calendars": [999999],
        }

        response = self.client.post(ENDPOINT_EVENTS, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_event_unauthenticated(self):
        payload = {
            "title": "Test Event",
            "date": "2026-03-01",
            "time": "18:00:00",
            "calendars": [self.calendar.id],
        }

        response = self.client.post(ENDPOINT_EVENTS, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class PublishCalendarTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="calendaruser",
            email="calendar@example.com",
            password="testpass123",
        )
        self.other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="testpass123",
        )

        self.calendar = Calendar.objects.create(
            creator=self.user,
            name="Test Calendar",
            privacy="FRIENDS",
        )

    def test_publish_calendar_success(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            PUBLISH_CALENDAR_ENDPOINT.format(self.calendar.id)
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.calendar.refresh_from_db()
        self.assertEqual(self.calendar.privacy, "PUBLIC")

    def test_publish_calendar_already_public(self):
        self.client.force_authenticate(self.user)
        self.calendar.privacy = "PUBLIC"
        self.calendar.save()

        response = self.client.put(
            PUBLISH_CALENDAR_ENDPOINT.format(self.calendar.id)
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_publish_calendar_not_creator(self):
        self.client.force_authenticate(self.other_user)

        response = self.client.put(
            PUBLISH_CALENDAR_ENDPOINT.format(self.calendar.id)
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_publish_calendar_unauthenticated(self):
        response = self.client.put(
            PUBLISH_CALENDAR_ENDPOINT.format(self.calendar.id)
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class CreateCalendarTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="calendaruser2",
            email="calendar2@example.com",
            password="testpass123",
        )

    def test_create_calendar_success(self):
        self.client.force_authenticate(self.user)

        payload = {
            "name": "My Calendar",
            "privacy": "PUBLIC",
        }

        response = self.client.post("/api/v1/calendars", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_calendar_missing_name(self):
        self.client.force_authenticate(self.user)

        payload = {
            "privacy": "PUBLIC",
        }

        response = self.client.post("/api/v1/calendars", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_calendar_duplicate_private(self):
        self.client.force_authenticate(self.user)

        Calendar.objects.create(
            creator=self.user,
            name="First Private Calendar",
            privacy="PRIVATE",
        )

        payload = {
            "name": "Second Private Calendar",
            "privacy": "PRIVATE",
        }

        response = self.client.post("/api/v1/calendars", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_calendar_unauthenticated(self):
        payload = {
            "name": "My Calendar",
            "privacy": "PUBLIC",
        }

        response = self.client.post("/api/v1/calendars", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
