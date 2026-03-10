import datetime
from datetime import date, time
from rest_framework.test import APITestCase
from rest_framework import status
from main.models import User, Calendar, Event

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


    def test_delete_unauthenticated(self):
        self.assertEqual(Event.objects.count(), 1)

        request = self.client.delete(f"/api/v1/events/{self.event1.pk}/delete/")

        self.assertEqual(request.status_code, status.HTTP_403_FORBIDDEN)
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

    def test_delete_not_found_event(self):
        self.assertEqual(Event.objects.count(), 1)

        self.client.force_authenticate(self.user1)

        request = self.client.delete("/api/v1/events/999999999999/")

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
            privacy='FRIENDS'
        )

        response = self.client.delete(self.url, {
            'evento_id': self.event.pk,
            'calendario_id': otro_calendario.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        

class CrearEventoTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="eventuser",
            email="event@example.com",
            password="testpass123",
        )

        self.calendar = Calendar.objects.create(
            creator=self.user,
            name="Calendar Test",
            privacy="PRIVATE",
        )

    def test_crear_evento_exitoso(self):
        self.client.force_authenticate(self.user)

        payload = {
            "title": "Event Test",
            "date": "2026-03-01",
            "time": "18:00:00",
            "calendars": [self.calendar.id],
            "creator_id": self.user.id
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

    def test_error_calendario_no_existe(self):
        self.client.force_authenticate(self.user)

        payload = {
            "title": "Event",
            "date": "2026-03-01",
            "time": "18:00:00",
            "calendars": [9999],
            "creator_id": self.user.id
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
            username="eventuser",
            email="event@example.com",
            password="testpass123",
        )

        self.calendar1 = Calendar.objects.create(
            creator=self.user,
            name="Calendar 1",
            privacy="PUBLIC",
        )

        self.calendar2 = Calendar.objects.create(
            creator=self.user,
            name="Calendar 2",
            privacy="PUBLIC",
        )

        self.event = Event.objects.create(
            title="Event Original",
            description="Descripcion original",
            place_name="Lugar original",
            date="2026-03-01",
            time="18:00:00",
            creator=self.user,
        )
        self.event.calendars.set([self.calendar1])

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
            "calendars", "created_at",
        }
        self.assertEqual(set(response.data.keys()), expected_keys)

    # ── Error cases ──

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

    def test_get_event_data(self):
        response = self.client.get(self.endpoint())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.event.id)
        self.assertEqual(response.data["title"], self.event.title)
        self.assertEqual(response.data["description"], self.event.description)
        self.assertEqual(response.data["place_name"], self.event.place_name)
        self.assertEqual(str(response.data["date"]), str(self.event.date))
        self.assertEqual(str(response.data["time"]), str(self.event.time))
        self.assertIn(self.calendar1.id, response.data["calendars"])

    def test_post_not_allowed(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            self.endpoint(),
            {"title": "No permitido"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)