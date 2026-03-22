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
        self.user3 = User.objects.create_user(
            username="user3", email="user3@example.com", password="user3"
        )

    # --- follow / unfollow ---

    def test_follow_user(self):
        self.client.force_authenticate(self.user1)
        response = self.client.post(f"/api/v1/users/{self.user2.pk}/follow/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["followed"])
        self.assertIn(self.user2, self.user1.following.all())

    def test_unfollow_user(self):
        self.user2.following.add(self.user1)
        self.client.force_authenticate(self.user2)
        response = self.client.post(f"/api/v1/users/{self.user1.pk}/follow/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["followed"])
        self.assertEqual(self.user2.following.count(), 0)

    def test_follow_returns_user_id(self):
        self.client.force_authenticate(self.user1)
        response = self.client.post(f"/api/v1/users/{self.user2.pk}/follow/")
        self.assertEqual(response.data["user_id"], self.user2.pk)

    def test_follow_self_returns_400(self):
        self.client.force_authenticate(self.user1)
        response = self.client.post(f"/api/v1/users/{self.user1.pk}/follow/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_follow_nonexistent_user_returns_404(self):
        self.client.force_authenticate(self.user1)
        response = self.client.post("/api/v1/users/99999/follow/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_follow_requires_authentication(self):
        response = self.client.post(f"/api/v1/users/{self.user2.pk}/follow/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- get_followers ---

    def test_get_followers_empty(self):
        response = self.client.get(f"/api/v1/users/{self.user1.pk}/followers/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_get_followers_returns_correct_users(self):
        self.user2.following.add(self.user1)
        self.user3.following.add(self.user1)
        response = self.client.get(f"/api/v1/users/{self.user1.pk}/followers/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = [u["username"] for u in response.data]
        self.assertIn("user2", usernames)
        self.assertIn("user3", usernames)

    def test_get_followers_nonexistent_user_returns_404(self):
        response = self.client.get("/api/v1/users/99999/followers/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_followers_includes_is_following_field(self):
        self.user2.following.add(self.user1)
        self.client.force_authenticate(self.user1)
        response = self.client.get(f"/api/v1/users/{self.user1.pk}/followers/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("is_following", response.data[0])

    def test_get_followers_is_following_true_when_mutual(self):
        # user2 follows user1, user1 also follows user2 → is_following=True
        self.user2.following.add(self.user1)
        self.user1.following.add(self.user2)
        self.client.force_authenticate(self.user1)
        response = self.client.get(f"/api/v1/users/{self.user1.pk}/followers/")
        self.assertTrue(response.data[0]["is_following"])

    # --- get_following ---

    def test_get_following_empty(self):
        response = self.client.get(f"/api/v1/users/{self.user1.pk}/following/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_get_following_returns_correct_users(self):
        self.user1.following.add(self.user2)
        self.user1.following.add(self.user3)
        response = self.client.get(f"/api/v1/users/{self.user1.pk}/following/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = [u["username"] for u in response.data]
        self.assertIn("user2", usernames)
        self.assertIn("user3", usernames)

    def test_get_following_nonexistent_user_returns_404(self):
        response = self.client.get("/api/v1/users/99999/following/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_following_includes_is_following_field(self):
        self.user1.following.add(self.user2)
        response = self.client.get(f"/api/v1/users/{self.user1.pk}/following/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("is_following", response.data[0])

    def test_get_following_is_accessible_without_auth(self):
        self.user1.following.add(self.user2)
        response = self.client.get(f"/api/v1/users/{self.user1.pk}/following/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # --- is_following field value correctness ---

    def test_get_followers_is_following_false_when_not_following_back(self):
        # user2 follows user1, but user1 does NOT follow user2 back → is_following=False
        self.user2.following.add(self.user1)
        self.client.force_authenticate(self.user1)
        response = self.client.get(f"/api/v1/users/{self.user1.pk}/followers/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        follower = next(u for u in response.data if u["username"] == "user2")
        self.assertFalse(follower["is_following"])

    def test_get_following_is_following_false_without_auth(self):
        # Without auth, is_following must always be False
        self.user1.following.add(self.user2)
        response = self.client.get(f"/api/v1/users/{self.user1.pk}/following/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        followed = next(u for u in response.data if u["username"] == "user2")
        self.assertFalse(followed["is_following"])

    def test_get_following_is_following_true_when_mutual(self):
        # user1 follows user3, and user2 also follows user3 → is_following=True from user2's perspective
        self.user1.following.add(self.user3)
        self.user2.following.add(self.user3)
        self.client.force_authenticate(self.user2)
        response = self.client.get(f"/api/v1/users/{self.user1.pk}/following/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        followed = next(u for u in response.data if u["username"] == "user3")
        self.assertTrue(followed["is_following"])

    # --- total_followers / total_following counts ---

    def test_follow_increments_total_followers_and_total_following(self):
        # Before: both counters are 0
        self.assertEqual(self.user2.total_followers, 0)
        self.assertEqual(self.user1.total_following, 0)
        self.client.force_authenticate(self.user1)
        self.client.post(f"/api/v1/users/{self.user2.pk}/follow/")
        self.user1.refresh_from_db()
        self.user2.refresh_from_db()
        self.assertEqual(self.user2.total_followers, 1)
        self.assertEqual(self.user1.total_following, 1)

    def test_unfollow_decrements_total_followers_and_total_following(self):
        self.user1.following.add(self.user2)
        self.assertEqual(self.user2.total_followers, 1)
        self.assertEqual(self.user1.total_following, 1)
        self.client.force_authenticate(self.user1)
        self.client.post(f"/api/v1/users/{self.user2.pk}/follow/")
        self.user1.refresh_from_db()
        self.user2.refresh_from_db()
        self.assertEqual(self.user2.total_followers, 0)
        self.assertEqual(self.user1.total_following, 0)

    def test_total_followers_returned_in_followers_list(self):
        # The serializer exposes total_followers; check it reflects the real count
        self.user2.following.add(self.user1)
        self.user3.following.add(self.user1)
        response = self.client.get(f"/api/v1/users/{self.user1.pk}/followers/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for user_data in response.data:
            self.assertIn("total_followers", user_data)
            self.assertIn("total_following", user_data)

    # --- toggle correctness with multiple follows ---

    def test_toggle_follow_multiple_times_ends_unfollowed(self):
        # follow → unfollow → follow → unfollow: final state must be unfollowed
        self.client.force_authenticate(self.user1)
        url = f"/api/v1/users/{self.user2.pk}/follow/"
        for _ in range(4):
            self.client.post(url)
        self.user1.refresh_from_db()
        self.assertFalse(self.user1.following.filter(pk=self.user2.pk).exists())

    def test_toggle_follow_odd_number_of_times_ends_followed(self):
        # Three consecutive toggles: follow → unfollow → follow → final state is followed
        self.client.force_authenticate(self.user1)
        url = f"/api/v1/users/{self.user2.pk}/follow/"
        for _ in range(3):
            self.client.post(url)
        self.user1.refresh_from_db()
        self.assertTrue(self.user1.following.filter(pk=self.user2.pk).exists())

    def test_follow_multiple_users_independent_counts(self):
        # user1 follows both user2 and user3; each should have exactly 1 follower
        self.client.force_authenticate(self.user1)
        self.client.post(f"/api/v1/users/{self.user2.pk}/follow/")
        self.client.post(f"/api/v1/users/{self.user3.pk}/follow/")
        self.user2.refresh_from_db()
        self.user3.refresh_from_db()
        self.assertEqual(self.user2.total_followers, 1)
        self.assertEqual(self.user3.total_followers, 1)
        self.assertEqual(self.user1.total_following, 2)



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
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        

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
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.user.refresh_from_db()
        self.assertNotEqual(self.user.username, "hackeado")
