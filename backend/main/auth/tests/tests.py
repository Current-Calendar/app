from rest_framework import status
from rest_framework.test import APITestCase
from django.urls import reverse
from django.contrib.auth.hashers import check_password
from main.models import User
from django.conf import settings
from datetime import datetime, timedelta
import jwt
from unittest.mock import patch, MagicMock
from django.core.cache import cache
from django.test import TestCase


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

class RegistroUsuarioTests(APITestCase):
    """
    Tests completos para el sistema de registro de users.
    """
    
    def setUp(self):
        """Configuración inicial para cada test."""
        self.url = reverse('register')
        self.datos_validos = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'TestPassword123!',
            'password2': 'TestPassword123!',
            'pronouns': 'él/he',
            'bio': 'Esta es mi biografía de prueba'
        }

    def test_registro_exitoso(self):
        """Test: Registro exitoso con datos válidos."""
        response = self.client.post(self.url, self.datos_validos, format='json')
        
        # Verificar respuesta
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('message', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['message'], 'User registered succesfully')
        
        # Verificar datos del user en la respuesta
        self.assertEqual(response.data['user']['username'], 'testuser')
        self.assertEqual(response.data['user']['email'], 'test@example.com')
        self.assertNotIn('password', response.data['user'])  # No debe devolver password
        
        # Verificar que el user existe en la base de datos
        self.assertTrue(User.objects.filter(username='testuser').exists())
        user = User.objects.get(username='testuser')
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.pronouns, 'él/he')
        self.assertEqual(user.bio, 'Esta es mi biografía de prueba')

    def test_password_hasheada_correctamente(self):
        """Test: La contraseña debe estar hasheada con Argon2."""
        response = self.client.post(self.url, self.datos_validos, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verificar que la contraseña está hasheada
        user = User.objects.get(username='testuser')
        self.assertNotEqual(user.password, 'TestPassword123!')  # No debe estar en texto plano
        self.assertTrue(user.password.startswith('argon2'))  # Debe usar Argon2
        
        # Verificar que la contraseña hasheada es válida
        self.assertTrue(check_password('TestPassword123!', user.password))

    def test_registro_sin_campos_opcionales(self):
        """Test: Registro exitoso sin campos opcionales (pronouns, bio, link)."""
        datos_minimos = {
            'username': 'userminimo',
            'email': 'minimo@example.com',
            'password': 'Password123!',
            'password2': 'Password123!'
        }
        
        response = self.client.post(self.url, datos_minimos, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username='userminimo')
        self.assertEqual(user.pronouns, '')
        self.assertEqual(user.bio, '')
        self.assertEqual(user.link, '')

    def test_passwords_no_coinciden(self):
        """Test: Error cuando las contraseñas no coinciden."""
        datos_invalidos = self.datos_validos.copy()
        datos_invalidos['password2'] = 'DiferentePassword123!'
        
        response = self.client.post(self.url, datos_invalidos, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)
        self.assertFalse(User.objects.filter(username='testuser').exists())

    def test_email_duplicado(self):
        """Test: Error cuando el email ya está registrado."""
        # Crear primer user
        self.client.post(self.url, self.datos_validos, format='json')
        
        # Intentar registrar user con mismo email
        datos_duplicados = self.datos_validos.copy()
        datos_duplicados['username'] = 'otrouser'
        response = self.client.post(self.url, datos_duplicados, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
        self.assertEqual(User.objects.count(), 1)

    def test_username_duplicado(self):
        """Test: Error cuando el username ya está registrado."""
        # Crear primer user
        self.client.post(self.url, self.datos_validos, format='json')
        
        # Intentar registrar user con mismo username
        datos_duplicados = self.datos_validos.copy()
        datos_duplicados['email'] = 'otro@example.com'
        response = self.client.post(self.url, datos_duplicados, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)
        self.assertEqual(User.objects.count(), 1)

    def test_username_muy_corto(self):
        """Test: Error cuando el username tiene menos de 3 caracteres."""
        datos_invalidos = self.datos_validos.copy()
        datos_invalidos['username'] = 'ab'
        
        response = self.client.post(self.url, datos_invalidos, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_username_con_caracteres_invalidos(self):
        """Test: Error cuando el username contiene caracteres no permitidos."""
        usernames_invalidos = ['user@name', 'user name', 'user.name', 'user#name']
        
        for username_invalido in usernames_invalidos:
            datos_invalidos = self.datos_validos.copy()
            datos_invalidos['username'] = username_invalido
            datos_invalidos['email'] = f'{username_invalido}@example.com'
            
            response = self.client.post(self.url, datos_invalidos, format='json')
            
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('username', response.data)

    def test_password_muy_corta(self):
        """Test: Error cuando la contraseña tiene menos de 8 caracteres."""
        datos_invalidos = self.datos_validos.copy()
        datos_invalidos['password'] = 'Pass1!'
        datos_invalidos['password2'] = 'Pass1!'
        
        response = self.client.post(self.url, datos_invalidos, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_password_muy_comun(self):
        """Test: Error cuando la contraseña es muy común."""
        passwords_comunes = ['password123', 'password', '12345678']
        
        for password_comun in passwords_comunes:
            datos_invalidos = self.datos_validos.copy()
            datos_invalidos['username'] = f'user_{password_comun}'
            datos_invalidos['email'] = f'{password_comun}@example.com'
            datos_invalidos['password'] = password_comun
            datos_invalidos['password2'] = password_comun
            
            response = self.client.post(self.url, datos_invalidos, format='json')
            
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('password', response.data)

    def test_password_solo_numerica(self):
        """Test: Error cuando la contraseña es solo numérica."""
        datos_invalidos = self.datos_validos.copy()
        datos_invalidos['password'] = '12345678901'
        datos_invalidos['password2'] = '12345678901'
        
        response = self.client.post(self.url, datos_invalidos, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_password_similar_a_username(self):
        """Test: Error cuando la contraseña es muy similar al username."""
        datos_invalidos = self.datos_validos.copy()
        datos_invalidos['username'] = 'testuser123'
        datos_invalidos['password'] = 'testuser123'
        datos_invalidos['password2'] = 'testuser123'
        
        response = self.client.post(self.url, datos_invalidos, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_email_invalido(self):
        """Test: Error cuando el formato del email es inválido."""
        emails_invalidos = ['notanemail', 'invalid@', '@example.com', 'invalid @example.com']
        
        for email_invalido in emails_invalidos:
            datos_invalidos = self.datos_validos.copy()
            datos_invalidos['username'] = f'user_{email_invalido.replace("@", "").replace(".", "")}'
            datos_invalidos['email'] = email_invalido
            
            response = self.client.post(self.url, datos_invalidos, format='json')
            
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('email', response.data)

    def test_campos_requeridos_faltantes(self):
        """Test: Error cuando faltan campos requeridos."""
        campos_requeridos = ['username', 'email', 'password', 'password2']
        
        for campo in campos_requeridos:
            datos_incompletos = self.datos_validos.copy()
            del datos_incompletos[campo]
            
            response = self.client.post(self.url, datos_incompletos, format='json')
            
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn(campo, response.data)

    def test_email_case_insensitive(self):
        """Test: El email se almacena en minúsculas sin importar cómo se envíe."""
        datos_mayusculas = self.datos_validos.copy()
        datos_mayusculas['email'] = 'TEST@EXAMPLE.COM'
        
        response = self.client.post(self.url, datos_mayusculas, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username='testuser')
        self.assertEqual(user.email, 'test@example.com')

    def test_registro_no_devuelve_password(self):
        """Test: La respuesta no debe incluir la contraseña."""
        response = self.client.post(self.url, self.datos_validos, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn('password', response.data['user'])
        self.assertNotIn('password2', response.data['user'])

    def test_username_valido_con_guiones(self):
        """Test: Username válido con guiones y guiones bajos."""
        usernames_validos = ['user_name', 'user-name', 'user_123', 'user-test_123']
        
        for i, username_valido in enumerate(usernames_validos):
            datos_validos = self.datos_validos.copy()
            datos_validos['username'] = username_valido
            datos_validos['email'] = f'test{i}@example.com'
            
            response = self.client.post(self.url, datos_validos, format='json')
            
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertTrue(User.objects.filter(username=username_valido).exists())


class UsuarioPasswordResetTests(APITestCase):

    RECOVER_URL = "/api/v1/auth/recover-password/"
    SET_URL = "/api/v1/auth/set-new-password/"
    VALIDATE_URL = "/api/v1/auth/validate-reset-token/"

    def setUp(self):
        super().setUp()
        cache.clear()
        self.user = User.objects.create_user(
            username="user1", email="user1@example.com", password="OldPass123!"
        )

    def tearDown(self):
        cache.clear()

    @patch("main.auth.views.resend.Emails.send")
    def test_recover_password_success(self, mock_send):
        response = self.client.post(
            self.RECOVER_URL,
            {"email": "user1@example.com", "source": "http://localhost:8081"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        mock_send.assert_called_once()

    @patch("main.auth.views.resend.Emails.send")
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

    @patch("main.auth.views.resend.Emails.send")
    def test_recover_password_hourly_rate_limit(self, mock_send):
        cache.set("password_reset_hourly_count", 10, 3600)
        response = self.client.post(
            self.RECOVER_URL,
            {"email": "user1@example.com", "source": "http://localhost:8081"},
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("error", response.data)
        mock_send.assert_not_called()

    @patch("main.auth.views.resend.Emails.send")
    def test_recover_password_daily_rate_limit(self, mock_send):
        cache.set("password_reset_daily_count", 100, 86400)
        response = self.client.post(
            self.RECOVER_URL,
            {"email": "user1@example.com", "source": "http://localhost:8081"},
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("error", response.data)
        mock_send.assert_not_called()

    @patch("main.auth.views.resend.Emails.send", side_effect=Exception("rate limit exceeded"))
    def test_recover_password_resend_rate_limit(self, mock_send):
        response = self.client.post(
            self.RECOVER_URL,
            {"email": "user1@example.com", "source": "http://localhost:8081"},
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("error", response.data)

    @patch("main.auth.views.resend.Emails.send")
    def test_recover_password_increments_cache_counters(self, mock_send):
        self.client.post(
            self.RECOVER_URL,
            {"email": "user1@example.com", "source": "http://localhost:8081"},
        )
        self.assertEqual(cache.get("password_reset_hourly_count"), 1)
        self.assertEqual(cache.get("password_reset_daily_count"), 1)

    @patch("main.auth.views.resend.Emails.send", side_effect=Exception("unexpected crash"))
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



class AuthTokenIntegrationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="jwt_user",
            email="jwt_user@example.com",
            password="JwtPass123!",
        )

    def test_token_obtain_pair_success(self):
        response = self.client.post(
            "/api/v1/token/",
            {"username": "jwt_user", "password": "JwtPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_token_refresh_success(self):
        token_response = self.client.post(
            "/api/v1/token/",
            {"username": "jwt_user", "password": "JwtPass123!"},
            format="json",
        )
        refresh = token_response.data["refresh"]

        response = self.client.post(
            "/api/v1/token/refresh/",
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_token_refresh_invalid_token(self):
        response = self.client.post(
            "/api/v1/token/refresh/",
            {"refresh": "not-a-real-refresh-token"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class GoogleOAuthIntegrationTests(APITestCase):
    @patch("main.auth.views.google_auth_oauthlib_flow.Flow.from_client_config")
    def test_google_authorization_redirects_and_sets_state(self, mock_from_client_config):
        flow = MagicMock()
        flow.authorization_url.return_value = ("https://accounts.google.com/o/oauth2/auth", "state-123")
        mock_from_client_config.return_value = flow

        response = self.client.get("/api/v1/auth/google-auth")
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertTrue(response["Location"].startswith("https://accounts.google.com"))
        self.assertEqual(self.client.session.get("oauth_state"), "state-123")

    @patch("main.auth.views.google_auth_oauthlib_flow.Flow.from_client_config")
    def test_google_oauth_callback_stores_credentials(self, mock_from_client_config):
        flow = MagicMock()
        flow.credentials = MagicMock(
            token="access-token",
            refresh_token="refresh-token",
            token_uri="https://oauth2.googleapis.com/token",
            client_id="client-id",
            client_secret="client-secret",
            scopes=["https://www.googleapis.com/auth/calendar.readonly"],
        )
        mock_from_client_config.return_value = flow

        session = self.client.session
        session["oauth_state"] = "state-abc"
        session.save()

        response = self.client.get("/api/v1/auth/oauth2callback/?code=fake-code&state=state-abc")
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn("/calendars", response["Location"])

        saved_credentials = self.client.session.get("google_credentials")
        self.assertIsNotNone(saved_credentials)
        self.assertEqual(saved_credentials["token"], "access-token")



class JwtAuthEndpointsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="jwt_endpoints_user",
            email="jwt_endpoints_user@example.com",
            password="JwtEndpointsPass123!",
        )

    def test_token_obtain_success(self):
        response = self.client.post(
            "/api/v1/token/",
            {"username": "jwt_endpoints_user", "password": "JwtEndpointsPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_token_obtain_error(self):
        response = self.client.post(
            "/api/v1/token/",
            {"username": "jwt_endpoints_user", "password": "bad-password"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh_success(self):
        login = self.client.post(
            "/api/v1/token/",
            {"username": "jwt_endpoints_user", "password": "JwtEndpointsPass123!"},
            format="json",
        )
        refresh = login.data["refresh"]
        response = self.client.post(
            "/api/v1/token/refresh/",
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_token_refresh_error(self):
        response = self.client.post(
            "/api/v1/token/refresh/",
            {"refresh": "invalid-refresh-token"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class GoogleOAuthEndpointsTests(APITestCase):
    @patch("main.auth.views.google_auth_oauthlib_flow.Flow.from_client_config")
    def test_google_authorization_sets_state_and_redirects(self, mock_from_client_config):
        flow = MagicMock()
        flow.authorization_url.return_value = ("https://accounts.google.com/o/oauth2/auth", "oauth-state-xyz")
        mock_from_client_config.return_value = flow

        response = self.client.get("/api/v1/auth/google-auth")
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertTrue(response["Location"].startswith("https://accounts.google.com"))
        self.assertEqual(self.client.session.get("oauth_state"), "oauth-state-xyz")

    @patch("main.auth.views.google_auth_oauthlib_flow.Flow.from_client_config")
    def test_google_callback_stores_credentials_and_redirects(self, mock_from_client_config):
        flow = MagicMock()
        flow.credentials = MagicMock(
            token="oauth-access-token",
            refresh_token="oauth-refresh-token",
            token_uri="https://oauth2.googleapis.com/token",
            client_id="oauth-client-id",
            client_secret="oauth-client-secret",
            scopes=["https://www.googleapis.com/auth/calendar.readonly"],
        )
        mock_from_client_config.return_value = flow

        session = self.client.session
        session["oauth_state"] = "oauth-state-xyz"
        session.save()

        response = self.client.get("/api/v1/auth/oauth2callback/?code=fake&state=oauth-state-xyz")
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn("/calendars", response["Location"])
        saved = self.client.session.get("google_credentials")
        self.assertEqual(saved["token"], "oauth-access-token")
