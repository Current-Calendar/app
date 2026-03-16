import json

from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from main.models import User
from django.urls import reverse
from django.test import TestCase
from django.contrib.auth.hashers import check_password, identify_hasher


ENDPOINT_BUSCAR_USUARIOS = "/api/v1/users/search/"


class UsuarioTests(APITestCase):
    def setUp(self) -> None:
        super().setUp()

        self.user1 = User.objects.create_user(
            username="user1", email="user1@example.com", password="user1"
        )
        self.user2 = User.objects.create_user(
            username="user2", email="user2@example.com", password="user2"
        )

    def test_follow_user(self):
        self.client.force_authenticate(self.user1)

        request = self.client.post(f"/api/v1/users/{self.user2.pk}/follow/")

        self.assertEqual(request.status_code, status.HTTP_200_OK)

        following = list(self.user1.following.all())
        self.assertEqual(len(following), 1)
        self.assertEqual(following[0], self.user2)

    def test_unfollow_user(self):
        self.user2.following.add(self.user1)
        self.user2.save()

        self.assertEqual(self.user2.following.count(), 1)

        self.client.force_authenticate(self.user2)

        request = self.client.post(f"/api/v1/users/{self.user1.pk}/follow/")

        self.assertEqual(request.status_code, status.HTTP_200_OK)

        following = list(self.user2.following.all())
        self.assertEqual(len(following), 0)
        

class BorrarUsuarioTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="user@example.com", password="password123", username="user1"
        )
        self.url=reverse("delete_own_user")
    def test_borrar(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(
            self.url,
        )
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertRaises(User.DoesNotExist,self.user.refresh_from_db)
    def test_borrar_no_autenticado(self):
        response = self.client.delete(
            self.url,
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        

class BuscarUsuariosTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(
            username="lucia",
            email="lucia@example.com",
            password="123",
            pronouns="ella",
        )

        self.user2 = User.objects.create_user(
            username="antonio",
            email="antonio@example.com",
            password="123",
            pronouns="él",
        )

    def test_busqueda_por_username(self):
        response = self.client.get(f"{ENDPOINT_BUSCAR_USUARIOS}?search=luc")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["username"], "lucia")

    def test_busqueda_por_pronouns(self):
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


class UsuarioModelTests(TestCase):
    """Tests para el modelo User."""
    
    def test_crear_user_con_create_user(self):
        """Test: Crear user con el método create_user hashea la contraseña."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPassword123!'
        )
        
        self.assertTrue(user.password.startswith('argon2'))
        self.assertTrue(check_password('TestPassword123!', user.password))

    def test_email_es_unico(self):
        """Test: El email debe ser único en la base de datos."""
        User.objects.create_user(
            username='user1',
            email='test@example.com',
            password='Password123!'
        )
        
        with self.assertRaises(Exception):
            User.objects.create_user(
                username='user2',
                email='test@example.com',
                password='Password123!'
            )


class LoginMutationTests(TestCase):
    def setUp(self):
        self.username = "qa_login_user"
        self.password = "StrongPass123!"
        self.user = User.objects.create_user(
            username=self.username,
            email="qa_login_user@example.com",
            password=self.password,
        )

        # Verifica que create_user guardo la contrasena con Argon2.
        hasher = identify_hasher(self.user.password)
        self.assertEqual(hasher.algorithm, "argon2")

        self.mutation = """
            mutation Login($username: String!, $password: String!) {
                login(username: $username, password: $password) {
                    success
                    message
                }
            }
        """

    def test_login_mutation_success(self):
        response = self.client.post(
            "/graphql/",
            data=json.dumps(
                {
                    "query": self.mutation,
                    "variables": {
                        "username": self.username,
                        "password": self.password,
                    },
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertNotIn("errors", body)
        self.assertTrue(body["data"]["login"]["success"])

    def test_login_mutation_wrong_password_security(self):
        response = self.client.post(
            "/graphql/",
            data=json.dumps(
                {
                    "query": self.mutation,
                    "variables": {
                        "username": self.username,
                        "password": "WrongPass999!",
                    },
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertNotIn("errors", body)
        self.assertFalse(body["data"]["login"]["success"])
        self.assertEqual(body["data"]["login"]["message"], "Invalid credentials.")
        

class EditarUsuarioTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # User normal
        self.user = User.objects.create_user(
            email="user@example.com", password="password123", username="user1"
        )
        self.url=reverse("edit_profile")
    def test_user_actualiza_su_perfil(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.put(
            self.url,
            {"username": "nuevo_name"},
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "nuevo_name")
    def test_user_no_autenticado_no_puede_editar(self):
        response = self.client.put(
            self.url,
            {"email": self.user.email, "username": "hackeado"},
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.user.refresh_from_db()
        self.assertNotEqual(self.user.username, "hackeado")
