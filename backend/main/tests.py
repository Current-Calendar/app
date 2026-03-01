import json

from django.contrib.auth.hashers import identify_hasher, check_password
from django.test import TestCase
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password
import datetime
from main.models import Usuario, Calendario, Evento
from django.urls import reverse
from main.models import Usuario, Calendario, Evento
from django.utils import timezone
from django.contrib.gis.geos import Point
from datetime import timedelta

ENDPOINT_EVENTOS = "/api/v1/eventos"
PUBLISH_CALENDAR_ENDPOINT = "/api/v1/calendarios/{}/publicar"

class CrearEventoTests(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.usuario = Usuario.objects.create_user(
            username="eventuser",
            email="event@example.com",
            password="testpass123",
        )

        self.calendario = Calendario.objects.create(
            creador=self.usuario,
            nombre="Calendario Test",
            estado="PRIVADO",
        )

    def test_crear_evento_exitoso(self):
        payload = {
            "titulo": "Evento Test",
            "fecha": "2026-03-01",
            "hora": "18:00:00",
            "calendarios": [self.calendario.id],
            "creador_id": self.usuario.id
        }

        response = self.client.post(ENDPOINT_EVENTOS, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Evento.objects.filter(titulo="Evento Test").exists()
        )

    def test_error_sin_titulo(self):
        payload = {
            "fecha": "2026-03-01",
            "hora": "18:00:00",
            "calendarios": [self.calendario.id],
        }

        response = self.client.post(ENDPOINT_EVENTOS, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_error_sin_fecha(self):
        payload = {
            "titulo": "Evento",
            "hora": "18:00:00",
            "calendarios": [self.calendario.id],
        }

        response = self.client.post(ENDPOINT_EVENTOS, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_error_sin_calendario(self):
        payload = {
            "titulo": "Evento",
            "fecha": "2026-03-01",
            "hora": "18:00:00",
        }

        response = self.client.post(ENDPOINT_EVENTOS, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_error_calendario_no_existe(self):
        payload = {
            "titulo": "Evento",
            "fecha": "2026-03-01",
            "hora": "18:00:00",
            "calendarios": [9999],
            "creador_id": self.usuario.id
        }

        response = self.client.post(ENDPOINT_EVENTOS, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_no_permitido(self):
        response = self.client.get(ENDPOINT_EVENTOS)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

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
from rest_framework import status
from main.models import Usuario, Calendario, Evento
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient

EDIT_EVENT_ENDPOINT = "/api/v1/eventos/{}"
ENDPOINT_BUSCAR_USUARIOS = "/api/v1/usuarios"


class EditEventTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = Usuario.objects.create_user(
            username="eventuser",
            email="event@example.com",
            password="testpass123",
        )

        self.calendar1 = Calendario.objects.create(
            creador=self.user,
            nombre="Calendario 1",
            estado="PUBLICO",
        )

        self.calendar2 = Calendario.objects.create(
            creador=self.user,
            nombre="Calendario 2",
            estado="PUBLICO",
        )

        self.event = Evento.objects.create(
            titulo="Evento Original",
            descripcion="Descripcion original",
            nombre_lugar="Lugar original",
            fecha="2026-03-01",
            hora="18:00:00",
            creador=self.user,
        )
        self.event.calendarios.set([self.calendar1])

    def endpoint(self, event_id=None):
        return EDIT_EVENT_ENDPOINT.format(event_id or self.event.id)

    # ── Success cases ──

    def test_edit_title(self):
        response = self.client.put(
            self.endpoint(),
            {"titulo": "Titulo Nuevo"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(self.event.titulo, "Titulo Nuevo")

    def test_edit_multiple_fields(self):
        response = self.client.put(
            self.endpoint(),
            {
                "titulo": "Nuevo titulo",
                "descripcion": "Nueva descripcion",
                "nombre_lugar": "Nuevo lugar",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(self.event.titulo, "Nuevo titulo")
        self.assertEqual(self.event.descripcion, "Nueva descripcion")
        self.assertEqual(self.event.nombre_lugar, "Nuevo lugar")

    def test_edit_date_and_time(self):
        response = self.client.put(
            self.endpoint(),
            {"fecha": "2026-06-15", "hora": "20:30:00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(str(self.event.fecha), "2026-06-15")
        self.assertEqual(str(self.event.hora), "20:30:00")

    def test_change_calendars(self):
        response = self.client.put(
            self.endpoint(),
            {"calendarios": [self.calendar2.id]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cals = list(self.event.calendarios.values_list("id", flat=True))
        self.assertEqual(cals, [self.calendar2.id])

    def test_edit_location(self):
        response = self.client.put(
            self.endpoint(),
            {"latitud": 37.3861, "longitud": -5.9926},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertIsNotNone(self.event.ubicacion)
        self.assertAlmostEqual(self.event.ubicacion.y, 37.3861, places=4)
        self.assertAlmostEqual(self.event.ubicacion.x, -5.9926, places=4)

    def test_edit_recurrence_and_external_id(self):
        response = self.client.put(
            self.endpoint(),
            {"recurrencia": 7, "id_externo": "ext-123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(self.event.recurrencia, 7)
        self.assertEqual(self.event.id_externo, "ext-123")

    def test_unsent_fields_remain_unchanged(self):
        original_title = self.event.titulo
        original_description = self.event.descripcion

        response = self.client.put(
            self.endpoint(),
            {"nombre_lugar": "Solo cambio lugar"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(self.event.titulo, original_title)
        self.assertEqual(self.event.descripcion, original_description)
        self.assertEqual(self.event.nombre_lugar, "Solo cambio lugar")

    def test_response_contains_expected_keys(self):
        response = self.client.put(
            self.endpoint(),
            {"titulo": "Check keys"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected_keys = {
            "id", "titulo", "descripcion", "nombre_lugar",
            "fecha", "hora", "recurrencia", "id_externo",
            "calendarios", "fecha_creacion",
        }
        self.assertEqual(set(response.data.keys()), expected_keys)

    # ── Error cases ──

    def test_event_not_found(self):
        response = self.client.put(
            self.endpoint(event_id=9999),
            {"titulo": "No existe"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_empty_title(self):
        response = self.client.put(
            self.endpoint(),
            {"titulo": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_empty_date(self):
        response = self.client.put(
            self.endpoint(),
            {"fecha": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_empty_time(self):
        response = self.client.put(
            self.endpoint(),
            {"hora": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_nonexistent_calendar(self):
        response = self.client.put(
            self.endpoint(),
            {"calendarios": [9999]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("errors", response.data)

    def test_empty_calendar_list(self):
        response = self.client.put(
            self.endpoint(),
            {"calendarios": []},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_invalid_lat_lon(self):
        response = self.client.put(
            self.endpoint(),
            {"latitud": "abc", "longitud": "xyz"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_get_not_allowed(self):
        response = self.client.get(self.endpoint())
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_post_not_allowed(self):
        response = self.client.post(
            self.endpoint(),
            {"titulo": "No permitido"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        
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

Usuario = get_user_model()


class RegistroUsuarioTests(APITestCase):
    """
    Tests completos para el sistema de registro de usuarios.
    """
    
    def setUp(self):
        """Configuración inicial para cada test."""
        self.url = reverse('registro')
        self.datos_validos = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'TestPassword123!',
            'password2': 'TestPassword123!',
            'pronombres': 'él/he',
            'biografia': 'Esta es mi biografía de prueba'
        }

    def test_registro_exitoso(self):
        """Test: Registro exitoso con datos válidos."""
        response = self.client.post(self.url, self.datos_validos, format='json')
        
        # Verificar respuesta
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('message', response.data)
        self.assertIn('usuario', response.data)
        self.assertEqual(response.data['message'], 'Usuario registrado exitosamente')
        
        # Verificar datos del usuario en la respuesta
        self.assertEqual(response.data['usuario']['username'], 'testuser')
        self.assertEqual(response.data['usuario']['email'], 'test@example.com')
        self.assertNotIn('password', response.data['usuario'])  # No debe devolver password
        
        # Verificar que el usuario existe en la base de datos
        self.assertTrue(Usuario.objects.filter(username='testuser').exists())
        usuario = Usuario.objects.get(username='testuser')
        self.assertEqual(usuario.email, 'test@example.com')
        self.assertEqual(usuario.pronombres, 'él/he')
        self.assertEqual(usuario.biografia, 'Esta es mi biografía de prueba')

    def test_password_hasheada_correctamente(self):
        """Test: La contraseña debe estar hasheada con Argon2."""
        response = self.client.post(self.url, self.datos_validos, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verificar que la contraseña está hasheada
        usuario = Usuario.objects.get(username='testuser')
        self.assertNotEqual(usuario.password, 'TestPassword123!')  # No debe estar en texto plano
        self.assertTrue(usuario.password.startswith('argon2'))  # Debe usar Argon2
        
        # Verificar que la contraseña hasheada es válida
        self.assertTrue(check_password('TestPassword123!', usuario.password))

    def test_registro_sin_campos_opcionales(self):
        """Test: Registro exitoso sin campos opcionales (pronombres, biografia, link)."""
        datos_minimos = {
            'username': 'userminimo',
            'email': 'minimo@example.com',
            'password': 'Password123!',
            'password2': 'Password123!'
        }
        
        response = self.client.post(self.url, datos_minimos, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        usuario = Usuario.objects.get(username='userminimo')
        self.assertEqual(usuario.pronombres, '')
        self.assertEqual(usuario.biografia, '')
        self.assertEqual(usuario.link, '')

    def test_passwords_no_coinciden(self):
        """Test: Error cuando las contraseñas no coinciden."""
        datos_invalidos = self.datos_validos.copy()
        datos_invalidos['password2'] = 'DiferentePassword123!'
        
        response = self.client.post(self.url, datos_invalidos, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)
        self.assertFalse(Usuario.objects.filter(username='testuser').exists())

    def test_email_duplicado(self):
        """Test: Error cuando el email ya está registrado."""
        # Crear primer usuario
        self.client.post(self.url, self.datos_validos, format='json')
        
        # Intentar registrar usuario con mismo email
        datos_duplicados = self.datos_validos.copy()
        datos_duplicados['username'] = 'otrouser'
        response = self.client.post(self.url, datos_duplicados, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
        self.assertEqual(Usuario.objects.count(), 1)

    def test_username_duplicado(self):
        """Test: Error cuando el username ya está registrado."""
        # Crear primer usuario
        self.client.post(self.url, self.datos_validos, format='json')
        
        # Intentar registrar usuario con mismo username
        datos_duplicados = self.datos_validos.copy()
        datos_duplicados['email'] = 'otro@example.com'
        response = self.client.post(self.url, datos_duplicados, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)
        self.assertEqual(Usuario.objects.count(), 1)

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
        usuario = Usuario.objects.get(username='testuser')
        self.assertEqual(usuario.email, 'test@example.com')

    def test_registro_no_devuelve_password(self):
        """Test: La respuesta no debe incluir la contraseña."""
        response = self.client.post(self.url, self.datos_validos, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn('password', response.data['usuario'])
        self.assertNotIn('password2', response.data['usuario'])

    def test_username_valido_con_guiones(self):
        """Test: Username válido con guiones y guiones bajos."""
        usernames_validos = ['user_name', 'user-name', 'user_123', 'user-test_123']
        
        for i, username_valido in enumerate(usernames_validos):
            datos_validos = self.datos_validos.copy()
            datos_validos['username'] = username_valido
            datos_validos['email'] = f'test{i}@example.com'
            
            response = self.client.post(self.url, datos_validos, format='json')
            
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertTrue(Usuario.objects.filter(username=username_valido).exists())


class UsuarioModelTests(TestCase):
    """Tests para el modelo Usuario."""
    
    def test_crear_usuario_con_create_user(self):
        """Test: Crear usuario con el método create_user hashea la contraseña."""
        usuario = Usuario.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPassword123!'
        )
        
        self.assertTrue(usuario.password.startswith('argon2'))
        self.assertTrue(check_password('TestPassword123!', usuario.password))

    def test_email_es_unico(self):
        """Test: El email debe ser único en la base de datos."""
        Usuario.objects.create_user(
            username='user1',
            email='test@example.com',
            password='Password123!'
        )
        
        with self.assertRaises(Exception):
            Usuario.objects.create_user(
                username='user2',
                email='test@example.com',
                password='Password123!'
            )


class LoginMutationTests(TestCase):
    def setUp(self):
        self.username = "qa_login_user"
        self.password = "StrongPass123!"
        self.user = Usuario.objects.create_user(
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
        self.assertEqual(body["data"]["login"]["message"], "Credenciales invalidas.")

ENDPOINT = "/api/v1/calendarios"


class CrearCalendarioTests(TestCase):
    """Tests para POST /api/v1/calendarios"""

    def setUp(self):
        self.client = APIClient()
        self.usuario = Usuario.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )

    # ------------------------------------------------------------------
    # Casos exitosos
    # ------------------------------------------------------------------

    def test_crear_calendario_privado_exitoso(self):
        """Crea un calendario PRIVADO (valor por defecto) correctamente."""
        payload = {
            "creador_id": self.usuario.id,
            "nombre": "Calendario Privado",
        }
        response = self.client.post(ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["nombre"], "Calendario Privado")
        self.assertEqual(data["estado"], "PRIVADO")
        self.assertEqual(data["origen"], "CURRENT")
        self.assertEqual(data["creador_id"], self.usuario.id)
        self.assertEqual(data["descripcion"], "")
        self.assertIsNone(data["id_externo"])
        self.assertIn("id", data)
        self.assertIn("fecha_creacion", data)

    def test_crear_calendario_publico_exitoso(self):
        """Crea un calendario con estado PUBLICO correctamente."""
        payload = {
            "creador_id": self.usuario.id,
            "nombre": "Calendario Público",
            "estado": "PUBLICO",
            "descripcion": "Un calendario para todos",
        }
        response = self.client.post(ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["estado"], "PUBLICO")
        self.assertEqual(data["descripcion"], "Un calendario para todos")

    def test_crear_calendario_amigos_exitoso(self):
        """Crea un calendario con estado AMIGOS correctamente."""
        payload = {
            "creador_id": self.usuario.id,
            "nombre": "Calendario Amigos",
            "estado": "AMIGOS",
        }
        response = self.client.post(ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["estado"], "AMIGOS")

    def test_crear_calendario_con_origen_google(self):
        """Crea un calendario importado de Google Calendar."""
        payload = {
            "creador_id": self.usuario.id,
            "nombre": "Google Cal",
            "origen": "GOOGLE",
            "id_externo": "abc123@google.com",
        }
        response = self.client.post(ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["origen"], "GOOGLE")
        self.assertEqual(data["id_externo"], "abc123@google.com")

    def test_crear_calendario_con_todos_los_campos_opcionales(self):
        """Crea un calendario especificando todos los campos."""
        payload = {
            "creador_id": self.usuario.id,
            "nombre": "Calendario Completo",
            "descripcion": "Descripción de prueba",
            "estado": "PUBLICO",
            "origen": "APPLE",
            "id_externo": "apple-ext-id-999",
        }
        response = self.client.post(ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["descripcion"], "Descripción de prueba")
        self.assertEqual(data["origen"], "APPLE")
        self.assertEqual(data["id_externo"], "apple-ext-id-999")

    def test_calendario_se_persiste_en_base_de_datos(self):
        """Verifica que el calendario queda guardado en BD tras la creación."""
        payload = {
            "creador_id": self.usuario.id,
            "nombre": "Persistencia Check",
        }
        response = self.client.post(ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Calendario.objects.filter(nombre="Persistencia Check").exists()
        )

    # ------------------------------------------------------------------
    # Casos de error — campos obligatorios
    # ------------------------------------------------------------------

    def test_error_sin_creador_id(self):
        """Devuelve 400 si falta el campo creador_id."""
        payload = {"nombre": "Sin Creador"}
        response = self.client.post(ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("El campo 'creador_id' es obligatorio.", response.json()["errors"])

    def test_error_sin_nombre(self):
        """Devuelve 400 si falta el campo nombre."""
        payload = {"creador_id": self.usuario.id}
        response = self.client.post(ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("El campo 'nombre' es obligatorio.", response.json()["errors"])

    def test_error_payload_vacio(self):
        """Devuelve 400 si el payload está completamente vacío."""
        response = self.client.post(ENDPOINT, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.json())

    # ------------------------------------------------------------------
    # Casos de error — usuario no existe
    # ------------------------------------------------------------------

    def test_error_creador_no_existe(self):
        """Devuelve 404 si el creador_id no corresponde a ningún usuario."""
        payload = {
            "creador_id": 99999,
            "nombre": "Calendario Fantasma",
        }
        response = self.client.post(ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("El usuario creador no existe.", response.json()["errors"])

    # ------------------------------------------------------------------
    # Casos de error — restricción de unicidad PRIVADO
    # ------------------------------------------------------------------

    def test_error_segundo_calendario_privado_mismo_usuario(self):
        """Devuelve 400 si el usuario intenta crear un segundo calendario PRIVADO."""
        # Primer calendario privado (OK)
        Calendario.objects.create(
            creador=self.usuario,
            nombre="Privado Original",
            estado="PRIVADO",
        )

        # Intento de segundo calendario privado
        payload = {
            "creador_id": self.usuario.id,
            "nombre": "Segundo Privado",
            "estado": "PRIVADO",
        }
        response = self.client.post(ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("El usuario ya tiene un calendario privado.", response.json()["errors"])

    def test_usuarios_distintos_pueden_tener_calendario_privado(self):
        """Dos usuarios diferentes pueden tener cada uno su calendario PRIVADO."""
        otro_usuario = Usuario.objects.create_user(
            username="otrouser",
            email="otro@example.com",
            password="pass123",
        )

        for usuario in [self.usuario, otro_usuario]:
            payload = {
                "creador_id": usuario.id,
                "nombre": "Mi Privado",
                "estado": "PRIVADO",
            }
            response = self.client.post(ENDPOINT, payload, format="json")
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # ------------------------------------------------------------------
    # Casos de error — valores inválidos
    # ------------------------------------------------------------------

    def test_error_estado_invalido(self):
        """Devuelve 400 si el estado no es un valor válido."""
        payload = {
            "creador_id": self.usuario.id,
            "nombre": "Cal Inválido",
            "estado": "SECRETO",
        }
        response = self.client.post(ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.json())

    def test_error_origen_invalido(self):
        """Devuelve 400 si el origen no es un valor válido."""
        payload = {
            "creador_id": self.usuario.id,
            "nombre": "Cal Origen Malo",
            "origen": "OUTLOOK",
        }
        response = self.client.post(ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.json())

    def test_error_nombre_demasiado_largo(self):
        """Devuelve 400 si el nombre supera los 100 caracteres permitidos."""
        payload = {
            "creador_id": self.usuario.id,
            "nombre": "A" * 101,
        }
        response = self.client.post(ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.json())

    # ------------------------------------------------------------------
    # Método HTTP incorrecto
    # ------------------------------------------------------------------

    def test_get_no_permitido(self):
        """Devuelve 405 Method Not Allowed al hacer GET al endpoint."""
        response = self.client.get(ENDPOINT)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class AsignarEventoCalendarioTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.url = '/api/eventos/asignar/'

        self.usuario = Usuario.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='password123'
        )
        self.calendario = Calendario.objects.create(
            nombre='Mi Calendario',
            creador=self.usuario,
            estado='PUBLICO'
        )
        self.evento = Evento.objects.create(
            titulo='Evento Test',
            fecha=datetime.date(2026, 6, 1),
            hora=datetime.time(10, 0),
            creador=self.usuario
        )

    def test_asignar_evento_exitoso(self):
        response = self.client.post(self.url, {
            'evento_id': self.evento.pk,
            'calendario_id': self.calendario.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('mensaje', response.data)
        self.assertTrue(self.evento.calendarios.filter(pk=self.calendario.pk).exists())

    def test_asignar_sin_evento_id(self):
        response = self.client.post(self.url, {
            'calendario_id': self.calendario.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_asignar_sin_calendario_id(self):
        response = self.client.post(self.url, {
            'evento_id': self.evento.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_asignar_evento_inexistente(self):
        response = self.client.post(self.url, {
            'evento_id': 99999,
            'calendario_id': self.calendario.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)

    def test_asignar_calendario_inexistente(self):
        response = self.client.post(self.url, {
            'evento_id': self.evento.pk,
            'calendario_id': 99999
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)

    def test_asignar_evento_ya_asignado(self):
        self.evento.calendarios.add(self.calendario)

        response = self.client.post(self.url, {
            'evento_id': self.evento.pk,
            'calendario_id': self.calendario.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)


class DesasignarEventoCalendarioTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.url = '/api/eventos/desasignar/'

        self.usuario = Usuario.objects.create_user(
            username='testuser2',
            email='test2@test.com',
            password='password123'
        )
        self.calendario = Calendario.objects.create(
            nombre='Mi Calendario 2',
            creador=self.usuario,
            estado='PUBLICO'
        )
        self.evento = Evento.objects.create(
            titulo='Evento Test 2',
            fecha=datetime.date(2026, 6, 1),
            hora=datetime.time(10, 0),
            creador=self.usuario
        )
        self.evento.calendarios.add(self.calendario)

    def test_desasignar_evento_exitoso(self):
        response = self.client.delete(self.url, {
            'evento_id': self.evento.pk,
            'calendario_id': self.calendario.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('mensaje', response.data)
        self.assertFalse(self.evento.calendarios.filter(pk=self.calendario.pk).exists())

    def test_desasignar_sin_evento_id(self):
        response = self.client.delete(self.url, {
            'calendario_id': self.calendario.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_desasignar_sin_calendario_id(self):
        response = self.client.delete(self.url, {
            'evento_id': self.evento.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_desasignar_evento_inexistente(self):
        response = self.client.delete(self.url, {
            'evento_id': 99999,
            'calendario_id': self.calendario.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)

    def test_desasignar_calendario_inexistente(self):
        response = self.client.delete(self.url, {
            'evento_id': self.evento.pk,
            'calendario_id': 99999
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)

    def test_desasignar_evento_no_asignado(self):
        otro_calendario = Calendario.objects.create(
            nombre='Otro Calendario',
            creador=self.usuario,
            estado='AMIGOS'
        )

        response = self.client.delete(self.url, {
            'evento_id': self.evento.pk,
            'calendario_id': otro_calendario.pk
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)


class EliminarCalendarioTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create users
        self.creador = Usuario.objects.create_user(username='creador', email='creador@test.com', password='pass1234')
        self.otro_usuario = Usuario.objects.create_user(username='otro', email='otro@test.com', password='pass1234')

        # Create calendar
        self.calendario = Calendario.objects.create(
            nombre='Calendario Test',
            descripcion='Descripción test',
            estado='PUBLICO',
            creador=self.creador
        )

    def test_eliminar_calendario_exitoso(self):
        """The creator can delete their own calendar"""
        self.client.force_authenticate(user=self.creador)
        response = self.client.delete(f'/api/v1/calendarios/{self.calendario.id}/eliminar/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Calendario.objects.filter(id=self.calendario.id).exists())

    def test_eliminar_calendario_sin_autenticar(self):
        """An unauthenticated user cannot delete a calendar"""
        response = self.client.delete(f'/api/v1/calendarios/{self.calendario.id}/eliminar/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_eliminar_calendario_sin_permiso(self):
        """A user who is not the creator cannot delete the calendar"""
        self.client.force_authenticate(user=self.otro_usuario)
        response = self.client.delete(f'/api/v1/calendarios/{self.calendario.id}/eliminar/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_eliminar_calendario_no_existe(self):
        """Returns 404 if the calendar does not exist"""
        self.client.force_authenticate(user=self.creador)
        response = self.client.delete('/api/v1/calendarios/9999/eliminar/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class EditarCalendarioTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create users
        self.creador = Usuario.objects.create_user(username='creador2', email='creador2@test.com', password='pass1234')
        self.otro_usuario = Usuario.objects.create_user(username='otro2', email='otro2@test.com', password='pass1234')

        # Create calendar
        self.calendario = Calendario.objects.create(
            nombre='Calendario Test',
            descripcion='Descripción test',
            estado='PUBLICO',
            creador=self.creador
        )

    def test_editar_calendario_put_exitoso(self):
        """The creator can edit their calendar with PUT"""
        self.client.force_authenticate(user=self.creador)
        response = self.client.put(f'/api/v1/calendarios/{self.calendario.id}/editar/', {
            'nombre': 'Nuevo nombre',
            'descripcion': 'Nueva descripción',
            'estado': 'PRIVADO'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nombre'], 'Nuevo nombre')
        self.assertEqual(response.data['estado'], 'PRIVADO')

    def test_editar_calendario_patch_exitoso(self):
        """The creator can partially edit their calendar with PATCH"""
        self.client.force_authenticate(user=self.creador)
        response = self.client.patch(f'/api/v1/calendarios/{self.calendario.id}/editar/', {
            'nombre': 'Solo cambio nombre'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nombre'], 'Solo cambio nombre')
        self.assertEqual(response.data['descripcion'], 'Descripción test')  # remains unchanged

    def test_editar_calendario_sin_autenticar(self):
        """An unauthenticated user cannot edit a calendar"""
        response = self.client.put(f'/api/v1/calendarios/{self.calendario.id}/editar/', {
            'nombre': 'Intento sin auth'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_editar_calendario_sin_permiso(self):
        """A user who is not the creator cannot edit the calendar"""
        self.client.force_authenticate(user=self.otro_usuario)
        response = self.client.put(f'/api/v1/calendarios/{self.calendario.id}/editar/', {
            'nombre': 'Intento sin permiso'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_editar_calendario_no_existe(self):
        """Returns 404 if the calendar does not exist"""
        self.client.force_authenticate(user=self.creador)
        response = self.client.put('/api/v1/calendarios/9999/editar/', {
            'nombre': 'No existe'
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
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

# ---------------------------------------------------------------------------
# List & search calendars tests
# ---------------------------------------------------------------------------

ENDPOINT_LIST_CALENDARIOS = "/api/v1/calendarios/list"


class ListCalendariosTests(TestCase):
    """Tests for GET /api/v1/calendarios/list (list_calendarios view)."""

    def setUp(self):
        self.client = APIClient()

        self.owner = Usuario.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="pass123",
        )
        self.other = Usuario.objects.create_user(
            username="other",
            email="other@example.com",
            password="pass123",
        )

        # Create a variety of calendars for filtering tests
        self.cal_privado = Calendario.objects.create(
            nombre="Private Events",
            descripcion="Private calendar",
            estado="PRIVADO",
            origen="CURRENT",
            creador=self.owner,
        )
        self.cal_amigos = Calendario.objects.create(
            nombre="Friends Events",
            descripcion="Friends calendar",
            estado="AMIGOS",
            origen="GOOGLE",
            creador=self.owner,
        )
        self.cal_publico = Calendario.objects.create(
            nombre="Public Events",
            descripcion="Public calendar",
            estado="PUBLICO",
            origen="APPLE",
            creador=self.other,
        )
        self.cal_publico2 = Calendario.objects.create(
            nombre="Open Events",
            descripcion="Another public calendar",
            estado="PUBLICO",
            origen="CURRENT",
            creador=self.other,
        )

    # ------------------------------------------------------------------
    # Basic listing
    # ------------------------------------------------------------------

    def test_list_all_calendars_returns_200(self):
        """GET without filters returns 200 and all calendars."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_all_calendars_returns_all_records(self):
        """All created calendars (setUp + extra) are returned without truncation."""
        # Create 4 additional calendars explicitly inside this test
        for i in range(4):
            Calendario.objects.create(
                nombre=f"Extra Calendar {i}",
                estado="PUBLICO",
                creador=self.owner,
            )
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # setUp already created 4 calendars; we added 4 more → must be > 4
        self.assertGreater(len(response.json()), 4)

    def test_response_contains_expected_fields(self):
        """Each item in the response has the expected fields."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS)
        item = response.json()[0]
        for field in ("id", "nombre", "descripcion", "estado", "origen", "creador_id", "creador_username", "fecha_creacion"):
            self.assertIn(field, item)

    def test_results_ordered_by_fecha_creacion_newest_first(self):
        """Results are ordered newest-first."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS)
        ids = [item["id"] for item in response.json()]
        # The last-created calendar should appear first
        self.assertEqual(ids[0], self.cal_publico2.id)

    # ------------------------------------------------------------------
    # Name search (q parameter)
    # ------------------------------------------------------------------

    def test_search_by_name_returns_matching_calendars(self):
        """q parameter filters calendars by name substring (case-insensitive)."""
        # 'Friends' only appears in 'Friends Events', so exactly 1 match expected
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"q": "Friends"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["nombre"] for item in response.json()]
        self.assertIn("Friends Events", names)
        self.assertNotIn("Private Events", names)
        self.assertNotIn("Public Events", names)
        self.assertNotIn("Open Events", names)

    def test_search_is_case_insensitive(self):
        """Name search is case-insensitive."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"q": "PRIVATE"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["nombre"], "Private Events")

    def test_search_with_no_matches_returns_empty_list(self):
        """q parameter that matches nothing returns an empty list, not an error."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"q": "zzznomatch"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), [])

    def test_search_with_empty_q_returns_all(self):
        """An empty q string is ignored and all calendars are returned."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"q": ""})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 4)

    # ------------------------------------------------------------------
    # Status filter (estado parameter)
    # ------------------------------------------------------------------

    def test_filter_by_estado_publico(self):
        """estado=PUBLICO returns only public calendars."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"estado": "PUBLICO"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 2)
        for item in data:
            self.assertEqual(item["estado"], "PUBLICO")

    def test_filter_by_estado_privado(self):
        """estado=PRIVADO returns only private calendars."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"estado": "PRIVADO"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["estado"], "PRIVADO")

    def test_filter_by_estado_amigos(self):
        """estado=AMIGOS returns only friends calendars."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"estado": "AMIGOS"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["estado"], "AMIGOS")

    def test_filter_by_estado_case_insensitive(self):
        """estado filter is case-insensitive (lowercase is accepted)."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"estado": "publico"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 2)

    def test_invalid_estado_returns_400(self):
        """An unrecognised estado value returns 400 Bad Request."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"estado": "SECRETO"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.json())

    # ------------------------------------------------------------------
    # Combined filters
    # ------------------------------------------------------------------

    def test_combined_q_and_estado_filter(self):
        """q and estado can be combined to narrow results."""
        # 'Public' only appears in 'Public Events', which is also PUBLICO → exactly 1
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"q": "Public Events", "estado": "PUBLICO"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["nombre"], "Public Events")

    def test_combined_filters_no_match_returns_empty(self):
        """Combined filters that match nothing return an empty list."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"q": "Private", "estado": "PUBLICO"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), [])

    # ------------------------------------------------------------------
    # HTTP method enforcement
    # ------------------------------------------------------------------

    def test_post_not_allowed(self):
        """POST to list endpoint returns 405 Method Not Allowed."""
        response = self.client.post(ENDPOINT_LIST_CALENDARIOS, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_creador_username_matches_actual_user(self):
        """The creador_username in the response matches the creator's username."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"estado": "PRIVADO"})
        self.assertEqual(response.json()[0]["creador_username"], self.owner.username)

class PublishCalendarTests(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.user = Usuario.objects.create_user(
            username="caluser",
            email="cal@example.com",
            password="testpass123",
        )

        self.private_calendar = Calendario.objects.create(
            creador=self.user,
            nombre="Calendario Privado",
            estado="PRIVADO",
        )

        self.friends_calendar = Calendario.objects.create(
            creador=self.user,
            nombre="Calendario Amigos",
            estado="AMIGOS",
        )

        self.public_calendar = Calendario.objects.create(
            creador=self.user,
            nombre="Calendario Publico",
            estado="PUBLICO",
        )

    def endpoint(self, calendario_id=None):
        return PUBLISH_CALENDAR_ENDPOINT.format(
            calendario_id or self.private_calendar.id
        )

    # ── Success cases ──

    def test_publish_private_calendar(self):
        response = self.client.put(self.endpoint())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.private_calendar.refresh_from_db()
        self.assertEqual(self.private_calendar.estado, "PUBLICO")

    def test_publish_friends_calendar(self):
        response = self.client.put(
            self.endpoint(self.friends_calendar.id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.friends_calendar.refresh_from_db()
        self.assertEqual(self.friends_calendar.estado, "PUBLICO")

    def test_response_contains_expected_keys(self):
        response = self.client.put(self.endpoint())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected_keys = {
            "id", "nombre", "descripcion", "estado",
            "origen", "creador", "fecha_creacion",
        }
        self.assertEqual(set(response.data.keys()), expected_keys)

    def test_response_estado_is_publico(self):
        response = self.client.put(self.endpoint())
        self.assertEqual(response.data["estado"], "PUBLICO")

    # ── Error cases ──

    def test_calendar_not_found(self):
        response = self.client.put(self.endpoint(calendario_id=9999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_already_public(self):
        response = self.client.put(
            self.endpoint(self.public_calendar.id)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_get_not_allowed(self):
        response = self.client.get(self.endpoint())
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_post_not_allowed(self):
        response = self.client.post(self.endpoint())
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class RadarEventosTest(APITestCase):

    def setUp(self):
        self.user = Usuario.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="password123"
        )

        self.calendar = Calendario.objects.create(
            nombre="Calendario Público",
            estado="PUBLICO",
            creador=self.user
        )

        self.hoy = timezone.now().date()
        self.evento_cercano = Evento.objects.create(
            titulo="Evento Cercano",
            fecha=self.hoy + timedelta(days=1),
            hora="12:00:00",
            ubicacion=Point(-3.7038, 40.4168),
            creador=self.user
        )
        self.evento_cercano.calendarios.add(self.calendar)
        self.evento_lejano = Evento.objects.create(
            titulo="Evento Lejano",
            fecha=self.hoy + timedelta(days=1),
            hora="12:00:00",
            ubicacion=Point(2.1734, 41.3851),
            creador=self.user
        )
        self.evento_lejano.calendarios.add(self.calendar)
        self.evento_pasado = Evento.objects.create(
            titulo="Evento Pasado",
            fecha=self.hoy - timedelta(days=1),
            hora="12:00:00",
            ubicacion=Point(-3.7038, 40.4168),
            creador=self.user
        )
        self.evento_pasado.calendarios.add(self.calendar)

    def test_error_sin_lat_lon(self):
        response = self.client.get("/api/v1/radar/")
        self.assertEqual(response.status_code, 400)

    def test_error_lat_lon_invalidos(self):
        response = self.client.get("/api/v1/radar/?lat=abc&lon=xyz")
        self.assertEqual(response.status_code, 400)

    def test_devuelve_evento_dentro_del_radio(self):
        response = self.client.get(
            "/api/radar/?lat=40.4168&lon=-3.7038&radio=10"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["titulo"], "Evento Cercano")

    def test_no_devuelve_evento_fuera_del_radio(self):
        response = self.client.get(
            "/api/v1/radar/?lat=40.4168&lon=-3.7038&radio=1"
        )
        titulos = [e["titulo"] for e in response.data]
        self.assertNotIn("Evento Lejano", titulos)

    def test_no_devuelve_eventos_pasados(self):
        response = self.client.get(
            "/api/v1/radar/?lat=40.4168&lon=-3.7038&radio=10"
        )
        titulos = [e["titulo"] for e in response.data]
        self.assertNotIn("Evento Pasado", titulos)

    def test_ordenado_por_distancia(self):
        response = self.client.get(
            "/api/v1/radar/?lat=40.4168&lon=-3.7038&radio=1000"
        )
        self.assertEqual(response.status_code, 200)
        self.assertGreater(len(response.data), 1)

        distancias = [e["distancia_km"] for e in response.data]
        self.assertEqual(distancias, sorted(distancias))

class RadarMultipleEventsTest(APITestCase):

    def setUp(self):
        self.user = Usuario.objects.create_user(
            username="multiuser",
            email="multi@test.com",
            password="password123"
        )

        self.calendar = Calendario.objects.create(
            nombre="Calendario Público",
            estado="PUBLICO",
            creador=self.user
        )

        self.lat = 40.4168
        self.lon = -3.7038
        self.hoy = timezone.now().date()

        for i in range(3):
            evento = Evento.objects.create(
                titulo=f"Evento {i+1}",
                fecha=self.hoy + timedelta(days=1),
                hora="12:00:00",
                ubicacion=Point(self.lon + (i * 0.001), self.lat + (i * 0.001)),
                creador=self.user
            )
            evento.calendarios.add(self.calendar)

    def test_radar_returns_multiple_events(self):
        response = self.client.get(
            "/api/v1/radar/?lat=40.4168&lon=-3.7038&radio=1000"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 3)