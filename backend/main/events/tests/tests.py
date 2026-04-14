import datetime
import json
from datetime import date, time, datetime as dt
from rest_framework.test import APITestCase, APIRequestFactory
from django.test import override_settings
from django.conf import settings
import tempfile
import shutil
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from unittest.mock import patch
from main.models import User, Calendar, Event, EventAttendance, Notification
from main.events.views import list_events_from_calendar

ENDPOINT_EVENTOS = "/api/v1/events/"
EDIT_EVENT_ENDPOINT = "/api/v1/events/{}/edit/"
ENDPOINT_EVENTS_CREATE = "/api/v1/events/create/"

class EventTests(APITestCase):
    def setUp(self) -> None:
        super().setUp()

        self.user1 = User.objects.create_user(
            username="user1", email="user1@example.com", password="user1"
        )
        self.user2 = User.objects.create_user(
            username="user2", email="user2@example.com", password="user2"
        )

        self.event1 = Event.objects.create(
            title="Cena cumpleaños",
            description="Nos vemos en el restaurante de siempre.",
            date=date(2026, 3, 20),
            time=time(21, 00),
            creator=self.user1,
        )

        self.calendar1 = Calendar.objects.create(
            name="Calendario user1",
            creator=self.user1,
            privacy="PRIVATE",
        )
        self.event1.calendars.add(self.calendar1)


    def test_delete_unauthenticated(self):
        self.assertEqual(Event.objects.count(), 1)

        request = self.client.delete(f"/api/v1/events/{self.event1.pk}/delete/")

        self.assertEqual(request.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(Event.objects.count(), 1)


    def test_delete_event(self):
        self.assertEqual(Event.objects.count(), 1)

        self.client.force_authenticate(self.user1)

        request = self.client.delete(f"/api/v1/events/{self.event1.pk}/delete/")

        self.assertEqual(request.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Event.objects.count(), 0)

    def test_delete_event_not_creator(self):
        self.assertEqual(Event.objects.count(), 1)

        self.client.force_authenticate(self.user2)

        request = self.client.delete(f"/api/v1/events/{self.event1.pk}/delete/")

        self.assertEqual(request.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Event.objects.count(), 1)

    def test_delete_event_as_calendar_co_owner(self):
        self.assertEqual(Event.objects.count(), 1)

        self.calendar1.co_owners.add(self.user2)

        self.client.force_authenticate(self.user2)

        request = self.client.delete(f"/api/v1/events/{self.event1.pk}/delete/")

        self.assertEqual(request.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Event.objects.count(), 0)

    def test_delete_not_found_event(self):
        self.assertEqual(Event.objects.count(), 1)

        self.client.force_authenticate(self.user1)

        request = self.client.delete("/api/v1/events/999999/delete/")

        self.assertEqual(request.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Event.objects.count(), 1)


class AsignarEventoCalendarTests(APITestCase):

    def setUp(self):
        self.url = '/api/v1/events/asign-to-calendar/'

        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='password123'
        )
        self.calendar = Calendar.objects.create(
            name='Mi Calendar',
            creator=self.user,
            privacy='PUBLIC'
        )
        self.event = Event.objects.create(
            title='Event Test',
            date=datetime.date(2026, 6, 1),
            time=datetime.time(10, 0),
            creator=self.user
        )

    def test_asignar_evento_exitoso(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {
            'evento_id': self.event.pk,
            'calendario_id': self.calendar.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('mensaje', response.data)
        self.assertTrue(self.event.calendars.filter(pk=self.calendar.pk).exists())

    def test_asignar_sin_evento_id(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {
            'calendario_id': self.calendar.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_asignar_sin_calendario_id(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {
            'evento_id': self.event.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_asignar_evento_inexistente(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {
            'evento_id': 99999,
            'calendario_id': self.calendar.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_asignar_calendario_inexistente(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {
            'evento_id': self.event.pk,
            'calendario_id': 99999
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_asignar_evento_ya_asignado(self):
        self.event.calendars.add(self.calendar)

        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {
            'evento_id': self.event.pk,
            'calendario_id': self.calendar.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        

class DesasignarEventoCalendarTests(APITestCase):

    def setUp(self):
        self.url = '/api/v1/events/deasign-from-calendar/'

        self.user = User.objects.create_user(
            username='testuser2',
            email='test2@test.com',
            password='password123'
        )
        self.calendar = Calendar.objects.create(
            name='Mi Calendar 2',
            creator=self.user,
            privacy='PUBLIC'
        )
        self.event = Event.objects.create(
            title='Event Test 2',
            date=datetime.date(2026, 6, 1),
            time=datetime.time(10, 0),
            creator=self.user
        )
        self.event.calendars.add(self.calendar)

    def test_desasignar_evento_exitoso(self):
        self.client.force_authenticate(self.user)

        response = self.client.delete(self.url, {
            'evento_id': self.event.pk,
            'calendario_id': self.calendar.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('mensaje', response.data)
        self.assertFalse(self.event.calendars.filter(pk=self.calendar.pk).exists())

    def test_desasignar_sin_evento_id(self):
        self.client.force_authenticate(self.user)

        response = self.client.delete(self.url, {
            'calendario_id': self.calendar.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_desasignar_sin_calendario_id(self):
        self.client.force_authenticate(self.user)

        response = self.client.delete(self.url, {
            'evento_id': self.event.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_desasignar_evento_inexistente(self):
        self.client.force_authenticate(self.user)

        response = self.client.delete(self.url, {
            'evento_id': 99999,
            'calendario_id': self.calendar.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_desasignar_calendario_inexistente(self):
        self.client.force_authenticate(self.user)

        response = self.client.delete(self.url, {
            'evento_id': self.event.pk,
            'calendario_id': 99999
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_desasignar_evento_no_asignado(self):
        self.client.force_authenticate(self.user)

        otro_calendario = Calendar.objects.create(
            name='Otro Calendar',
            creator=self.user,
            privacy='PRIVATE'
        )

        response = self.client.delete(self.url, {
            'evento_id': self.event.pk,
            'calendario_id': otro_calendario.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)


class AsignarPermisosTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="ownerperm",
            email="ownerperm@test.com",
            password="pass123",
        )
        self.other = User.objects.create_user(
            username="otherperm",
            email="otherperm@test.com",
            password="pass123",
        )
        self.calendar = Calendar.objects.create(
            name="Cal owner",
            creator=self.owner,
            privacy="PUBLIC",
        )
        self.event = Event.objects.create(
            title="Evento owner",
            date=date(2026, 9, 1),
            time=time(12, 0),
            creator=self.owner,
        )

    def test_asign_forbidden_when_not_calendar_owner(self):
        self.client.force_authenticate(self.other)

        response = self.client.post(
            "/api/v1/events/asign-to-calendar/",
            {"evento_id": self.event.id, "calendario_id": self.calendar.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_asign_forbidden_when_not_event_owner(self):
        self.client.force_authenticate(self.owner)
        other_event = Event.objects.create(
            title="Evento other",
            date=date(2026, 9, 2),
            time=time(13, 0),
            creator=self.other,
        )

        response = self.client.post(
            "/api/v1/events/asign-to-calendar/",
            {"evento_id": other_event.id, "calendario_id": self.calendar.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class DeasignarPermisosTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="ownerperm2",
            email="ownerperm2@test.com",
            password="pass123",
        )
        self.other = User.objects.create_user(
            username="otherperm2",
            email="otherperm2@test.com",
            password="pass123",
        )
        self.calendar = Calendar.objects.create(
            name="Cal owner2",
            creator=self.owner,
            privacy="PUBLIC",
        )
        self.event = Event.objects.create(
            title="Evento owner2",
            date=date(2026, 9, 3),
            time=time(14, 0),
            creator=self.owner,
        )
        self.event.calendars.add(self.calendar)

    def test_deasign_forbidden_when_not_calendar_owner(self):
        self.client.force_authenticate(self.other)

        response = self.client.delete(
            "/api/v1/events/deasign-from-calendar/",
            {"evento_id": self.event.id, "calendario_id": self.calendar.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_deasign_forbidden_when_not_event_owner(self):
        self.client.force_authenticate(self.owner)
        other_event = Event.objects.create(
            title="Evento other2",
            date=date(2026, 9, 4),
            time=time(15, 0),
            creator=self.other,
        )
        other_event.calendars.add(self.calendar)

        response = self.client.delete(
            "/api/v1/events/deasign-from-calendar/",
            {"evento_id": other_event.id, "calendario_id": self.calendar.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        

class CrearEventoTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="user1",
            email="user1@example.com",
            password="testpass123",
        )
        self.user2 = User.objects.create_user(
            username="user2",
            email="user2@example.com",
            password="testpass123",
        )
        self.user3 = User.objects.create_user(
            username="user3",
            email="user3@example.com",
            password="testpass123",
        )
        self.user3.following.add(self.user2)
        self.user3.save()

        self.user2.following.add(self.user3)
        self.user2.save()

        self.calendar = Calendar.objects.create(
            creator=self.user,
            name="Calendar Test",
            privacy="PRIVATE",
        )
        self.calendar2 = Calendar.objects.create(
            creator=self.user2,
            name="Public Calendar Test",
            privacy="PUBLIC",
        )
        self.calendar3 = Calendar.objects.create(
            creator=self.user3,
            name="Restricted Calendar Test",
            privacy="PRIVATE",
        )
        self.calendar3.subscribers.add(self.user2)
        self.calendar3.save()

    def test_crear_evento_exitoso(self):
        self.client.force_authenticate(self.user)

        payload = {
            "title": "Event Test",
            "date": "2026-03-01",
            "time": "18:00:00",
            "calendars": [self.calendar.id],
        }

        response = self.client.post(ENDPOINT_EVENTS_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Event.objects.filter(title="Event Test").exists()
        )

    def test_error_sin_title(self):
        self.client.force_authenticate(self.user)

        payload = {
            "date": "2026-03-01",
            "time": "18:00:00",
            "calendars": [self.calendar.id],
        }

        response = self.client.post(ENDPOINT_EVENTS_CREATE, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_error_sin_date(self):
        self.client.force_authenticate(self.user)

        payload = {
            "title": "Event",
            "time": "18:00:00",
            "calendars": [self.calendar.id],
        }

        response = self.client.post(ENDPOINT_EVENTS_CREATE, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_error_sin_calendario(self):
        self.client.force_authenticate(self.user)

        payload = {
            "title": "Event",
            "date": "2026-03-01",
            "time": "18:00:00",
        }

        response = self.client.post(ENDPOINT_EVENTS_CREATE, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_private_calendar_of_other_user(self):
        self.client.force_authenticate(self.user2)

        payload = {
            "title": "Event",
            "date": "2026-03-01",
            "time": "18:00:00",
            "calendars": [self.calendar.pk],
        }

        response = self.client.post(ENDPOINT_EVENTS_CREATE, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_public_calendar_of_other_user(self):
        self.client.force_authenticate(self.user)

        payload = {
            "title": "Event",
            "date": "2026-03-01",
            "time": "18:00:00",
            "calendars": [self.calendar2.pk],
        }

        response = self.client.post(ENDPOINT_EVENTS_CREATE, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_private_calendar_with_subscription_is_forbidden(self):
        self.client.force_authenticate(self.user2)

        payload = {
            "title": "Event",
            "date": "2026-03-01",
            "time": "18:00:00",
            "calendars": [self.calendar3.pk],
        }

        response = self.client.post(ENDPOINT_EVENTS_CREATE, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_private_calendar_without_mutual_follow_is_forbidden(self):
        self.user3.following.remove(self.user2)
        self.user3.save()

        self.client.force_authenticate(self.user2)

        payload = {
            "title": "Event",
            "date": "2026-03-01",
            "time": "18:00:00",
            "calendars": [self.calendar3.pk],
        }

        response = self.client.post(ENDPOINT_EVENTS_CREATE, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_private_calendar_without_subscription_is_forbidden(self):
        self.calendar3.subscribers.remove(self.user2)
        self.calendar3.save()

        self.client.force_authenticate(self.user2)

        payload = {
            "title": "Event",
            "date": "2026-03-01",
            "time": "18:00:00",
            "calendars": [self.calendar3.pk],
        }

        response = self.client.post(ENDPOINT_EVENTS_CREATE, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_error_calendario_no_existe(self):
        self.client.force_authenticate(self.user)

        payload = {
            "title": "Event",
            "date": "2026-03-01",
            "time": "18:00:00",
            "calendars": [9999],
        }

        response = self.client.post(ENDPOINT_EVENTS_CREATE, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_no_permitido(self):
        self.client.force_authenticate(self.user)

        response = self.client.get(ENDPOINT_EVENTS_CREATE)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class EditEventTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="user1",
            email="user1@example.com",
            password="testpass123",
        )
        self.user2 = User.objects.create_user(
            username="user2",
            email="user2@example.com",
            password="testpass123",
        )
        self.user3 = User.objects.create_user(
            username="user3",
            email="user3@example.com",
            password="testpass123",
        )
        self.user3.following.add(self.user2)
        self.user3.save()

        self.user2.following.add(self.user3)
        self.user2.save()

        self.calendar1 = Calendar.objects.create(
            creator=self.user,
            name="Calendar 1",
            privacy="PUBLIC",
        )

        self.calendar2 = Calendar.objects.create(
            creator=self.user,
            name="Calendar 2",
            privacy="PRIVATE",
        )
        self.calendar3 = Calendar.objects.create(
            creator=self.user2,
            name="Public Calendar Test",
            privacy="PUBLIC",
        )
        self.calendar4 = Calendar.objects.create(
            creator=self.user3,
            name="Restricted Calendar Test",
            privacy="PRIVATE",
        )
        self.calendar4.subscribers.add(self.user2)
        self.calendar4.save()

        self.event = Event.objects.create(
            title="Event Original",
            description="Descripcion original",
            place_name="Lugar original",
            date="2026-03-01",
            time="18:00:00",
            creator=self.user,
        )
        self.event.calendars.set([self.calendar1])
        self.event.save()
        self.event3 = Event.objects.create(
            title="Event 3 Original",
            description="Descripcion original",
            place_name="Lugar original",
            date="2026-03-01",
            time="18:00:00",
            creator=self.user2,
        )
        self.event3.calendars.set([self.calendar3])
        self.event3.save()
        self.event4 = Event.objects.create(
            title="Event 4 Original",
            description="Descripcion original",
            place_name="Lugar original",
            date="2026-03-01",
            time="18:00:00",
            creator=self.user3,
        )
        self.event4.calendars.set([self.calendar4])
        self.event4.save()


    def endpoint(self, event_id=None):
        return EDIT_EVENT_ENDPOINT.format(event_id or self.event.id)

    # ── Success cases ──

    def test_edit_title(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"title": "Titulo Nuevo"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(self.event.title, "Titulo Nuevo")

    def test_edit_multiple_fields(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {
                "title": "Nuevo title",
                "description": "Nueva description",
                "place_name": "Nuevo lugar",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(self.event.title, "Nuevo title")
        self.assertEqual(self.event.description, "Nueva description")
        self.assertEqual(self.event.place_name, "Nuevo lugar")

    def test_edit_date_and_time(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"date": "2026-06-15", "time": "20:30:00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(str(self.event.date), "2026-06-15")
        self.assertEqual(str(self.event.time), "20:30:00")

    def test_change_calendars(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"calendars": [self.calendar2.id]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cals = list(self.event.calendars.values_list("id", flat=True))
        self.assertEqual(cals, [self.calendar2.id])

    def test_edit_location(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"latitud": 37.3861, "longitud": -5.9926},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertIsNotNone(self.event.location)
        self.assertAlmostEqual(self.event.location.y, 37.3861, places=4)
        self.assertAlmostEqual(self.event.location.x, -5.9926, places=4)

    def test_edit_recurrence_and_external_id(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"recurrence": 7, "external_id": "ext-123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(self.event.recurrence, 7)
        self.assertEqual(self.event.external_id, "ext-123")

    def test_unsent_fields_remain_unchanged(self):
        self.client.force_authenticate(self.user)

        original_title = self.event.title
        original_description = self.event.description

        response = self.client.put(
            self.endpoint(),
            {"place_name": "Solo cambio lugar"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(self.event.title, original_title)
        self.assertEqual(self.event.description, original_description)
        self.assertEqual(self.event.place_name, "Solo cambio lugar")

    def test_response_contains_expected_keys(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"title": "Check keys"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected_keys = {
            "id", "title", "description", "place_name",
            "date", "time", "recurrence", "external_id",
            "calendars", "created_at", "photo"
        }
        self.assertEqual(set(response.data.keys()), expected_keys)

    # ── Error cases ──

    def test_edit_unauthenticated(self):
        response = self.client.put(
            self.endpoint(),
            {"title": "Titulo Nuevo"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_event_not_found(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(event_id=9999),
            {"title": "No existe"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_empty_title(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"title": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_empty_date(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"date": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_empty_time(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"time": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_nonexistent_calendar(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"calendars": [9999]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("errors", response.data)

    def test_empty_calendar_list(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"calendars": []},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_invalid_lat_lon(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"latitud": "abc", "longitud": "xyz"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_private_calendar_of_other_user(self):
        self.client.force_authenticate(self.user2)

        payload = {
            "title": "Event",
            "date": "2026-03-01",
            "time": "18:00:00",
            "calendars": [self.calendar2.pk],
        }

        response = self.client.put(self.endpoint(), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_public_calendar_of_other_user(self):
        self.client.force_authenticate(self.user2)

        payload = {
            "title": "Event",
            "date": "2026-03-01",
            "time": "18:00:00",
            "calendars": [self.calendar1.pk],
        }

        response = self.client.put(self.endpoint(), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_private_calendar_edit_is_forbidden(self):
        self.client.force_authenticate(self.user2)

        payload = {
            "title": "Event",
            "date": "2026-03-01",
            "time": "18:00:00",
            "calendars": [self.calendar4.pk],
        }

        response = self.client.put(self.endpoint(), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_private_calendar_without_subscription_is_forbidden(self):
        self.calendar4.subscribers.remove(self.user2)
        self.calendar4.save()

        self.client.force_authenticate(self.user2)

        payload = {
            "title": "Event",
            "date": "2026-03-01",
            "time": "18:00:00",
        }

        response = self.client.put(self.endpoint(self.event4.pk), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_event_data(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.endpoint())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.event.id)
        self.assertEqual(response.data["title"], self.event.title)
        self.assertEqual(response.data["description"], self.event.description)
        self.assertEqual(response.data["place_name"], self.event.place_name)
        self.assertEqual(str(response.data["date"]), str(self.event.date))
        self.assertEqual(str(response.data["time"]), str(self.event.time))
        self.assertIn(self.calendar1.id, response.data["calendars"])

    def test_get_event_data_unauthenticated_returns_401(self):
        response = self.client.get(self.endpoint())
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_event_data_forbidden_for_user_without_permissions(self):
        self.client.force_authenticate(self.user2)

        response = self.client.get(self.endpoint())

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("errors", response.data)

    def test_post_not_allowed(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            self.endpoint(),
            {"title": "No permitido"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)        


class EditEventExtraCoverageTests(APITestCase):
    def setUp(self):
        self._tmp_media = tempfile.mkdtemp()
        self._override = override_settings(MEDIA_ROOT=self._tmp_media)
        self._override.enable()
        self.addCleanup(lambda: (self._override.disable(), shutil.rmtree(self._tmp_media, ignore_errors=True)))
        self.user = User.objects.create_user(
            username="editcov",
            email="editcov@test.com",
            password="pass123",
        )
        self.calendar = Calendar.objects.create(
            creator=self.user,
            name="Calendar cov",
            privacy="PUBLIC",
        )
        self.event = Event.objects.create(
            title="Evento foto",
            date="2026-08-01",
            time="15:00:00",
            creator=self.user,
        )
        self.event.calendars.set([self.calendar])

    def test_edit_accepts_calendars_string(self):
        self.client.force_authenticate(self.user)
        calendars_str = json.dumps([self.calendar.id])

        response = self.client.put(
            f"/api/v1/events/{self.event.id}/edit/",
            {"calendars": calendars_str},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertIn(self.calendar.id, self.event.calendars.values_list("id", flat=True))

    def test_edit_remove_photo_flag(self):
        image = SimpleUploadedFile("foto2.jpg", b"filecontent", content_type="image/jpeg")
        self.event.photo.save("foto2.jpg", image, save=True)
        self.client.force_authenticate(self.user)

        response = self.client.put(
            f"/api/v1/events/{self.event.id}/edit/",
            {"remove_photo": "true"},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertFalse(bool(self.event.photo))

    def test_edit_replace_photo(self):
        first_image = SimpleUploadedFile("foto3.jpg", b"aaa", content_type="image/jpeg")
        self.event.photo.save("foto3.jpg", first_image, save=True)
        old_name = self.event.photo.name
        new_image = SimpleUploadedFile("foto4.jpg", b"bbb", content_type="image/jpeg")
        self.client.force_authenticate(self.user)

        response = self.client.put(
            f"/api/v1/events/{self.event.id}/edit/",
            {"photo": new_image},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertTrue(self.event.photo)
        self.assertNotEqual(self.event.photo.name, old_name)

    def test_edit_validation_error_returns_400(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            f"/api/v1/events/{self.event.id}/edit/",
            {"date": "not-a-date"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

# ── Test Constants ──
TEST_PASSWORD = 'testpass123'
TEST_USERNAME_1 = 'user_rsvp1'
TEST_USERNAME_2 = 'user_rsvp2'
TEST_EMAIL_1 = 'rsvp1@test.com'
TEST_EMAIL_2 = 'rsvp2@test.com'
EVENT_TITLE = 'RSVP Test Event'
EVENT_DATE = date(2026, 4, 15)
EVENT_TIME = time(18, 0)
RSVP_ENDPOINT_TEMPLATE = '/api/v1/events/{}/rsvp/'
EVENT_DETAIL_ENDPOINT_TEMPLATE = '/api/v1/events/{}/edit/'
NONEXISTENT_EVENT_ID = 999999


class RSVPEventTests(APITestCase):
    """Tests para endpoint RSVP de eventos."""

    def setUp(self):
        """Crear usuarios y evento para tests."""
        self.user1 = User.objects.create_user(
            username=TEST_USERNAME_1,
            email=TEST_EMAIL_1,
            password=TEST_PASSWORD
        )
        self.user2 = User.objects.create_user(
            username=TEST_USERNAME_2,
            email=TEST_EMAIL_2,
            password=TEST_PASSWORD
        )
        self.calendar = Calendar.objects.create(
            name="RSVP Test Calendar",
            privacy="PUBLIC",
            creator=self.user1,
        )
        self.event = Event.objects.create(
            title=EVENT_TITLE,
            date=EVENT_DATE,
            time=EVENT_TIME,
            creator=self.user1
        )
        self.event.calendars.add(self.calendar)

    @staticmethod
    def _validate_iso_datetime(datetime_str):
        """Validar que una cadena sea ISO 8601 válido.

        Args:
            datetime_str: String en formato ISO 8601.

        Raises:
            AssertionError: Si el formato no es ISO 8601 válido.
        """
        try:
            normalized = datetime_str.replace('Z', '+00:00')
            dt.fromisoformat(normalized)
        except ValueError as exc:
            raise AssertionError(f"Formato ISO 8601 inválido: {datetime_str}") from exc

    def test_rsvp_no_auth(self):
        """Test: RSVP sin autenticación retorna 401."""
        response = self.client.patch(
            RSVP_ENDPOINT_TEMPLATE.format(self.event.pk),
            {'status': 'ASSISTING'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_rsvp_event_not_found(self):
        """Test: RSVP a evento inexistente retorna 404."""
        self.client.force_authenticate(self.user1)
        response = self.client.patch(
            RSVP_ENDPOINT_TEMPLATE.format(NONEXISTENT_EVENT_ID),
            {'status': 'ASSISTING'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_rsvp_missing_status(self):
        """Test: RSVP sin status retorna 400."""
        self.client.force_authenticate(self.user1)
        response = self.client.patch(
            RSVP_ENDPOINT_TEMPLATE.format(self.event.pk),
            {},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rsvp_invalid_status(self):
        """Test: RSVP con status inválido retorna 400."""
        self.client.force_authenticate(self.user1)
        response = self.client.patch(
            RSVP_ENDPOINT_TEMPLATE.format(self.event.pk),
            {'status': 'INVALID'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rsvp_pending_rejected(self):
        """Test: RSVP con status PENDING retorna 400."""
        self.client.force_authenticate(self.user1)
        response = self.client.patch(
            RSVP_ENDPOINT_TEMPLATE.format(self.event.pk),
            {'status': 'PENDING'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rsvp_create_assisting(self):
        """Test: Crear RSVP ASSISTING retorna 200 con respondedAt ISO."""
        self.client.force_authenticate(self.user1)
        response = self.client.patch(
            RSVP_ENDPOINT_TEMPLATE.format(self.event.pk),
            {'status': 'ASSISTING'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'ASSISTING')
        self.assertIn('respondedAt', response.data)
        self._validate_iso_datetime(response.data['respondedAt'])

    def test_rsvp_create_not_assisting(self):
        """Test: Crear RSVP NOT_ASSISTING retorna 200."""
        self.client.force_authenticate(self.user1)
        response = self.client.patch(
            RSVP_ENDPOINT_TEMPLATE.format(self.event.pk),
            {'status': 'NOT_ASSISTING'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'NOT_ASSISTING')

    def test_rsvp_update_existing(self):
        """Test: Actualizar RSVP existente no duplica registros."""
        EventAttendance.objects.create(
            user=self.user1,
            event=self.event,
            status='NOT_ASSISTING'
        )
        self.client.force_authenticate(self.user1)
        response = self.client.patch(
            RSVP_ENDPOINT_TEMPLATE.format(self.event.pk),
            {'status': 'ASSISTING'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'ASSISTING')
        count = EventAttendance.objects.filter(
            user=self.user1,
            event=self.event
        ).count()
        self.assertEqual(count, 1)

    def test_event_detail_attendees_only_assisting(self):
        """Test: GET evento expone solo attendees con status ASSISTING."""
        EventAttendance.objects.create(
            user=self.user1,
            event=self.event,
            status='ASSISTING'
        )
        EventAttendance.objects.create(
            user=self.user2,
            event=self.event,
            status='NOT_ASSISTING'
        )
        self.client.force_authenticate(self.user1)
        response = self.client.get(
            EVENT_DETAIL_ENDPOINT_TEMPLATE.format(self.event.pk)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['attendees']), 1)
        self.assertEqual(response.data['attendees'][0]['name'], TEST_USERNAME_1)

    def test_attendee_responded_at_iso(self):
        """Test: respondedAt en attendees siempre es ISO 8601."""
        EventAttendance.objects.create(
            user=self.user1,
            event=self.event,
            status='ASSISTING'
        )
        self.client.force_authenticate(self.user1)
        response = self.client.get(
            EVENT_DETAIL_ENDPOINT_TEMPLATE.format(self.event.pk)
        )
        self.assertIn('attendees', response.data)
        self.assertGreater(len(response.data['attendees']), 0)
        responded_at = response.data['attendees'][0]['respondedAt']
        self._validate_iso_datetime(responded_at)

class CreateEventDuplicateTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="eventuser",
            email="event@test.com",
            password="pass123"
        )

        self.calendar = Calendar.objects.create(
            name="Mi calendario",
            privacy="PUBLIC",
            creator=self.user
        )

        self.client.force_authenticate(self.user)

        self.payload = {
            "title": "Evento test",
            "date": "2025-01-01",
            "time": "10:00:00",
            "calendars": [self.calendar.id]
        }

    def test_no_permite_eventos_duplicados_misma_fecha_y_hora(self):

        response1 = self.client.post("/api/v1/events/create/", self.payload, format="json")
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        response2 = self.client.post("/api/v1/events/create/", self.payload, format="json")

        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Ya tienes un evento creado para esa fecha y hora.", response2.json()["errors"])


class InviteEventTests(APITestCase):
    def setUp(self) -> None:
        self.user1 = User.objects.create_user(
            username="user1", email="user1@example.com", password="user1"
        )
        self.user2 = User.objects.create_user(
            username="user2", email="user2@example.com", password="user2"
        )

        self.event1 = Event.objects.create(
            title="Birthday Dinner",
            description="See you at the usual restaurant.",
            date=date(2026, 3, 20),
            time=time(21, 00),
            creator=self.user1,
        )


    def test_invite_unauthenticated(self):
        request = self.client.post(f"/api/v1/events/{self.event1.pk}/invite/")

        self.assertEqual(request.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invite(self):
        self.client.force_authenticate(self.user1)

        request = self.client.post(f"/api/v1/events/{self.event1.pk}/invite/", {
            "user": self.user2.pk,
        })

        self.assertEqual(request.status_code, status.HTTP_204_NO_CONTENT)
        self.assertTrue(Notification.objects.filter(recipient=self.user2, type="EVENT_INVITE", related_event=self.event1, sender=self.user1).exists())

    def test_invite_yourself(self):
        self.client.force_authenticate(self.user1)

        request = self.client.post(f"/api/v1/events/{self.event1.pk}/invite/", {
            "user": self.user1.pk,
        })

        self.assertEqual(request.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Notification.objects.filter(recipient=self.user1, type="EVENT_INVITE", related_event=self.event1, sender=self.user1).exists())

    def test_invite_not_creator(self):
        self.client.force_authenticate(self.user2)

        request = self.client.post(f"/api/v1/events/{self.event1.pk}/invite/", {
            "user": self.user1.pk,
        })

        self.assertEqual(request.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Notification.objects.filter(recipient=self.user1, type="EVENT_INVITE", related_event=self.event1, sender=self.user1).exists())

    def test_duplicate_invite(self):
        self.client.force_authenticate(self.user1)

        request = self.client.post(f"/api/v1/events/{self.event1.pk}/invite/", {
            "user": self.user2.pk,
        })
        self.assertEqual(request.status_code, status.HTTP_204_NO_CONTENT)
        request = self.client.post(f"/api/v1/events/{self.event1.pk}/invite/", {
            "user": self.user2.pk,
        })
        self.assertEqual(request.status_code, status.HTTP_204_NO_CONTENT)

        self.assertEqual(1, Notification.objects.filter(recipient=self.user2, type="EVENT_INVITE", related_event=self.event1, sender=self.user1).count())

    
class ListEventsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="listuser",
            email="list@test.com",
            password="pass123",
        )
        self.calendar_a = Calendar.objects.create(
            name="Cal A",
            privacy="PUBLIC",
            creator=self.user,
        )
        self.calendar_b = Calendar.objects.create(
            name="Cal B",
            privacy="PUBLIC",
            creator=self.user,
        )
        self.event_a = Event.objects.create(
            title="Brunch con amigos",
            description="comida rica",
            date=date(2026, 5, 1),
            time=time(11, 30),
            creator=self.user,
        )
        self.event_a.calendars.add(self.calendar_a)

        self.event_b = Event.objects.create(
            title="Reunión de trabajo",
            description="tema importante",
            date=date(2026, 5, 2),
            time=time(9, 0),
            creator=self.user,
        )
        self.event_b.calendars.add(self.calendar_b)

    def test_list_events_filters_by_query(self):
        response = self.client.get("/api/v1/events/list", {"q": "brunch"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], self.event_a.id)

    def test_list_events_filters_by_calendar(self):
        response = self.client.get("/api/v1/events/list", {"calendarIds": [self.calendar_b.id]})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.event_b.id)


class ListEventsFromCalendarFunctionTests(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(
            username="functionlist",
            email="function@test.com",
            password="pass123",
        )
        self.calendar_a = Calendar.objects.create(
            name="Cal Func A",
            privacy="PUBLIC",
            creator=self.user,
        )
        self.calendar_b = Calendar.objects.create(
            name="Cal Func B",
            privacy="PUBLIC",
            creator=self.user,
        )
        self.event_a = Event.objects.create(
            title="Func Event A",
            description="desc a",
            date=date(2026, 5, 10),
            time=time(10, 0),
            creator=self.user,
        )
        self.event_a.calendars.add(self.calendar_a)
        self.event_b = Event.objects.create(
            title="Func Event B",
            description="desc b",
            date=date(2026, 5, 11),
            time=time(11, 0),
            creator=self.user,
        )
        self.event_b.calendars.add(self.calendar_b)

    def _call_view(self, params=None):
        request = self.factory.get("/api/v1/events/list/", params or {})
        return list_events_from_calendar(request)

    def test_list_events_from_calendar_returns_all_when_no_filter(self):
        response = self._call_view()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {item["id"] for item in response.data}
        self.assertSetEqual(ids, {self.event_a.id, self.event_b.id})

    def test_list_events_from_calendar_filters_by_calendar_id(self):
        response = self._call_view({"calendarId": self.calendar_a.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.event_a.id)


class CreateEventParsingTests(APITestCase):
    def setUp(self):
        self._tmp_media = tempfile.mkdtemp()
        self._override = override_settings(MEDIA_ROOT=self._tmp_media)
        self._override.enable()
        self.addCleanup(lambda: (self._override.disable(), shutil.rmtree(self._tmp_media, ignore_errors=True)))
        self.user = User.objects.create_user(
            username="parser",
            email="parser@test.com",
            password="pass123",
        )
        self.calendar = Calendar.objects.create(
            name="Parser Cal",
            privacy="PUBLIC",
            creator=self.user,
        )
        self.client.force_authenticate(self.user)

    def test_accepts_calendars_as_json_string(self):
        payload = {
            "title": "Evento con string",
            "date": "2026-07-01",
            "time": "08:00:00",
            "calendars": json.dumps([self.calendar.id]),
        }

        response = self.client.post(ENDPOINT_EVENTS_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Event.objects.filter(title="Evento con string").exists())

    def test_accepts_calendars_as_plain_string_number(self):
        payload = {
            "title": "Evento string numero",
            "date": "2026-07-01",
            "time": "08:30:00",
            "calendars": str(self.calendar.id),
        }

        response = self.client.post(ENDPOINT_EVENTS_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_requires_time_field(self):
        payload = {
            "title": "Sin hora",
            "date": "2026-07-04",
            "calendars": [self.calendar.id],
        }

        response = self.client.post(ENDPOINT_EVENTS_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_returns_validation_errors(self):
        payload = {
            "title": "Fecha invalida",
            "date": "2026-07-06",
            "time": "10:00:00",
            "calendars": [self.calendar.id],
            "recurrence": "abc",  # debe ser int
        }

        response = self.client.post(ENDPOINT_EVENTS_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_saves_photo_when_present(self):
        image = SimpleUploadedFile("foto.jpg", b"filecontent", content_type="image/jpeg")
        payload = {
            "title": "Con foto",
            "date": "2026-07-05",
            "time": "12:00:00",
            "calendars": [self.calendar.id],
            "photo": image,
        }

        response = self.client.post(ENDPOINT_EVENTS_CREATE, payload, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        event = Event.objects.get(title="Con foto")
        self.assertTrue(event.photo)

    def test_rejects_invalid_coordinates(self):
        payload = {
            "title": "Evento con coords malas",
            "date": "2026-07-02",
            "time": "09:00:00",
            "calendars": [self.calendar.id],
            "latitud": "abc",
            "longitud": "xyz",
        }

        response = self.client.post(ENDPOINT_EVENTS_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_saves_location_when_coordinates_are_valid(self):
        payload = {
            "title": "Evento con ubicacion",
            "date": "2026-07-03",
            "time": "10:00:00",
            "calendars": [self.calendar.id],
            "latitud": 40.4168,
            "longitud": -3.7038,
        }

        response = self.client.post(ENDPOINT_EVENTS_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        event = Event.objects.get(title="Evento con ubicacion")
        self.assertIsNotNone(event.location)
        self.assertAlmostEqual(event.location.y, 40.4168, places=4)
        self.assertAlmostEqual(event.location.x, -3.7038, places=4)


class ToggleLikeEventTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="like_owner", email="like_owner@test.com", password="pass123"
        )
        self.liker = User.objects.create_user(
            username="event_liker", email="event_liker@test.com", password="pass123"
        )
        self.stranger = User.objects.create_user(
            username="event_stranger", email="event_stranger@test.com", password="pass123"
        )
        self.public_calendar = Calendar.objects.create(
            name="Like Public Cal", privacy="PUBLIC", creator=self.owner
        )
        self.private_calendar = Calendar.objects.create(
            name="Like Private Cal", privacy="PRIVATE", creator=self.owner
        )
        self.public_event = Event.objects.create(
            title="Likeable Event",
            date=date(2026, 8, 1),
            time=time(12, 0),
            creator=self.owner,
        )
        self.public_event.calendars.add(self.public_calendar)

        self.private_event = Event.objects.create(
            title="Private Likeable Event",
            date=date(2026, 8, 2),
            time=time(13, 0),
            creator=self.owner,
        )
        self.private_event.calendars.add(self.private_calendar)

    def test_like_and_unlike_cycle(self):
        self.client.force_authenticate(self.liker)
        response = self.client.post(f"/api/v1/events/{self.public_event.pk}/like/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["liked"])
        self.assertEqual(response.data["likes_count"], 1)

        response = self.client.post(f"/api/v1/events/{self.public_event.pk}/like/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["liked"])
        self.assertEqual(response.data["likes_count"], 0)

    def test_like_private_event_forbidden(self):
        self.client.force_authenticate(self.stranger)
        response = self.client.post(f"/api/v1/events/{self.private_event.pk}/like/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_like_unauthenticated(self):
        response = self.client.post(f"/api/v1/events/{self.public_event.pk}/like/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_like_nonexistent_event(self):
        self.client.force_authenticate(self.liker)
        response = self.client.post("/api/v1/events/99999/like/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_like_own_event(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(f"/api/v1/events/{self.public_event.pk}/like/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["liked"])


class ToggleSaveEventTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="save_user", email="save_user@test.com", password="pass123"
        )
        self.calendar = Calendar.objects.create(
            name="Save Cal", privacy="PUBLIC", creator=self.user
        )
        self.event = Event.objects.create(
            title="Saveable Event",
            date=date(2026, 8, 5),
            time=time(14, 0),
            creator=self.user,
        )
        self.event.calendars.add(self.calendar)

    def test_save_and_unsave_cycle(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(f"/api/v1/events/{self.event.pk}/save/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["saved"])
        self.assertTrue(response.data["saved_by_me"])

        response = self.client.post(f"/api/v1/events/{self.event.pk}/save/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["saved"])

    def test_save_unauthenticated(self):
        response = self.client.post(f"/api/v1/events/{self.event.pk}/save/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_save_nonexistent_event(self):
        self.client.force_authenticate(self.user)
        response = self.client.post("/api/v1/events/99999/save/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class RecommendedEventsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="rec_ev_user", email="rec_ev@test.com", password="pass123"
        )
        self.calendar = Calendar.objects.create(
            name="Rec Cal", privacy="PUBLIC", creator=self.user
        )
        self.event = Event.objects.create(
            title="Rec Event",
            date=date(2026, 9, 1),
            time=time(10, 0),
            creator=self.user,
        )
        self.event.calendars.add(self.calendar)

    def test_recommended_events_unauthenticated(self):
        response = self.client.get("/api/v1/recommendations/events/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch("main.events.views.recommend_events")
    @patch("main.events.views.cache")
    def test_recommended_events_returns_list(self, mock_cache, mock_recommend):
        mock_cache.get.return_value = None
        mock_recommend.return_value = Event.objects.filter(pk=self.event.pk)
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/v1/recommendations/events/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
