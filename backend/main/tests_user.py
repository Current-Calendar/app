from django.test import TestCase

from rest_framework import status
from rest_framework.test import APITestCase

from .models import Usuario


class UsuarioTests(APITestCase):
    def setUp(self) -> None:
        super().setUp()

        self.user1 = Usuario.objects.create_user(
            username="user1", email="user1@example.com", password="user1"
        )
        self.user2 = Usuario.objects.create_user(
            username="user2", email="user2@example.com", password="user2"
        )

    def test_follow_user(self):
        self.client.force_authenticate(self.user1)

        request = self.client.post(f"/api/v1/users/{self.user2.pk}/follow/")

        self.assertEqual(request.status_code, status.HTTP_200_OK)

        seguidos = list(self.user1.seguidos.all())
        self.assertEqual(len(seguidos), 1)
        self.assertEqual(seguidos[0], self.user2)

    def test_unfollow_user(self):
        self.user2.seguidos.add(self.user1)
        self.user2.save()

        self.assertEqual(self.user2.seguidos.count(), 1)

        self.client.force_authenticate(self.user2)

        request = self.client.post(f"/api/v1/users/{self.user1.pk}/follow/")

        self.assertEqual(request.status_code, status.HTTP_200_OK)

        seguidos = list(self.user2.seguidos.all())
        self.assertEqual(len(seguidos), 0)
