import datetime
from datetime import date, time, datetime as dt
from rest_framework.test import APITestCase
from rest_framework import status
from main.models import User, Calendar, Event, EventAttendance

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
            name="Friends Calendar Test",
            privacy="FRIENDS",
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

    def test_friends_calendar(self):
        self.client.force_authenticate(self.user2)

        payload = {
            "title": "Event",
            "date": "2026-03-01",
            "time": "18:00:00",
            "calendars": [self.calendar3.pk],
        }

        response = self.client.post(ENDPOINT_EVENTS_CREATE, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_friends_calendar_not_friends(self):
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

    def test_friends_calendar_not_following_calendar(self):
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
            name="Friends Calendar Test",
            privacy="FRIENDS",
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
            "calendars", "created_at",
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

    def test_friends_calendar(self):
        self.client.force_authenticate(self.user2)

        payload = {
            "title": "Event",
            "date": "2026-03-01",
            "time": "18:00:00",
            "calendars": [self.calendar3.pk],
        }

        response = self.client.put(self.endpoint(), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_friends_calendar_not_friends(self):
        self.user2.following.remove(self.user3)
        self.user2.save()

        self.client.force_authenticate(self.user3)

        payload = {
            "title": "Event",
            "date": "2026-03-01",
            "time": "18:00:00",
        }

        response = self.client.put(self.endpoint(self.event4.pk), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_friends_calendar_not_following_calendar(self):
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
        self.event = Event.objects.create(
            title=EVENT_TITLE,
            date=EVENT_DATE,
            time=EVENT_TIME,
            creator=self.user1
        )

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
        response = self.client.get(
            EVENT_DETAIL_ENDPOINT_TEMPLATE.format(self.event.pk)
        )
        self.assertIn('attendees', response.data)
        self.assertGreater(len(response.data['attendees']), 0)
        responded_at = response.data['attendees'][0]['respondedAt']
        self._validate_iso_datetime(responded_at)