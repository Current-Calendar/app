from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from main.models import Usuario, Calendario


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
