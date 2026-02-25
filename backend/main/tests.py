from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from main.models import Usuario, Calendario, Evento

# Create your tests here.

EDIT_EVENT_ENDPOINT = "/api/v1/eventos/{}"


class EditEventTests(TestCase):

    def setUp(self):
        self.client = APIClient()

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
        )
        self.event.calendarios.set([self.calendar1])

    def endpoint(self, event_id=None):
        return EDIT_EVENT_ENDPOINT.format(event_id or self.event.id)

    # ── Success cases ──

    def test_edit_title(self):
        response = self.client.put(
            self.endpoint(),
            {"titulo": "Titulo Nuevo"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(self.event.titulo, "Titulo Nuevo")

    def test_edit_multiple_fields(self):
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
        response = self.client.put(
            self.endpoint(),
            {"calendarios": [self.calendar2.id]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cals = list(self.event.calendarios.values_list("id", flat=True))
        self.assertEqual(cals, [self.calendar2.id])

    def test_edit_location(self):
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
        response = self.client.put(
            self.endpoint(event_id=9999),
            {"titulo": "No existe"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_empty_title(self):
        response = self.client.put(
            self.endpoint(),
            {"titulo": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_empty_date(self):
        response = self.client.put(
            self.endpoint(),
            {"fecha": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_empty_time(self):
        response = self.client.put(
            self.endpoint(),
            {"hora": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_nonexistent_calendar(self):
        response = self.client.put(
            self.endpoint(),
            {"calendarios": [9999]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("errors", response.data)

    def test_empty_calendar_list(self):
        response = self.client.put(
            self.endpoint(),
            {"calendarios": []},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_invalid_lat_lon(self):
        response = self.client.put(
            self.endpoint(),
            {"latitud": "abc", "longitud": "xyz"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_get_not_allowed(self):
        response = self.client.get(self.endpoint())
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_post_not_allowed(self):
        response = self.client.post(
            self.endpoint(),
            {"titulo": "No permitido"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
