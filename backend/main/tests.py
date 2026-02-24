from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
Usuario = get_user_model()
class BorrarUsuarioTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.user = Usuario.objects.create_user(
            email="user@example.com", password="password123", username="user1"
        )
        self.url=reverse("usuario-propio-view")
    def test_borrar(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(
            self.url,
        )
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertRaises(Usuario.DoesNotExist,self.user.refresh_from_db)
    def test_borrar_no_autenticado(self):
        response = self.client.delete(
            self.url,
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
class BorrarUsuarioTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.user = Usuario.objects.create_user(
            email="user@example.com", password="password123", username="user1"
        )
        self.url=reverse("usuario-propio-view")
    def test_borrar(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(
            self.url,
        )
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertRaises(Usuario.DoesNotExist,self.user.refresh_from_db)
    def test_borrar_no_autenticado(self):
        response = self.client.delete(
            self.url,
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)