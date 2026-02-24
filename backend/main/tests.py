from django.test import TestCase

# Create your tests here.
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
Usuario = get_user_model()

class EditarUsuarioTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Usuario normal
        self.user = Usuario.objects.create_user(
            email="user@example.com", password="password123", username="user1"
        )
        self.url=reverse("usuario-propio-view")
    def test_usuario_actualiza_su_perfil(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.put(
            self.url,
            {"username": "nuevo_nombre"},
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "nuevo_nombre")
    def test_usuario_no_autenticado_no_puede_editar(self):
        response = self.client.put(
            self.url,
            {"email": self.user.email, "username": "hackeado"},
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.user.refresh_from_db()
        self.assertNotEqual(self.user.username, "hackeado")