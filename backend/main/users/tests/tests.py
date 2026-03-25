import json

from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from main.models import User, Calendar, CalendarLike
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
        self.user2.following.add(self.user1)
        self.client.force_authenticate(self.user1)
        response = self.client.get(f"/api/v1/users/{self.user1.pk}/followers/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        follower = next(u for u in response.data if u["username"] == "user2")
        self.assertFalse(follower["is_following"])

    def test_get_following_is_following_false_without_auth(self):
        self.user1.following.add(self.user2)
        response = self.client.get(f"/api/v1/users/{self.user1.pk}/following/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        followed = next(u for u in response.data if u["username"] == "user2")
        self.assertFalse(followed["is_following"])

    def test_get_following_is_following_true_when_mutual(self):
        self.user1.following.add(self.user3)
        self.user2.following.add(self.user3)
        self.client.force_authenticate(self.user2)
        response = self.client.get(f"/api/v1/users/{self.user1.pk}/following/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        followed = next(u for u in response.data if u["username"] == "user3")
        self.assertTrue(followed["is_following"])

    # --- total_followers / total_following counts ---

    def test_follow_increments_total_followers_and_total_following(self):
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
        self.user2.following.add(self.user1)
        self.user3.following.add(self.user1)
        response = self.client.get(f"/api/v1/users/{self.user1.pk}/followers/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for user_data in response.data:
            self.assertIn("total_followers", user_data)
            self.assertIn("total_following", user_data)

    # --- toggle correctness with multiple follows ---

    def test_toggle_follow_multiple_times_ends_unfollowed(self):
        self.client.force_authenticate(self.user1)
        url = f"/api/v1/users/{self.user2.pk}/follow/"
        for _ in range(4):
            self.client.post(url)
        self.user1.refresh_from_db()
        self.assertFalse(self.user1.following.filter(pk=self.user2.pk).exists())

    def test_toggle_follow_odd_number_of_times_ends_followed(self):
        self.client.force_authenticate(self.user1)
        url = f"/api/v1/users/{self.user2.pk}/follow/"
        for _ in range(3):
            self.client.post(url)
        self.user1.refresh_from_db()
        self.assertTrue(self.user1.following.filter(pk=self.user2.pk).exists())

    def test_follow_multiple_users_independent_counts(self):
        self.client.force_authenticate(self.user1)
        self.client.post(f"/api/v1/users/{self.user2.pk}/follow/")
        self.client.post(f"/api/v1/users/{self.user3.pk}/follow/")
        self.user2.refresh_from_db()
        self.user3.refresh_from_db()
        self.assertEqual(self.user2.total_followers, 1)
        self.assertEqual(self.user3.total_followers, 1)
        self.assertEqual(self.user1.total_following, 2)

    # --- get_user_by_id ---

    def test_get_user_by_id_returns_data(self):
        self.client.force_authenticate(self.user1)
        response = self.client.get(f"/api/v1/users/{self.user2.pk}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], self.user2.username)

    def test_get_user_by_id_nonexistent_returns_404(self):
        self.client.force_authenticate(self.user1)
        response = self.client.get("/api/v1/users/99999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- get_user_by_username ---

    def test_get_user_by_username_returns_data(self):
        self.client.force_authenticate(self.user1)
        response = self.client.get(f"/api/v1/users/by-username/{self.user2.username}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], self.user2.username)

    def test_get_user_by_username_nonexistent_returns_404(self):
        self.client.force_authenticate(self.user1)
        response = self.client.get("/api/v1/users/by-username/noexiste/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- followed_calendars ---

    def test_get_followed_calendars_returns_200(self):
        self.client.force_authenticate(self.user1)
        response = self.client.get(f"/api/v1/users/{self.user1.pk}/followed_calendars/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class BorrarUsuarioTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="user@example.com", password="password123", username="user1"
        )
        self.url = reverse("delete_own_user")

    def test_borrar(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertRaises(User.DoesNotExist, self.user.refresh_from_db)

    def test_borrar_no_autenticado(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_borrar_usuario_actualiza_likes_count(self):
        owner = User.objects.create_user(
            email="owner@example.com", password="password123", username="owner"
        )
        calendar = Calendar.objects.create(
            name="Calendar with likes",
            privacy="PUBLIC",
            creator=owner,
        )
        CalendarLike.objects.create(user=self.user, calendar=calendar)
        calendar.refresh_from_db()
        self.assertEqual(calendar.likes_count, 1)

        self.client.force_authenticate(user=self.user)
        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        calendar.refresh_from_db()
        self.assertEqual(calendar.likes_count, 0)


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
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPassword123!'
        )
        self.assertTrue(user.password.startswith('argon2'))
        self.assertTrue(check_password('TestPassword123!', user.password))

    def test_email_es_unico(self):
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
            data=json.dumps({
                "query": self.mutation,
                "variables": {"username": self.username, "password": self.password},
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertNotIn("errors", body)
        self.assertTrue(body["data"]["login"]["success"])

    def test_login_mutation_wrong_password_security(self):
        response = self.client.post(
            "/graphql/",
            data=json.dumps({
                "query": self.mutation,
                "variables": {"username": self.username, "password": "WrongPass999!"},
            }),
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
        self.user = User.objects.create_user(
            email="user@example.com", password="password123", username="user1"
        )
        self.url = reverse("edit_profile")

    def test_user_actualiza_su_perfil(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.put(
            self.url, {"username": "nuevo_name"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "nuevo_name")

    def test_user_no_autenticado_no_puede_editar(self):
        response = self.client.put(
            self.url,
            {"email": self.user.email, "username": "hackeado"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.user.refresh_from_db()
        self.assertNotEqual(self.user.username, "hackeado")


class EditProfileValidationTests(APITestCase):
    """Covers users/views.py lines 178-179: invalid serializer → 400."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="editval", email="editval@example.com", password="pass1234"
        )
        self.client.force_authenticate(self.user)


class GetFollowedCalendarsExtendedTests(APITestCase):
    """Covers users/views.py lines 203-210: 404 and list with calendars."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username="fol_owner", email="fol_owner@example.com", password="pass1234"
        )
        self.subscriber = User.objects.create_user(
            username="fol_sub", email="fol_sub@example.com", password="pass1234"
        )
        self.public_cal = Calendar.objects.create(
            name="Public Followed", privacy="PUBLIC", creator=self.owner
        )
        self.private_cal = Calendar.objects.create(
            name="Private Followed", privacy="PRIVATE", creator=self.owner
        )
        self.subscriber.subscribed_calendars.add(self.public_cal)
        self.subscriber.subscribed_calendars.add(self.private_cal)

    def test_nonexistent_user_returns_404(self):
        response = self.client.get("/api/v1/users/99999/followed_calendars/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_only_public_subscribed_calendars_returned(self):
        response = self.client.get(
            f"/api/v1/users/{self.subscriber.pk}/followed_calendars/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [c["name"] for c in response.json()]
        self.assertIn("Public Followed", names)
        self.assertNotIn("Private Followed", names)

    def test_returns_empty_when_no_subscriptions(self):
        response = self.client.get(
            f"/api/v1/users/{self.owner.pk}/followed_calendars/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), [])


class OwnProfileIntegrationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="me_user",
            email="me_user@example.com",
            password="MePass123!",
        )
        self.calendar = Calendar.objects.create(
            name="My Own Profile Calendar",
            privacy="PUBLIC",
            creator=self.user,
        )

    def test_get_own_profile_requires_authentication(self):
        response = self.client.get("/api/v1/users/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_own_profile_success(self):
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/v1/users/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "me_user")
        self.assertIn("calendars", response.data)
        calendar_names = [c["name"] for c in response.data["calendars"]]
        self.assertIn("My Own Profile Calendar", calendar_names)



class UsersByUsernameAndFollowedCalendarsIntegrationTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner_profile",
            email="owner_profile@example.com",
            password="OwnerPass123!",
        )
        self.viewer = User.objects.create_user(
            username="viewer_profile",
            email="viewer_profile@example.com",
            password="ViewerPass123!",
        )
        self.public_calendar = Calendar.objects.create(
            name="Owner Public Calendar",
            privacy="PUBLIC",
            creator=self.owner,
        )
        self.private_calendar = Calendar.objects.create(
            name="Owner Private Calendar",
            privacy="PRIVATE",
            creator=self.owner,
        )
        self.viewer.subscribed_calendars.add(self.public_calendar)
        self.viewer.subscribed_calendars.add(self.private_calendar)

    def test_get_user_by_username_returns_public_calendars_only(self):
        response = self.client.get(f"/api/v1/users/by-username/{self.owner.username}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], self.owner.username)
        names = [c["name"] for c in response.data["public_calendars"]]
        self.assertIn("Owner Public Calendar", names)
        self.assertNotIn("Owner Private Calendar", names)

    def test_get_user_by_username_nonexistent_returns_404(self):
        response = self.client.get("/api/v1/users/by-username/does_not_exist_123/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_followed_calendars_returns_only_public(self):
        response = self.client.get(f"/api/v1/users/{self.viewer.pk}/followed_calendars/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [c["name"] for c in response.data]
        self.assertIn("Owner Public Calendar", names)
        self.assertNotIn("Owner Private Calendar", names)

    def test_get_followed_calendars_nonexistent_user_returns_404(self):
        response = self.client.get("/api/v1/users/999999/followed_calendars/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)



class PerfilUsuarioEndpointsTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="perfil_owner",
            email="perfil_owner@example.com",
            password="PerfilOwnerPass123!",
        )
        self.viewer = User.objects.create_user(
            username="perfil_viewer",
            email="perfil_viewer@example.com",
            password="PerfilViewerPass123!",
        )
        self.public_calendar = Calendar.objects.create(
            name="Perfil Public Calendar",
            privacy="PUBLIC",
            creator=self.owner,
        )
        self.private_calendar = Calendar.objects.create(
            name="Perfil Private Calendar",
            privacy="PRIVATE",
            creator=self.owner,
        )
        self.viewer.subscribed_calendars.add(self.public_calendar)
        self.viewer.subscribed_calendars.add(self.private_calendar)

    def test_get_me_requires_auth(self):
        response = self.client.get("/api/v1/users/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_me_ok(self):
        self.client.force_authenticate(self.viewer)
        response = self.client.get("/api/v1/users/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "perfil_viewer")

    def test_get_by_username_ok_and_only_public_calendars(self):
        response = self.client.get(f"/api/v1/users/by-username/{self.owner.username}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [c["name"] for c in response.data["public_calendars"]]
        self.assertIn("Perfil Public Calendar", names)
        self.assertNotIn("Perfil Private Calendar", names)

    def test_get_by_username_404(self):
        response = self.client.get("/api/v1/users/by-username/no_user_404/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_followed_calendars_only_public(self):
        response = self.client.get(f"/api/v1/users/{self.viewer.pk}/followed_calendars/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [c["name"] for c in response.data]
        self.assertIn("Perfil Public Calendar", names)
        self.assertNotIn("Perfil Private Calendar", names)
