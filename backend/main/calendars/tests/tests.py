from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.test import TestCase
from ..models import Usuario, Calendario

CALENDAR_ENDPOINT = "/api/v1/calendarios"
PUBLISH_CALENDAR_ENDPOINT = "/api/v1/calendarios/{}/publicar"
ENDPOINT_LIST_CALENDARIOS = "/api/v1/calendarios/list"

class CrearCalendarioTests(APITestCase):
    """Tests para POST /api/v1/calendarios"""

    def setUp(self):
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
        self.client.force_authenticate(self.usuario)

        payload = {
            "nombre": "Calendario Privado",
        }
        response = self.client.post(CALENDAR_ENDPOINT, payload, format="json")

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
        self.client.force_authenticate(self.usuario)

        payload = {
            "nombre": "Calendario Público",
            "estado": "PUBLICO",
            "descripcion": "Un calendario para todos",
        }
        response = self.client.post(CALENDAR_ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["estado"], "PUBLICO")
        self.assertEqual(data["descripcion"], "Un calendario para todos")

    def test_crear_calendario_amigos_exitoso(self):
        """Crea un calendario con estado AMIGOS correctamente."""
        self.client.force_authenticate(self.usuario)

        payload = {
            "nombre": "Calendario Amigos",
            "estado": "AMIGOS",
        }
        response = self.client.post(CALENDAR_ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["estado"], "AMIGOS")

    def test_crear_calendario_con_origen_google(self):
        """Crea un calendario importado de Google Calendar."""
        self.client.force_authenticate(self.usuario)

        payload = {
            "nombre": "Google Cal",
            "origen": "GOOGLE",
            "id_externo": "abc123@google.com",
        }
        response = self.client.post(CALENDAR_ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["origen"], "GOOGLE")
        self.assertEqual(data["id_externo"], "abc123@google.com")

    def test_crear_calendario_con_todos_los_campos_opcionales(self):
        """Crea un calendario especificando todos los campos."""
        self.client.force_authenticate(self.usuario)

        payload = {
            "nombre": "Calendario Completo",
            "descripcion": "Descripción de prueba",
            "estado": "PUBLICO",
            "origen": "APPLE",
            "id_externo": "apple-ext-id-999",
        }
        response = self.client.post(CALENDAR_ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["descripcion"], "Descripción de prueba")
        self.assertEqual(data["origen"], "APPLE")
        self.assertEqual(data["id_externo"], "apple-ext-id-999")

    def test_calendario_se_persiste_en_base_de_datos(self):
        """Verifica que el calendario queda guardado en BD tras la creación."""
        self.client.force_authenticate(self.usuario)

        payload = {
            "nombre": "Persistencia Check",
        }
        response = self.client.post(CALENDAR_ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Calendario.objects.filter(nombre="Persistencia Check").exists()
        )

    # ------------------------------------------------------------------
    # Casos de error — campos obligatorios
    # ------------------------------------------------------------------

    def test_error_sin_nombre(self):
        """Devuelve 400 si falta el campo nombre."""
        self.client.force_authenticate(self.usuario)

        payload = {}
        response = self.client.post(CALENDAR_ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("El campo 'nombre' es obligatorio.", response.json()["errors"])

    # ------------------------------------------------------------------
    # Casos de error — restricción de unicidad PRIVADO
    # ------------------------------------------------------------------

    def test_error_segundo_calendario_privado_mismo_usuario(self):
        """Devuelve 400 si el usuario intenta crear un segundo calendario PRIVADO."""
        self.client.force_authenticate(self.usuario)

        # Primer calendario privado (OK)
        Calendario.objects.create(
            creador=self.usuario,
            nombre="Privado Original",
            estado="PRIVADO",
        )

        # Intento de segundo calendario privado
        payload = {
            "nombre": "Segundo Privado",
            "estado": "PRIVADO",
        }
        response = self.client.post(CALENDAR_ENDPOINT, payload, format="json")

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
            self.client.force_authenticate(usuario)

            payload = {
                "nombre": "Mi Privado",
                "estado": "PRIVADO",
            }
            response = self.client.post(CALENDAR_ENDPOINT, payload, format="json")
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # ------------------------------------------------------------------
    # Casos de error — valores inválidos
    # ------------------------------------------------------------------

    def test_error_estado_invalido(self):
        """Devuelve 400 si el estado no es un valor válido."""
        self.client.force_authenticate(self.usuario)

        payload = {
            "nombre": "Cal Inválido",
            "estado": "SECRETO",
        }
        response = self.client.post(CALENDAR_ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.json())

    def test_error_origen_invalido(self):
        """Devuelve 400 si el origen no es un valor válido."""
        self.client.force_authenticate(self.usuario)

        payload = {
            "nombre": "Cal Origen Malo",
            "origen": "OUTLOOK",
        }
        response = self.client.post(CALENDAR_ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.json())

    def test_error_nombre_demasiado_largo(self):
        """Devuelve 400 si el nombre supera los 100 caracteres permitidos."""
        self.client.force_authenticate(self.usuario)

        payload = {
            "nombre": "A" * 101,
        }
        response = self.client.post(CALENDAR_ENDPOINT, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.json())

    # ------------------------------------------------------------------
    # Método HTTP incorrecto
    # ------------------------------------------------------------------

    def test_get_no_permitido(self):
        """Devuelve 405 Method Not Allowed al hacer GET al endpoint."""
        self.client.force_authenticate(self.usuario)

        response = self.client.get(CALENDAR_ENDPOINT)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        

class EliminarCalendarioTestCase(APITestCase):
    def setUp(self):
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

# ---------------------------------------------------------------------------
# List & search calendars tests
# ---------------------------------------------------------------------------

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
        

class PublishCalendarTests(APITestCase):

    def setUp(self):
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
        self.client.force_authenticate(self.user)

        response = self.client.put(self.endpoint())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.private_calendar.refresh_from_db()
        self.assertEqual(self.private_calendar.estado, "PUBLICO")

    def test_publish_friends_calendar(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(self.friends_calendar.id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.friends_calendar.refresh_from_db()
        self.assertEqual(self.friends_calendar.estado, "PUBLICO")

    def test_response_contains_expected_keys(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(self.endpoint())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected_keys = {
            "id", "nombre", "descripcion", "estado",
            "origen", "creador", "fecha_creacion",
        }
        self.assertEqual(set(response.data.keys()), expected_keys)

    def test_response_estado_is_publico(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(self.endpoint())
        self.assertEqual(response.data["estado"], "PUBLICO")

    # ── Error cases ──

    def test_calendar_not_found(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(self.endpoint(calendario_id=9999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_already_public(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(self.public_calendar.id)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_get_not_allowed(self):
        self.client.force_authenticate(self.user)

        response = self.client.get(self.endpoint())
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_post_not_allowed(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(self.endpoint())
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)