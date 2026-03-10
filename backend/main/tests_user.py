from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

import jwt
from django.conf import settings
from django.core.cache import cache
from django.test import TestCase

from rest_framework import status
from rest_framework.test import APITestCase

from .models import Usuario


def _make_token(email, expired=False, no_email=False):
    """Helper to build a JWT for tests without hitting the real endpoint."""
    if no_email:
        payload = {
            "exp": datetime.now() + timedelta(hours=1),
            "iat": datetime.now(),
        }
    else:
        payload = {
            "email": email,
            "exp": datetime.now() + (timedelta(seconds=-1) if expired else timedelta(hours=1)),
            "iat": datetime.now(),
        }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


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

class UsuarioPasswordResetTests(APITestCase):

    RECOVER_URL = "/api/v1/auth/recover-password/"
    SET_URL = "/api/v1/auth/set-new-password/"
    VALIDATE_URL = "/api/v1/auth/validate-reset-token/"

    def setUp(self):
        super().setUp()
        cache.clear()
        self.user = Usuario.objects.create_user(
            username="user1", email="user1@example.com", password="OldPass123!"
        )

    def tearDown(self):
        cache.clear()

    @patch("main.views.resend.Emails.send")
    def test_recover_password_success(self, mock_send):
        response = self.client.post(
            self.RECOVER_URL,
            {"email": "user1@example.com", "source": "http://localhost:8081"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        mock_send.assert_called_once()

    @patch("main.views.resend.Emails.send")
    def test_recover_password_nonexistent_email_does_not_reveal(self, mock_send):
        response = self.client.post(
            self.RECOVER_URL,
            {"email": "ghost@example.com", "source": "http://localhost:8081"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        mock_send.assert_not_called()

    def test_recover_password_missing_email(self):
        response = self.client.post(self.RECOVER_URL, {"source": "http://localhost:8081"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    @patch("main.views.resend.Emails.send")
    def test_recover_password_hourly_rate_limit(self, mock_send):
        cache.set("password_reset_hourly_count", 10, 3600)
        response = self.client.post(
            self.RECOVER_URL,
            {"email": "user1@example.com", "source": "http://localhost:8081"},
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("error", response.data)
        mock_send.assert_not_called()

    @patch("main.views.resend.Emails.send")
    def test_recover_password_daily_rate_limit(self, mock_send):
        cache.set("password_reset_daily_count", 100, 86400)
        response = self.client.post(
            self.RECOVER_URL,
            {"email": "user1@example.com", "source": "http://localhost:8081"},
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("error", response.data)
        mock_send.assert_not_called()

    @patch("main.views.resend.Emails.send", side_effect=Exception("rate limit exceeded"))
    def test_recover_password_resend_rate_limit(self, mock_send):
        response = self.client.post(
            self.RECOVER_URL,
            {"email": "user1@example.com", "source": "http://localhost:8081"},
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("error", response.data)

    @patch("main.views.resend.Emails.send")
    def test_recover_password_increments_cache_counters(self, mock_send):
        self.client.post(
            self.RECOVER_URL,
            {"email": "user1@example.com", "source": "http://localhost:8081"},
        )
        self.assertEqual(cache.get("password_reset_hourly_count"), 1)
        self.assertEqual(cache.get("password_reset_daily_count"), 1)

    @patch("main.views.resend.Emails.send", side_effect=Exception("unexpected crash"))
    def test_recover_password_unexpected_email_error_propagates(self, mock_send):
        with self.assertRaises(Exception):
            self.client.post(
                self.RECOVER_URL,
                {"email": "user1@example.com", "source": "http://localhost:8081"},
            )


    def test_set_new_password_success(self):
        token = _make_token("user1@example.com")
        response = self.client.post(
            self.SET_URL, {"token": token, "new_password": "NewStr0ng!Pass"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewStr0ng!Pass"))

    def test_set_new_password_missing_token(self):
        response = self.client.post(self.SET_URL, {"new_password": "NewStr0ng!Pass"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_set_new_password_missing_password(self):
        token = _make_token("user1@example.com")
        response = self.client.post(self.SET_URL, {"token": token})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_set_new_password_missing_both(self):
        response = self.client.post(self.SET_URL, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_set_new_password_expired_token(self):
        token = _make_token("user1@example.com", expired=True)
        response = self.client.post(
            self.SET_URL, {"token": token, "new_password": "NewStr0ng!Pass"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", response.data["error"].lower())

    def test_set_new_password_invalid_token(self):
        response = self.client.post(
            self.SET_URL, {"token": "not.a.real.token", "new_password": "NewStr0ng!Pass"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_set_new_password_token_without_email(self):
        token = _make_token(None, no_email=True)
        response = self.client.post(
            self.SET_URL, {"token": token, "new_password": "NewStr0ng!Pass"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_set_new_password_user_not_found(self):
        token = _make_token("deleted@example.com")
        response = self.client.post(
            self.SET_URL, {"token": token, "new_password": "NewStr0ng!Pass"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_set_new_password_weak_password(self):
        token = _make_token("user1@example.com")
        response = self.client.post(
            self.SET_URL, {"token": token, "new_password": "123"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OldPass123!"))


    def test_validate_token_success(self):
        token = _make_token("user1@example.com")
        response = self.client.get(self.VALIDATE_URL, {"token": token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["valid"])

    def test_validate_token_missing(self):
        response = self.client.get(self.VALIDATE_URL)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_validate_token_invalid(self):
        response = self.client.get(self.VALIDATE_URL, {"token": "garbage"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["valid"])

    def test_validate_token_expired(self):
        token = _make_token("user1@example.com", expired=True)
        response = self.client.get(self.VALIDATE_URL, {"token": token})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["valid"])
        self.assertIn("expired", response.data["error"].lower())

    def test_validate_token_without_email_claim(self):
        token = _make_token(None, no_email=True)
        response = self.client.get(self.VALIDATE_URL, {"token": token})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["valid"])

    def test_validate_token_user_not_found(self):
        token = _make_token("ghost@example.com")
        response = self.client.get(self.VALIDATE_URL, {"token": token})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["valid"])

