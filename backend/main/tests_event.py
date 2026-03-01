from rest_framework import status
from rest_framework.test import APITestCase
from datetime import date, time

from .models import Usuario, Evento


class EventTests(APITestCase):
    def setUp(self) -> None:
        super().setUp()

        self.user1 = Usuario.objects.create_user(
            username="user1", email="user1@example.com", password="user1"
        )
        self.user2 = Usuario.objects.create_user(
            username="user2", email="user2@example.com", password="user2"
        )

        self.event1 = Evento.objects.create(
            titulo="Cena cumpleaños",
            descripcion="Nos vemos en el restaurante de siempre.",
            fecha=date(2026, 3, 20),
            hora=time(21, 00),
            creador=self.user1,
        )

    def test_delete_unauthenticated(self):
        self.assertEqual(Evento.objects.count(), 1)

        request = self.client.delete(f"/api/v1/events/{self.event1.pk}/")

        self.assertEqual(request.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Evento.objects.count(), 1)

    def test_delete_event(self):
        self.assertEqual(Evento.objects.count(), 1)

        self.client.force_authenticate(self.user1)

        request = self.client.delete(f"/api/v1/events/{self.event1.pk}/")

        self.assertEqual(request.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Evento.objects.count(), 0)

    def test_delete_event_not_creator(self):
        self.assertEqual(Evento.objects.count(), 1)

        self.client.force_authenticate(self.user2)

        request = self.client.delete(f"/api/v1/events/{self.event1.pk}/")

        self.assertEqual(request.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Evento.objects.count(), 1)

    def test_delete_not_found_event(self):
        self.assertEqual(Evento.objects.count(), 1)

        self.client.force_authenticate(self.user1)

        request = self.client.delete("/api/v1/events/999999999999/")

        self.assertEqual(request.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Evento.objects.count(), 1)
