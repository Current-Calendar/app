from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from main.models import Usuario, Calendario

# Create your tests here.

PUBLISH_CALENDAR_ENDPOINT = "/api/v1/calendarios/{}/publicar"


class PublishCalendarTests(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.user = Usuario.objects.create_user(
            username="caluser",
            email="cal@example.com",
            password="testpass123",
        )

        self.private_calendar = Calendario.objects.create(
            creador=self.user,
            nombre="Calendario Privado",
            estado="PRIVADO",
        )

        self.friends_calendar = Calendario.objects.create(
            creador=self.user,
            nombre="Calendario Amigos",
            estado="AMIGOS",
        )

        self.public_calendar = Calendario.objects.create(
            creador=self.user,
            nombre="Calendario Publico",
            estado="PUBLICO",
        )

    def endpoint(self, calendario_id=None):
        return PUBLISH_CALENDAR_ENDPOINT.format(
            calendario_id or self.private_calendar.id
        )

    # ── Success cases ──

    def test_publish_private_calendar(self):
        response = self.client.put(self.endpoint())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.private_calendar.refresh_from_db()
        self.assertEqual(self.private_calendar.estado, "PUBLICO")

    def test_publish_friends_calendar(self):
        response = self.client.put(
            self.endpoint(self.friends_calendar.id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.friends_calendar.refresh_from_db()
        self.assertEqual(self.friends_calendar.estado, "PUBLICO")

    def test_response_contains_expected_keys(self):
        response = self.client.put(self.endpoint())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected_keys = {
            "id", "nombre", "descripcion", "estado",
            "origen", "creador", "fecha_creacion",
        }
        self.assertEqual(set(response.data.keys()), expected_keys)

    def test_response_estado_is_publico(self):
        response = self.client.put(self.endpoint())
        self.assertEqual(response.data["estado"], "PUBLICO")

    # ── Error cases ──

    def test_calendar_not_found(self):
        response = self.client.put(self.endpoint(calendario_id=9999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_already_public(self):
        response = self.client.put(
            self.endpoint(self.public_calendar.id)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_get_not_allowed(self):
        response = self.client.get(self.endpoint())
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_post_not_allowed(self):
        response = self.client.post(self.endpoint())
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
