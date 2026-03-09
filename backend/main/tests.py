import json

from django.contrib.auth.hashers import identify_hasher, check_password
from django.test import TestCase
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password
import datetime
from main.models import Usuario, Calendario, Evento
from django.urls import reverse
from main.models import Usuario, Calendario, Evento
from django.utils import timezone
from django.contrib.gis.geos import Point
from datetime import timedelta, date, time

ENDPOINT_EVENTOS = "/api/v1/eventos"

from .models import Evento, Calendario


class CrearEventoTests(APITestCase):

    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            username="eventuser",
            email="event@example.com",
            password="testpass123",
        )

        self.calendario = Calendario.objects.create(
            creador=self.usuario,
            nombre="Calendario Test",
            estado="PRIVADO",
        )

    def test_crear_evento_exitoso(self):
        self.client.force_authenticate(self.usuario)

        payload = {
            "titulo": "Evento Test",
            "fecha": "2026-03-01",
            "hora": "18:00:00",
            "calendarios": [self.calendario.id],
            "creador_id": self.usuario.id
        }

        response = self.client.post(ENDPOINT_EVENTOS, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Evento.objects.filter(titulo="Evento Test").exists()
        )

    def test_error_sin_titulo(self):
        self.client.force_authenticate(self.usuario)

        payload = {
            "fecha": "2026-03-01",
            "hora": "18:00:00",
            "calendarios": [self.calendario.id],
        }

        response = self.client.post(ENDPOINT_EVENTOS, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_error_sin_fecha(self):
        self.client.force_authenticate(self.usuario)

        payload = {
            "titulo": "Evento",
            "hora": "18:00:00",
            "calendarios": [self.calendario.id],
        }

        response = self.client.post(ENDPOINT_EVENTOS, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_error_sin_calendario(self):
        self.client.force_authenticate(self.usuario)

        payload = {
            "titulo": "Evento",
            "fecha": "2026-03-01",
            "hora": "18:00:00",
        }

        response = self.client.post(ENDPOINT_EVENTOS, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_error_calendario_no_existe(self):
        self.client.force_authenticate(self.usuario)

        payload = {
            "titulo": "Evento",
            "fecha": "2026-03-01",
            "hora": "18:00:00",
            "calendarios": [9999],
            "creador_id": self.usuario.id
        }

        response = self.client.post(ENDPOINT_EVENTOS, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_no_permitido(self):
        self.client.force_authenticate(self.usuario)

        response = self.client.get(ENDPOINT_EVENTOS)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

from rest_framework import status
from main.models import Usuario, Calendario, Evento
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient

EDIT_EVENT_ENDPOINT = "/api/v1/eventos/{}"


class EditEventTests(APITestCase):
    def setUp(self):
        self.user = Usuario.objects.create_user(
            username="eventuser",
            email="event@example.com",
            password="testpass123",
        )

        self.calendar1 = Calendario.objects.create(
            creador=self.user,
            nombre="Calendario 1",
            estado="PUBLICO",
        )

        self.calendar2 = Calendario.objects.create(
            creador=self.user,
            nombre="Calendario 2",
            estado="PUBLICO",
        )

        self.event = Evento.objects.create(
            titulo="Evento Original",
            descripcion="Descripcion original",
            nombre_lugar="Lugar original",
            fecha="2026-03-01",
            hora="18:00:00",
            creador=self.user,
        )
        self.event.calendarios.set([self.calendar1])

    def endpoint(self, event_id=None):
        return EDIT_EVENT_ENDPOINT.format(event_id or self.event.id)

    # ── Success cases ──

    def test_edit_title(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"titulo": "Titulo Nuevo"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(self.event.titulo, "Titulo Nuevo")

    def test_edit_multiple_fields(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {
                "titulo": "Nuevo titulo",
                "descripcion": "Nueva descripcion",
                "nombre_lugar": "Nuevo lugar",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(self.event.titulo, "Nuevo titulo")
        self.assertEqual(self.event.descripcion, "Nueva descripcion")
        self.assertEqual(self.event.nombre_lugar, "Nuevo lugar")

    def test_edit_date_and_time(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"fecha": "2026-06-15", "hora": "20:30:00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(str(self.event.fecha), "2026-06-15")
        self.assertEqual(str(self.event.hora), "20:30:00")

    def test_change_calendars(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"calendarios": [self.calendar2.id]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cals = list(self.event.calendarios.values_list("id", flat=True))
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
        self.assertIsNotNone(self.event.ubicacion)
        self.assertAlmostEqual(self.event.ubicacion.y, 37.3861, places=4)
        self.assertAlmostEqual(self.event.ubicacion.x, -5.9926, places=4)

    def test_edit_recurrence_and_external_id(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"recurrencia": 7, "id_externo": "ext-123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(self.event.recurrencia, 7)
        self.assertEqual(self.event.id_externo, "ext-123")

    def test_unsent_fields_remain_unchanged(self):
        self.client.force_authenticate(self.user)

        original_title = self.event.titulo
        original_description = self.event.descripcion

        response = self.client.put(
            self.endpoint(),
            {"nombre_lugar": "Solo cambio lugar"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(self.event.titulo, original_title)
        self.assertEqual(self.event.descripcion, original_description)
        self.assertEqual(self.event.nombre_lugar, "Solo cambio lugar")

    def test_response_contains_expected_keys(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"titulo": "Check keys"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected_keys = {
            "id", "titulo", "descripcion", "nombre_lugar",
            "fecha", "hora", "recurrencia", "id_externo",
            "calendarios", "fecha_creacion",
        }
        self.assertEqual(set(response.data.keys()), expected_keys)

    # ── Error cases ──

    def test_event_not_found(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(event_id=9999),
            {"titulo": "No existe"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_empty_title(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"titulo": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_empty_date(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"fecha": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_empty_time(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"hora": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_nonexistent_calendar(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"calendarios": [9999]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("errors", response.data)

    def test_empty_calendar_list(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(),
            {"calendarios": []},
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
        self.assertEqual(response.data["titulo"], self.event.titulo)
        self.assertEqual(response.data["descripcion"], self.event.descripcion)
        self.assertEqual(response.data["nombre_lugar"], self.event.nombre_lugar)
        self.assertEqual(str(response.data["fecha"]), str(self.event.fecha))
        self.assertEqual(str(response.data["hora"]), str(self.event.hora))
        self.assertIn(self.calendar1.id, response.data["calendarios"])

    def test_post_not_allowed(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            self.endpoint(),
            {"titulo": "No permitido"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


User = get_user_model()

class RadarEventsTest(APITestCase):

    def setUp(self):
        self.url = "/api/v1/radar/?lat=40.4168&lon=-3.7038&radio=10"

        self.user = User.objects.create_user(
            username="user1",
            email="user1@test.com",
            password="testpass"
        )

        self.friend = User.objects.create_user(
            username="friend",
            email="friend@test.com",
            password="testpass"
        )

        self.other = User.objects.create_user(
            username="other",
            email="other@test.com",
            password="testpass"
        )

        self.user.seguidos.add(self.friend)

        self.public_calendar = Calendario.objects.create(
            nombre="Public",
            estado="PUBLICO",
            creador=self.other
        )

        self.friends_calendar = Calendario.objects.create(
            nombre="Friends",
            estado="AMIGOS",
            creador=self.friend
        )

        self.private_calendar = Calendario.objects.create(
            nombre="Private",
            estado="PRIVADO",
            creador=self.other
        )

        location = Point(-3.7038, 40.4168)

        self.public_event = Evento.objects.create(
            titulo="Evento Público",
            fecha=date.today(),
            hora=time(12, 0),
            ubicacion=location,
            creador=self.other
        )
        self.public_event.calendarios.add(self.public_calendar)

        self.friends_event = Evento.objects.create(
            titulo="Evento Amigos",
            fecha=date.today(),
            hora=time(13, 0),
            ubicacion=location,
            creador=self.friend
        )
        self.friends_event.calendarios.add(self.friends_calendar)

        self.private_event = Evento.objects.create(
            titulo="Evento Privado",
            fecha=date.today(),
            hora=time(14, 0),
            ubicacion=location,
            creador=self.other
        )
        self.private_event.calendarios.add(self.private_calendar)

    def test_anonymous_only_sees_public(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        titles = [e["titulo"] for e in response.data]

        self.assertIn("Evento Público", titles)
        self.assertNotIn("Evento Amigos", titles)
        self.assertNotIn("Evento Privado", titles)

    def test_authenticated_sees_public_and_friends(self):
        self.client.login(username="user1", password="testpass")

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        titles = [e["titulo"] for e in response.data]

        self.assertIn("Evento Público", titles)
        self.assertIn("Evento Amigos", titles)
        self.assertNotIn("Evento Privado", titles)

    def test_non_friend_cannot_see_friends_event(self):
        self.client.login(username="other", password="testpass")

        response = self.client.get(self.url)

        titles = [e["titulo"] for e in response.data]

        self.assertIn("Evento Público", titles)
        self.assertNotIn("Evento Amigos", titles)

    def test_event_outside_radius_not_returned(self):
        far_location = Point(-0.1276, 51.5074)

        far_event = Evento.objects.create(
            titulo="Evento Lejano",
            fecha=date.today(),
            hora=time(15, 0),
            ubicacion=far_location,
            creador=self.other
        )
        far_event.calendarios.add(self.public_calendar)

        response = self.client.get(self.url)

        titles = [e["titulo"] for e in response.data]

        self.assertNotIn("Evento Lejano", titles)

    def test_invalid_lat_lon(self):
        response = self.client.get("/api/v1/radar/?lat=abc&lon=xyz")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)