from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from main.models import Usuario, Calendario, Evento
# Create your tests here.
ENDPOINT_EVENTOS = "/api/v1/eventos"


class CrearEventoTests(TestCase):

    def setUp(self):
        self.client = APIClient()

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
        payload = {
            "titulo": "Evento Test",
            "fecha": "2026-03-01",
            "hora": "18:00:00",
            "calendarios": [self.calendario.id],
        }

        response = self.client.post(ENDPOINT_EVENTOS, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Evento.objects.filter(titulo="Evento Test").exists()
        )

    def test_error_sin_titulo(self):
        payload = {
            "fecha": "2026-03-01",
            "hora": "18:00:00",
            "calendarios": [self.calendario.id],
        }

        response = self.client.post(ENDPOINT_EVENTOS, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_error_sin_fecha(self):
        payload = {
            "titulo": "Evento",
            "hora": "18:00:00",
            "calendarios": [self.calendario.id],
        }

        response = self.client.post(ENDPOINT_EVENTOS, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_error_sin_calendario(self):
        payload = {
            "titulo": "Evento",
            "fecha": "2026-03-01",
            "hora": "18:00:00",
        }

        response = self.client.post(ENDPOINT_EVENTOS, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_error_calendario_no_existe(self):
        payload = {
            "titulo": "Evento",
            "fecha": "2026-03-01",
            "hora": "18:00:00",
            "calendarios": [9999],
        }

        response = self.client.post(ENDPOINT_EVENTOS, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_no_permitido(self):
        response = self.client.get(ENDPOINT_EVENTOS)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)