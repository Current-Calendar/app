import json

from django.contrib.auth.hashers import identify_hasher, check_password
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from main.models import Usuario, Calendario

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
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from main.models import Usuario, Calendario, Evento
import datetime


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
            hora=datetime.time(10, 0)
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
            hora=datetime.time(10, 0)
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