from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from main.models import Usuario
# Create your tests here.
ENDPOINT_BUSCAR_USUARIOS = "/api/v1/usuarios"


class BuscarUsuariosTests(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.user1 = Usuario.objects.create_user(
            username="lucia",
            email="lucia@example.com",
            password="123",
            pronombres="ella",
        )

        self.user2 = Usuario.objects.create_user(
            username="antonio",
            email="antonio@example.com",
            password="123",
            pronombres="él",
        )

    def test_busqueda_por_username(self):
        response = self.client.get(f"{ENDPOINT_BUSCAR_USUARIOS}?search=luc")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["username"], "lucia")

    def test_busqueda_por_pronombres(self):
        response = self.client.get(f"{ENDPOINT_BUSCAR_USUARIOS}?search=ella")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)

    def test_busqueda_sin_parametro(self):
        response = self.client.get(ENDPOINT_BUSCAR_USUARIOS)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_busqueda_sin_resultados(self):
        response = self.client.get(f"{ENDPOINT_BUSCAR_USUARIOS}?search=zzz")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 0)