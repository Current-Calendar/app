from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.test import TestCase
from main.models import User, Calendar, CalendarLike, Notification
from django.core.files.uploadedfile import SimpleUploadedFile
from unittest.mock import patch, MagicMock

CALENDAR_ENDPOINT_CREATE = "/api/v1/calendars/create/"
PUBLISH_CALENDAR_ENDPOINT = "/api/v1/calendars/{}/publish/"
ENDPOINT_LIST_CALENDARIOS = "/api/v1/calendars/list/"
CALENDAR_SUBSCRIBE_ENDPOINT = "/api/v1/calendars/{}/subscribe/"

class CrearCalendarTests(APITestCase):
    """Tests para POST /api/v1/calendars"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            plan ="FREE"
        )
        self.standard_user = User.objects.create_user(
            username="standarduser",
            email="standard@example.com",
            password="standardpass123",
            plan="STANDARD"
        )


    # ------------------------------------------------------------------
    # Casos exitosos
    # ------------------------------------------------------------------

    def test_crear_calendario_privado_exitoso(self):
        """Crea un calendar PRIVATE (valor por defecto) correctamente."""
        self.client.force_authenticate(self.user)

        payload = {
            "name": "Calendar Private",
        }
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["name"], "Calendar Private")
        self.assertEqual(data["privacy"], "PRIVATE")
        self.assertEqual(data["origin"], "CURRENT")
        self.assertEqual(data["creator_id"], self.user.id)
        self.assertEqual(data["description"], "")
        self.assertIsNone(data["external_id"])
        self.assertIn("id", data)
        self.assertIn("created_at", data)

    def test_crear_calendario_publico_exitoso(self):
        """Crea un calendar con privacy PUBLIC correctamente."""
        self.client.force_authenticate(self.user)

        payload = {
            "name": "Calendar Público",
            "privacy": "PUBLIC",
            "description": "Un calendar para todos",
        }
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["privacy"], "PUBLIC")
        self.assertEqual(data["description"], "Un calendar para todos")

    def test_crear_calendario_friends_devuelve_400(self):
        """FRIENDS ya no es un valor de privacy aceptado."""
        self.client.force_authenticate(self.user)

        payload = {
            "name": "Calendar FRIENDS",
            "privacy": "FRIENDS",
        }
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.json())

    def test_crear_calendario_con_origin_google(self):
        """Crea un calendar importado de Google Calendar."""
        self.client.force_authenticate(self.user)

        payload = {
            "name": "Google Cal",
            "origin": "GOOGLE",
            "external_id": "abc123@google.com",
        }
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["origin"], "GOOGLE")
        self.assertEqual(data["external_id"], "abc123@google.com")

    def test_crear_calendario_con_todos_los_campos_opcionales(self):
        """Crea un calendar especificando todos los campos."""
        self.client.force_authenticate(self.user)

        payload = {
            "name": "Calendar Completo",
            "description": "Descripción de prueba",
            "privacy": "PUBLIC",
            "origin": "APPLE",
            "external_id": "apple-ext-id-999",
        }
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["description"], "Descripción de prueba")
        self.assertEqual(data["origin"], "APPLE")
        self.assertEqual(data["external_id"], "apple-ext-id-999")

    def test_calendario_se_persiste_en_base_de_datos(self):
        """Verifica que el calendar queda guardado en BD tras la creación."""
        self.client.force_authenticate(self.user)

        payload = {
            "name": "Persistencia Check",
        }
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Calendar.objects.filter(name="Persistencia Check").exists()
        )

    # ------------------------------------------------------------------
    # Casos de error — campos obligatorios
    # ------------------------------------------------------------------

    def test_error_sin_name(self):
        """Devuelve 400 si falta el campo name."""
        self.client.force_authenticate(self.user)

        payload = {}
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("El campo 'name' es obligatorio y no puede estar vacío.", response.json()["errors"])

    # ------------------------------------------------------------------
    # Casos exitosos adicionales
    # ------------------------------------------------------------------

    def test_segundo_calendario_privado_mismo_user_exitoso(self):
        """Permite crear más de un calendar PRIVADO para el mismo user."""
        self.client.force_authenticate(self.user)

        # Primer calendar privado (OK)
        Calendar.objects.create(
            creator=self.user,
            name="Private Original",
            privacy="PRIVATE",
        )

        # Intento de segundo calendar privado
        payload = {
            "name": "Segundo Private",
            "privacy": "PRIVATE",
        }
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_users_distintos_pueden_tener_calendario_privado(self):
        """Dos users diferentes pueden tener cada uno su calendar PRIVADO."""
        otro_user = User.objects.create_user(
            username="otrouser",
            email="otro@example.com",
            password="pass123",
        )

        for user in [self.user, otro_user]:
            self.client.force_authenticate(user)

            payload = {
                "name": "Mi Private",
                "privacy": "PRIVATE",
            }
            response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_create_more_than_limit_private_calendars_standard_user(self):
        self.client.force_authenticate(self.standard_user)

        for i in range(2):
            Calendar.objects.create(
                creator=self.standard_user,
                name=f"Calendar {i}",
                privacy="PRIVATE",
            )

        payload = {
            "name": "Calendar Extra",
            "privacy": "PRIVATE",
        }
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_create_more_than_limit_public_calendars_standard_user(self):
        self.client.force_authenticate(self.standard_user)

        for i in range(2):
            Calendar.objects.create(
                creator=self.standard_user,
                name=f"Calendar {i}",
                privacy="PUBLIC",
            )

        payload = {
            "name": "Calendar Extra",
            "privacy": "PUBLIC",
        }
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_more_than_limit_public_calendars_free_user(self):
        self.client.force_authenticate(self.user)

        for i in range(2):
            Calendar.objects.create(
                creator=self.user,
                name=f"Calendar {i}",
                privacy="PUBLIC",
            )

        payload = {
            "name": "Calendar Extra",
            "privacy": "PUBLIC",
        }
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_subscribe_more_than_limit_calendars(self):
        self.client.force_authenticate(self.user)

        for i in range(10):
            cal = Calendar.objects.create(
                creator=self.standard_user,
                name=f"Calendar {i}",
                privacy="PUBLIC",
            )
            self.user.subscribed_calendars.add(cal)

        cal_extra = Calendar.objects.create(
                creator=self.standard_user,
                name=f"Calendar Extra",
                privacy="PUBLIC",
            )

        response = self.client.post(CALENDAR_SUBSCRIBE_ENDPOINT.format(cal_extra.id), format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ------------------------------------------------------------------
    # Casos de error — valores inválidos
    # ------------------------------------------------------------------

    def test_error_privacy_invalido(self):
        """Devuelve 400 si el privacy no es un valor válido."""
        self.client.force_authenticate(self.user)

        payload = {
            "name": "Cal Inválido",
            "privacy": "SECRETO",
        }
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.json())

    def test_error_origin_invalido(self):
        """Devuelve 400 si el origin no es un valor válido."""
        self.client.force_authenticate(self.user)

        payload = {
            "name": "Cal Origen Malo",
            "origin": "OUTLOOK",
        }
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.json())

    def test_error_name_demasiado_largo(self):
        """Devuelve 400 si el name supera los 100 caracteres permitidos."""
        self.client.force_authenticate(self.user)

        payload = {
            "name": "A" * 101,
        }
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.json())

    # ------------------------------------------------------------------
    # Método HTTP incorrecto
    # ------------------------------------------------------------------

    def test_get_no_permitido(self):
        """Devuelve 405 Method Not Allowed al hacer GET al endpoint."""
        self.client.force_authenticate(self.user)

        response = self.client.get(CALENDAR_ENDPOINT_CREATE)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    #mas casos
    def test_error_name_solo_espacios(self):
        self.client.force_authenticate(self.user)
        payload = {
            "name": "   "
        }
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("no puede estar vacío", response.json()["errors"][0])

    def test_error_description_no_es_string(self):
        self.client.force_authenticate(self.user)
        payload = {
            "name": "Calendar válido",
            "description": 123
        }
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("description", response.json()["errors"][0])

    def test_error_privacy_valor_no_permitido(self):
        self.client.force_authenticate(self.user)
        payload = {
            "name": "Calendar test",
            "privacy": "INVALIDO"
        }
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("privacy", response.json()["errors"][0])

    def test_error_origin_valor_no_permitido(self):
        self.client.force_authenticate(self.user)
        payload = {
            "name": "Calendar test",
            "origin": "INVALIDO"
        }
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("origin", response.json()["errors"][0])
    
    def test_error_more_than_limit_calendar(self):
        self.client.force_authenticate(self.user)

        # Creamos 2 calendars (límite para FREE)
        for i in range(2):
            Calendar.objects.create(
                creator=self.user,
                name=f"Calendar {i}",
                privacy="PRIVATE",
            )

        payload = {
            "name": "Private Original",
            "privacy": "PRIVATE"
        }
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    

    def test_name_se_trimea_correctamente(self):
        self.client.force_authenticate(self.user)
        payload = {
            "name": "   Calendar limpio   "
        }
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["name"], "Calendar limpio")
            

class EliminarCalendarTestCase(APITestCase):
    def setUp(self):
        # Create users
        self.creator = User.objects.create_user(username='creator', email='creator@test.com', password='pass1234')
        self.otro_user = User.objects.create_user(username='otro', email='otro@test.com', password='pass1234')

        # Create calendar
        self.calendar = Calendar.objects.create(
            name='Calendar Test',
            description='Descripción test',
            privacy='PUBLIC',
            creator=self.creator
        )

    def test_eliminar_calendario_exitoso(self):
        """The creator can delete their own calendar"""
        self.client.force_authenticate(user=self.creator)
        response = self.client.delete(f'/api/v1/calendars/{self.calendar.id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Calendar.objects.filter(id=self.calendar.id).exists())

    def test_eliminar_calendario_sin_autenticar(self):
        """An unauthenticated user cannot delete a calendar"""
        response = self.client.delete(f'/api/v1/calendars/{self.calendar.id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_eliminar_calendario_sin_permiso(self):
        """A user who is not the creator cannot delete the calendar"""
        self.client.force_authenticate(user=self.otro_user)
        response = self.client.delete(f'/api/v1/calendars/{self.calendar.id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_eliminar_calendario_no_existe(self):
        """Returns 404 if the calendar does not exist"""
        self.client.force_authenticate(user=self.creator)
        response = self.client.delete('/api/v1/calendars/9999/delete/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class EditarCalendarTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create users
        self.creator = User.objects.create_user(username='creator2', email='creator2@test.com', password='pass1234')
        self.otro_user = User.objects.create_user(username='otro2', email='otro2@test.com', password='pass1234')

        # Create calendar
        self.calendar = Calendar.objects.create(
            name='Calendar Test',
            description='Descripción test',
            privacy='PUBLIC',
            creator=self.creator
        )

    def test_editar_calendario_put_exitoso(self):
        """The creator can edit their calendar with PUT"""
        self.client.force_authenticate(user=self.creator)
        response = self.client.put(f'/api/v1/calendars/{self.calendar.id}/edit/', {
            'name': 'Nuevo name',
            'description': 'Nueva descripción',
            'privacy': 'PRIVATE'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Nuevo name')
        self.assertEqual(response.data['privacy'], 'PRIVATE')

    def test_editar_calendario_patch_exitoso(self):
        """The creator can partially edit their calendar with PATCH"""
        self.client.force_authenticate(user=self.creator)
        response = self.client.patch(f'/api/v1/calendars/{self.calendar.id}/edit/', {
            'name': 'Solo cambio name'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Solo cambio name')
        self.assertEqual(response.data['description'], 'Descripción test')  # remains unchanged

    def test_editar_calendario_sin_autenticar(self):
        """An unauthenticated user cannot edit a calendar"""
        response = self.client.put(f'/api/v1/calendars/{self.calendar.id}/edit/', {
            'name': 'Intento sin auth'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_editar_calendario_sin_permiso(self):
        """A user who is not the creator cannot edit the calendar"""
        self.client.force_authenticate(user=self.otro_user)
        response = self.client.put(f'/api/v1/calendars/{self.calendar.id}/edit/', {
            'name': 'Intento sin permiso'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_editar_calendario_no_existe(self):
        """Returns 404 if the calendar does not exist"""
        self.client.force_authenticate(user=self.creator)
        response = self.client.put('/api/v1/calendars/9999/edit/', {
            'name': 'No existe'
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

# ---------------------------------------------------------------------------
# List & search calendars tests
# ---------------------------------------------------------------------------

class ListCalendarsTests(TestCase):
    """Tests for GET /api/v1/calendars/list (list_calendarios view)."""

    def setUp(self):
        self.client = APIClient()

        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="pass123",
        )
        self.other = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="pass123",
        )

        # Create a variety of calendars for filtering tests
        self.cal_privado = Calendar.objects.create(
            name="Private Events",
            description="Private calendar",
            privacy="PRIVATE",
            origin="CURRENT",
            creator=self.owner,
        )
        self.cal_amigos = Calendar.objects.create(
            name="Secondary Private Events",
            description="Secondary private calendar",
            privacy="PRIVATE",
            origin="GOOGLE",
            creator=self.owner,
        )
        self.cal_publico = Calendar.objects.create(
            name="Public Events",
            description="Public calendar",
            privacy="PUBLIC",
            origin="APPLE",
            creator=self.other,
        )
        self.cal_publico2 = Calendar.objects.create(
            name="Open Events",
            description="Another public calendar",
            privacy="PUBLIC",
            origin="CURRENT",
            creator=self.other,
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
            Calendar.objects.create(
                name=f"Extra Calendar {i}",
                privacy="PUBLIC",
                creator=self.owner,
            )
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # setUp already created 4 calendars; we added 4 more → must be > 4
        self.assertGreater(len(response.json()), 4)

    def test_response_contains_expected_fields(self):
        """Each item in the response has the expected fields."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS)
        item = response.json()[0]
        for field in ("id", "name", "description", "privacy", "origin", "creator_id", "creator_username", "created_at"):
            self.assertIn(field, item)

    def test_results_ordered_by_created_at_newest_first(self):
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
        # 'Secondary' only appears in 'Secondary Private Events', so exactly 1 match expected
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"q": "Secondary"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.json()]
        self.assertIn("Secondary Private Events", names)
        self.assertNotIn("Private Events", names)
        self.assertNotIn("Public Events", names)
        self.assertNotIn("Open Events", names)

    def test_search_is_case_insensitive(self):
        """Name search is case-insensitive."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"q": "PRIVATE"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.json()]
        self.assertEqual(len(names), 2)
        self.assertIn("Private Events", names)
        self.assertIn("Secondary Private Events", names)

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
    # Status filter (privacy parameter)
    # ------------------------------------------------------------------

    def test_filter_by_privacy_publico(self):
        """privacy=PUBLIC returns only public calendars."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"privacy": "PUBLIC"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 2)
        for item in data:
            self.assertEqual(item["privacy"], "PUBLIC")

    def test_filter_by_privacy_privado(self):
        """privacy=PRIVATE returns only private calendars."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"privacy": "PRIVATE"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 2)
        for item in data:
            self.assertEqual(item["privacy"], "PRIVATE")

    def test_filter_by_privacy_friends_devuelve_400(self):
        """privacy=FRIENDS is no longer accepted."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"privacy": "FRIENDS"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.json())

    def test_filter_by_privacy_case_insensitive(self):
        """privacy filter is case-insensitive (lowercase is accepted)."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"privacy": "public"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 2)

    def test_invalid_privacy_returns_400(self):
        """An unrecognised privacy value returns 400 Bad Request."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"privacy": "SECRETO"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.json())

    # ------------------------------------------------------------------
    # Combined filters
    # ------------------------------------------------------------------

    def test_combined_q_and_privacy_filter(self):
        """q and privacy can be combined to narrow results."""
        # 'Public' only appears in 'Public Events', which is also PUBLIC → exactly 1
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"q": "Public Events", "privacy": "PUBLIC"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "Public Events")

    def test_combined_filters_no_match_returns_empty(self):
        """Combined filters that match nothing return an empty list."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"q": "Private", "privacy": "PUBLIC"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), [])

    # ------------------------------------------------------------------
    # HTTP method enforcement
    # ------------------------------------------------------------------

    def test_post_not_allowed(self):
        """POST to list endpoint returns 405 Method Not Allowed."""
        response = self.client.post(ENDPOINT_LIST_CALENDARIOS, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_creator_username_matches_actual_user(self):
        """The creator_username in the response matches the creator's username."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"privacy": "PRIVATE"})
        self.assertEqual(response.json()[0]["creator_username"], self.owner.username)
        

class PublishCalendarTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="caluser",
            email="cal@example.com",
            password="testpass123",
        )

        self.private_calendar = Calendar.objects.create(
            creator=self.user,
            name="Calendar Private",
            privacy="PRIVATE",
        )

        self.secondary_private_calendar = Calendar.objects.create(
            creator=self.user,
            name="Calendar Secondary Private",
            privacy="PRIVATE",
        )

        self.public_calendar = Calendar.objects.create(
            creator=self.user,
            name="Calendar Public",
            privacy="PUBLIC",
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
        self.assertEqual(self.private_calendar.privacy, "PUBLIC")

    def test_publish_secondary_private_calendar(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(self.secondary_private_calendar.id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.secondary_private_calendar.refresh_from_db()
        self.assertEqual(self.secondary_private_calendar.privacy, "PUBLIC")

    def test_response_contains_expected_keys(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(self.endpoint())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected_keys = {
            "id", "name", "description", "privacy",
            "origin", "creator", "created_at",
        }
        self.assertEqual(set(response.data.keys()), expected_keys)

    def test_response_privacy_is_publico(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(self.endpoint())
        self.assertEqual(response.data["privacy"], "PUBLIC")

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


class CalendarLikesTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner_like",
            email="owner_like@example.com",
            password="pass1234",
        )
        self.liker = User.objects.create_user(
            username="liker",
            email="liker@example.com",
            password="pass1234",
        )
        self.calendar = Calendar.objects.create(
            name="Public calendar",
            privacy="PUBLIC",
            creator=self.owner,
        )

    def test_like_toggle_updates_counter(self):
        self.client.force_authenticate(user=self.liker)

        response = self.client.post(f"/api/v1/calendars/{self.calendar.id}/like/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["liked"])
        self.assertEqual(response.data["likes_count"], 1)
        self.calendar.refresh_from_db()
        self.assertEqual(self.calendar.likes_count, 1)
        self.assertTrue(
            CalendarLike.objects.filter(user=self.liker, calendar=self.calendar).exists()
        )

        response = self.client.post(f"/api/v1/calendars/{self.calendar.id}/like/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["liked"])
        self.assertEqual(response.data["likes_count"], 0)
        self.calendar.refresh_from_db()
        self.assertEqual(self.calendar.likes_count, 0)

    def test_like_is_auto_removed_after_losing_access(self):
        CalendarLike.objects.create(user=self.liker, calendar=self.calendar)
        self.calendar.refresh_from_db()
        self.assertEqual(self.calendar.likes_count, 1)

        self.calendar.privacy = "PRIVATE"
        self.calendar.save(update_fields=["privacy"])

        self.client.force_authenticate(user=self.liker)
        response = self.client.post(f"/api/v1/calendars/{self.calendar.id}/like/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.calendar.refresh_from_db()
        self.assertEqual(self.calendar.likes_count, 0)
        self.assertFalse(
            CalendarLike.objects.filter(user=self.liker, calendar=self.calendar).exists()
        )

    def test_list_calendars_includes_like_state(self):
        CalendarLike.objects.create(user=self.liker, calendar=self.calendar)

        self.client.force_authenticate(user=self.liker)
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = next(cal for cal in response.json() if cal["id"] == self.calendar.id)
        self.assertTrue(item["liked_by_me"])
        self.assertEqual(item["likes_count"], 1)

    def test_privacy_change_to_private_cleans_non_creator_likes(self):
        another_user = User.objects.create_user(
            username="another_liker",
            email="another_liker@example.com",
            password="pass1234",
        )
        CalendarLike.objects.create(user=self.liker, calendar=self.calendar)
        CalendarLike.objects.create(user=another_user, calendar=self.calendar)
        CalendarLike.objects.create(user=self.owner, calendar=self.calendar)

        self.calendar.privacy = "PRIVATE"
        self.calendar.save(update_fields=["privacy"])

        self.calendar.refresh_from_db()
        self.assertEqual(self.calendar.likes_count, 1)
        self.assertTrue(
            CalendarLike.objects.filter(user=self.owner, calendar=self.calendar).exists()
        )
        self.assertFalse(
            CalendarLike.objects.filter(user=self.liker, calendar=self.calendar).exists()
        )
        self.assertFalse(
            CalendarLike.objects.filter(user=another_user, calendar=self.calendar).exists()
        )

    def test_privacy_change_to_private_cleans_non_creator_likes(self):
        mutual_friend = User.objects.create_user(
            username="mutual_friend",
            email="mutual_friend@example.com",
            password="pass1234",
        )
        outsider = User.objects.create_user(
            username="outsider",
            email="outsider@example.com",
            password="pass1234",
        )
        self.owner.following.add(mutual_friend)
        mutual_friend.following.add(self.owner)

        CalendarLike.objects.create(user=mutual_friend, calendar=self.calendar)
        CalendarLike.objects.create(user=outsider, calendar=self.calendar)
        CalendarLike.objects.create(user=self.owner, calendar=self.calendar)

        self.calendar.privacy = "PRIVATE"
        self.calendar.save(update_fields=["privacy"])

        self.calendar.refresh_from_db()
        self.assertEqual(self.calendar.likes_count, 1)
        self.assertFalse(
            CalendarLike.objects.filter(user=mutual_friend, calendar=self.calendar).exists()
        )
        self.assertTrue(
            CalendarLike.objects.filter(user=self.owner, calendar=self.calendar).exists()
        )
        self.assertFalse(
            CalendarLike.objects.filter(user=outsider, calendar=self.calendar).exists()
        )
SHARE_CALENDAR_ENDPOINT = "/api/v1/calendars/{}/share/"
SHARE_HTML_ENDPOINT = "/share/calendar/{}/"

class GetCalendarShareInfoTests(APITestCase):
    """Tests for GET /api/v1/calendars/<id>/share/"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="shareuser",
            email="share@example.com",
            password="sharepass123",
        )
        self.other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="otherpass123",
        )
        self.public_calendar = Calendar.objects.create(
            name="Public Cal",
            privacy="PUBLIC",
            creator=self.user,
        )
        self.private_calendar = Calendar.objects.create(
            name="Private Cal",
            privacy="PRIVATE",
            creator=self.user,
        )

    def test_get_share_info_authenticated(self):
        """Returns share info for an accessible calendar."""
        self.client.force_authenticate(self.user)
        response = self.client.get(SHARE_CALENDAR_ENDPOINT.format(self.public_calendar.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['calendar_id'], self.public_calendar.id)
        self.assertEqual(data['name'], 'Public Cal')
        self.assertIn('share_url', data)
        self.assertIn('deep_link', data)
        self.assertIn(f'/share/calendar/{self.public_calendar.id}/', data['share_url'])
        self.assertIn(f'calendarId={self.public_calendar.id}', data['deep_link'])

    def test_get_share_info_unauthenticated(self):
        """Unauthenticated users cannot access share info."""
        response = self.client.get(SHARE_CALENDAR_ENDPOINT.format(self.public_calendar.id))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_share_info_nonexistent_calendar(self):
        """Returns 404 for a nonexistent calendar."""
        self.client.force_authenticate(self.user)
        response = self.client.get(SHARE_CALENDAR_ENDPOINT.format(99999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ShareCalendarHtmlTests(TestCase):
    """Tests for GET /share/calendar/<id>/"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="htmluser",
            email="html@example.com",
            password="htmlpass123",
        )
        self.public_calendar = Calendar.objects.create(
            name="My Public Calendar",
            description="A great calendar",
            privacy="PUBLIC",
            creator=self.user,
        )
        self.private_calendar = Calendar.objects.create(
            name="Private Cal",
            privacy="PRIVATE",
            creator=self.user,
        )

    def test_share_html_public_calendar(self):
        """Returns HTML with OG tags for a public calendar."""
        response = self.client.get(SHARE_HTML_ENDPOINT.format(self.public_calendar.id))
        self.assertEqual(response.status_code, 200)
        self.assertIn('text/html', response['Content-Type'])
        content = response.content.decode()
        self.assertIn('My Public Calendar', content)
        self.assertIn('og:title', content)
        self.assertIn('htmluser', content)

    def test_share_html_private_calendar_returns_403(self):
        """Returns 403 for a private calendar."""
        response = self.client.get(SHARE_HTML_ENDPOINT.format(self.private_calendar.id))
        self.assertEqual(response.status_code, 403)

    def test_share_html_nonexistent_calendar(self):
        """Returns 404 for a nonexistent calendar."""
        response = self.client.get(SHARE_HTML_ENDPOINT.format(99999))
        self.assertEqual(response.status_code, 404)


class SubscribeCalendarTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="sub_owner", email="sub_owner@example.com", password="pass1234")
        self.subscriber = User.objects.create_user(username="subscriber", email="subscriber@example.com", password="pass1234")
        self.calendar = Calendar.objects.create(name="Subscribable Calendar", privacy="PUBLIC", creator=self.owner)

    def test_user_can_subscribe(self):
        self.client.force_authenticate(self.subscriber)
        response = self.client.post(f"/api/v1/calendars/{self.calendar.id}/subscribe/")
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        self.assertTrue(self.subscriber.subscribed_calendars.filter(pk=self.calendar.pk).exists())

    def test_user_can_unsubscribe(self):
        self.subscriber.subscribed_calendars.add(self.calendar)
        self.client.force_authenticate(self.subscriber)
        response = self.client.post(f"/api/v1/calendars/{self.calendar.id}/subscribe/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(self.subscriber.subscribed_calendars.filter(pk=self.calendar.pk).exists())

    def test_subscribe_nonexistent_calendar_returns_404(self):
        self.client.force_authenticate(self.subscriber)
        response = self.client.post("/api/v1/calendars/99999/subscribe/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_returns_401(self):
        response = self.client.post(f"/api/v1/calendars/{self.calendar.id}/subscribe/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ListSubscribedCalendarsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="listsubuser", email="listsub@example.com", password="pass1234")
        self.other = User.objects.create_user(username="other_sub", email="other_sub@example.com", password="pass1234")
        self.calendar = Calendar.objects.create(name="Subscribed Cal", privacy="PUBLIC", creator=self.other)
        self.user.subscribed_calendars.add(self.calendar)

    def test_returns_subscribed_calendars(self):
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/v1/calendars/subscribed/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [c["name"] for c in response.json()]
        self.assertIn("Subscribed Cal", names)

    def test_unsubscribed_calendar_not_in_list(self):
        Calendar.objects.create(name="Not Subscribed", privacy="PUBLIC", creator=self.other)
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/v1/calendars/subscribed/")
        names = [c["name"] for c in response.json()]
        self.assertNotIn("Not Subscribed", names)

    def test_unauthenticated_returns_401(self):
        response = self.client.get("/api/v1/calendars/subscribed/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ListMyCalendarsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="myCalUser", email="mycal@example.com", password="pass1234")
        self.other = User.objects.create_user(username="otherCalUser", email="othercal@example.com", password="pass1234")
        Calendar.objects.create(name="My Cal", privacy="PUBLIC", creator=self.user)
        Calendar.objects.create(name="Other Cal", privacy="PUBLIC", creator=self.other)

    def test_returns_only_own_calendars(self):
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/v1/calendars/my-calendars/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [c["name"] for c in response.json()]
        self.assertIn("My Cal", names)
        self.assertNotIn("Other Cal", names)

    def test_unauthenticated_returns_401(self):
        response = self.client.get("/api/v1/calendars/my-calendars/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PublishCalendarPermissionTests(APITestCase):
    """Covers calendars/views.py line 33: 403 when not the creator."""

    def setUp(self):
        self.creator = User.objects.create_user(username="pub_creator", email="pub_creator@example.com", password="pass1234")
        self.other = User.objects.create_user(username="pub_other", email="pub_other@example.com", password="pass1234")
        self.calendar = Calendar.objects.create(name="To Publish", privacy="PRIVATE", creator=self.creator)

    def test_non_creator_cannot_publish_returns_403(self):
        self.client.force_authenticate(self.other)
        response = self.client.put(f"/api/v1/calendars/{self.calendar.id}/publish/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class EditCalendarEdgeCaseTests(APITestCase):
    """Covers calendars/views.py lines 90-108: empty field, invalid privacy, remove_cover."""

    def setUp(self):
        self.creator = User.objects.create_user(username="edit_creator", email="edit_creator@example.com", password="pass1234")
        self.calendar = Calendar.objects.create(name="Editable", privacy="PUBLIC", creator=self.creator)
        self.client.force_authenticate(self.creator)

    def test_edit_empty_name_returns_400(self):
        response = self.client.put(f"/api/v1/calendars/{self.calendar.id}/edit/", {"name": "   "}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_edit_invalid_privacy_returns_400(self):
        response = self.client.put(f"/api/v1/calendars/{self.calendar.id}/edit/", {"privacy": "INVALIDO"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_remove_cover_sets_cover_to_none(self):
        response = self.client.patch(f"/api/v1/calendars/{self.calendar.id}/edit/", {"remove_cover": "true"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.calendar.refresh_from_db()
        self.assertFalse(bool(self.calendar.cover))


class SubscribeOwnCalendarTests(APITestCase):
    """Covers calendars/views.py line 315: subscribe to own calendar → 400."""

    def setUp(self):
        self.user = User.objects.create_user(username="sub_own", email="sub_own@example.com", password="pass1234")
        self.calendar = Calendar.objects.create(name="Own Calendar", privacy="PUBLIC", creator=self.user)
        self.client.force_authenticate(self.user)

    def test_cannot_subscribe_to_own_calendar(self):
        response = self.client.post(f"/api/v1/calendars/{self.calendar.id}/subscribe/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


MINIMAL_ICS = (
    "BEGIN:VCALENDAR\r\n"
    "VERSION:2.0\r\n"
    "BEGIN:VEVENT\r\n"
    "UID:test-uid@example.com\r\n"
    "SUMMARY:Future Event\r\n"
    "DTSTART:29991231T120000Z\r\n"
    "DTEND:29991231T130000Z\r\n"
    "END:VEVENT\r\n"
    "END:VCALENDAR\r\n"
)


class IcsImportTests(APITestCase):
    """Covers calendars/views.py lines 534-617: ics_import."""

    def setUp(self):
        self.user = User.objects.create_user(username="ics_import_user", email="ics_import@example.com", password="pass1234")

    def test_import_valid_ics(self):
        self.client.force_authenticate(self.user)
        ics_file = SimpleUploadedFile("test.ics", MINIMAL_ICS.encode(), content_type="text/calendar")
        response = self.client.post(
            "/api/v1/calendars/import-ics/",
            {"file": ics_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_import_no_file_returns_400(self):
        self.client.force_authenticate(self.user)
        response = self.client.post("/api/v1/calendars/import-ics/", {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_import_invalid_ics_returns_400(self):
        self.client.force_authenticate(self.user)
        bad_file = SimpleUploadedFile("bad.ics", b"NOT VALID ICS CONTENT", content_type="text/calendar")
        response = self.client.post(
            "/api/v1/calendars/import-ics/",
            {"file": bad_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_import_unauthenticated_returns_401(self):
        ics_file = SimpleUploadedFile("test.ics", MINIMAL_ICS.encode(), content_type="text/calendar")
        response = self.client.post(
            "/api/v1/calendars/import-ics/",
            {"file": ics_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ListMyCalendarsFilterTests(APITestCase):
    """Covers list_my_calendars with q and invalid privacy filters."""

    def setUp(self):
        self.user = User.objects.create_user(username="myfilter_user", email="myfilter@example.com", password="pass1234")
        Calendar.objects.create(name="Alpha", privacy="PUBLIC", creator=self.user)
        Calendar.objects.create(name="Beta", privacy="PRIVATE", creator=self.user)
        self.client.force_authenticate(self.user)

    def test_filter_by_name(self):
        response = self.client.get("/api/v1/calendars/my-calendars/", {"q": "Alpha"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [c["name"] for c in response.json()]
        self.assertIn("Alpha", names)
        self.assertNotIn("Beta", names)

    def test_filter_by_privacy(self):
        response = self.client.get("/api/v1/calendars/my-calendars/", {"privacy": "PRIVATE"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for c in response.json():
            self.assertEqual(c["privacy"], "PRIVATE")

    def test_invalid_privacy_returns_400(self):
        response = self.client.get("/api/v1/calendars/my-calendars/", {"privacy": "INVALIDO"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)



class GoogleAndIOSImportIntegrationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="import_user",
            email="import_user@example.com",
            password="ImportPass123!",
        )

    def test_import_google_without_session_credentials_returns_400(self):
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/v1/calendars/import-google-calendar/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    @patch("main.calendars.views.build")
    def test_import_google_with_mocked_service_success(self, mock_build):
        self.client.force_authenticate(self.user)

        session = self.client.session
        session["google_credentials"] = {
            "token": "fake-token",
            "refresh_token": "fake-refresh",
            "token_uri": "https://oauth2.googleapis.com/token",
            "client_id": "fake-client-id",
            "client_secret": "fake-client-secret",
            "scopes": ["https://www.googleapis.com/auth/calendar.readonly"],
        }
        session.save()

        fake_service = MagicMock()
        fake_service.events.return_value.list.return_value.execute.return_value = {
            "items": [
                {
                    "id": "event-1",
                    "summary": "Google Event",
                    "description": "Imported from google",
                    "start": {"dateTime": "2999-12-31T12:00:00Z"},
                    "end": {"dateTime": "2999-12-31T13:00:00Z"},
                }
            ]
        }
        fake_service.calendarList.return_value.get.return_value.execute.return_value = {"id": "primary"}
        mock_build.return_value = fake_service

        response = self.client.get("/api/v1/calendars/import-google-calendar/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertTrue(Calendar.objects.filter(origin="GOOGLE").exists())

    def test_import_ios_missing_url_returns_400(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            "/api/v1/calendars/import-ios-calendar/",
            {"user": self.user.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("main.calendars.views._is_safe_calendar_url", return_value=(False, "Host no permitido"))
    def test_import_ios_unsafe_url_returns_400(self, _mock_safe):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            "/api/v1/calendars/import-ios-calendar/",
            {"user": self.user.id, "webcal_url": "https://blocked.example.com/feed.ics"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("main.calendars.views.requests.get")
    @patch("main.calendars.views.get_safe_ip", return_value="1.1.1.1")
    @patch("main.calendars.views._is_safe_calendar_url", return_value=(True, None))
    def test_import_ios_valid_ics_returns_200(self, _mock_safe_url, _mock_safe_ip, mock_get):
        self.client.force_authenticate(self.user)

        fake_response = MagicMock()
        fake_response.content = MINIMAL_ICS.encode()
        fake_response.raise_for_status.return_value = None
        mock_get.return_value = fake_response

        response = self.client.post(
            "/api/v1/calendars/import-ios-calendar/",
            {
                "user": self.user.id,
                "webcal_url": "https://calendar.example.com/feed.ics",
                "privacy": "PRIVATE",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("count", response.data)
        self.assertTrue(Calendar.objects.filter(origin="APPLE").exists())



class ListSpecialCalendarsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="special_user",
            email="special_user@example.com",
            password="SpecialPass123!",
        )
        self.friend = User.objects.create_user(
            username="special_friend",
            email="special_friend@example.com",
            password="SpecialFriendPass123!",
        )
        self.other = User.objects.create_user(
            username="special_other",
            email="special_other@example.com",
            password="SpecialOtherPass123!",
        )

        self.mine_public = Calendar.objects.create(name="Mine Public", privacy="PUBLIC", creator=self.user)
        self.mine_private = Calendar.objects.create(name="Mine Private", privacy="PRIVATE", creator=self.user)
        self.friend_public = Calendar.objects.create(name="Friend PUBLIC", privacy="PUBLIC", creator=self.friend)

        self.user.following.add(self.friend)
        self.friend.following.add(self.user)
        self.user.subscribed_calendars.add(self.friend_public)

        self.client.force_authenticate(self.user)

    def test_subscribed_endpoint(self):
        response = self.client.get("/api/v1/calendars/subscribed/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [c["name"] for c in response.data]
        self.assertIn("Friend PUBLIC", names)

    def test_my_calendars_endpoint_and_filters(self):
        response = self.client.get("/api/v1/calendars/my-calendars/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        filtered = self.client.get("/api/v1/calendars/my-calendars/", {"privacy": "PRIVATE"})
        self.assertEqual(filtered.status_code, status.HTTP_200_OK)
        for item in filtered.data:
            self.assertEqual(item["privacy"], "PRIVATE")

        invalid = self.client.get("/api/v1/calendars/my-calendars/", {"privacy": "NOT_VALID"})
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)


class CalendarImportsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="imports_user",
            email="imports_user@example.com",
            password="ImportsPass123!",
        )
        self.client.force_authenticate(self.user)

    def test_import_google_without_credentials(self):
        response = self.client.get("/api/v1/calendars/import-google-calendar/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("main.calendars.views.build")
    def test_import_google_ok_with_mock(self, mock_build):
        session = self.client.session
        session["google_credentials"] = {
            "token": "fake-token",
            "refresh_token": "fake-refresh",
            "token_uri": "https://oauth2.googleapis.com/token",
            "client_id": "fake-client-id",
            "client_secret": "fake-client-secret",
            "scopes": ["https://www.googleapis.com/auth/calendar.readonly"],
        }
        session.save()

        fake_service = MagicMock()
        fake_service.events.return_value.list.return_value.execute.return_value = {
            "items": [
                {
                    "id": "g-event-1",
                    "summary": "Google Imported Event",
                    "description": "from mock",
                    "start": {"dateTime": "2999-12-31T12:00:00Z"},
                    "end": {"dateTime": "2999-12-31T13:00:00Z"},
                }
            ]
        }
        fake_service.calendarList.return_value.get.return_value.execute.return_value = {"id": "primary"}
        mock_build.return_value = fake_service

        response = self.client.get("/api/v1/calendars/import-google-calendar/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_import_ios_without_url(self):
        response = self.client.post("/api/v1/calendars/import-ios-calendar/", {"user": self.user.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("main.calendars.views.requests.get")
    @patch("main.calendars.views.get_safe_ip", return_value="1.1.1.1")
    @patch("main.calendars.views._is_safe_calendar_url", return_value=(True, None))
    def test_import_ios_ok(self, _safe_url, _safe_ip, mock_get):
        fake_response = MagicMock()
        fake_response.content = MINIMAL_ICS.encode()
        fake_response.raise_for_status.return_value = None
        mock_get.return_value = fake_response

        response = self.client.post(
            "/api/v1/calendars/import-ios-calendar/",
            {"user": self.user.id, "webcal_url": "https://calendar.example.com/feed.ics"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_import_ics_without_file(self):
        response = self.client.post("/api/v1/calendars/import-ics/", {"user": self.user.id}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_import_ics_invalid_user(self):
        ics_file = SimpleUploadedFile("x.ics", MINIMAL_ICS.encode(), content_type="text/calendar")
        response = self.client.post(
            "/api/v1/calendars/import-ics/",
            {"file": ics_file, "user": 999999},
            format="multipart",
        )
        # En la implementaci?n actual, el endpoint ignora el campo 'user' y usa request.user
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_import_ics_success(self):
        ics_file = SimpleUploadedFile("ok.ics", MINIMAL_ICS.encode(), content_type="text/calendar")
        response = self.client.post(
            "/api/v1/calendars/import-ics/",
            {"file": ics_file, "user": self.user.id, "privacy": "PRIVATE"},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class LeaveCalendarTests(APITestCase):
    """Tests for POST/DELETE /api/v1/calendars/<id>/leave/"""

    def setUp(self):
        self.creator = User.objects.create_user(
            username="creator",
            email="creator@example.com",
            password="testpass123",
            plan="STANDARD"
        )
        self.co_owner = User.objects.create_user(
            username="coowner",
            email="coowner@example.com",
            password="testpass123",
            plan="STANDARD"
        )
        self.viewer = User.objects.create_user(
            username="viewer",
            email="viewer@example.com",
            password="testpass123",
            plan="STANDARD"
        )
        self.other_user = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="testpass123",
            plan="STANDARD"
        )
        
        self.calendar = Calendar.objects.create(
            name="Shared Calendar",
            description="A calendar to test leaving",
            creator=self.creator,
            privacy="PRIVATE"
        )
        
        # Add co-owner and viewer
        self.calendar.co_owners.add(self.co_owner)
        self.calendar.viewers.add(self.viewer)

    def test_leave_calendar_as_co_owner_success(self):
        """Co-owner successfully leaves the calendar."""
        self.client.force_authenticate(self.co_owner)
        
        response = self.client.post(f"/api/v1/calendars/{self.calendar.id}/leave/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['calendar_id'], self.calendar.id)
        
        # Verify user is removed from co_owners
        self.assertFalse(self.calendar.co_owners.filter(id=self.co_owner.id).exists())

    def test_leave_calendar_as_viewer_success(self):
        """Viewer successfully leaves the calendar."""
        self.client.force_authenticate(self.viewer)
        
        response = self.client.post(f"/api/v1/calendars/{self.calendar.id}/leave/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data['success'])
        
        # Verify user is removed from viewers
        self.assertFalse(self.calendar.viewers.filter(id=self.viewer.id).exists())

    def test_leave_calendar_creator_cannot_leave(self):
        """Creator cannot leave their own calendar."""
        self.client.force_authenticate(self.creator)
        
        response = self.client.post(f"/api/v1/calendars/{self.calendar.id}/leave/")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertIn('error', data)
        self.assertIn('own calendar', data['error'])

    def test_leave_calendar_not_part_of_calendar(self):
        """User who is not part of calendar cannot leave."""
        self.client.force_authenticate(self.other_user)
        
        response = self.client.post(f"/api/v1/calendars/{self.calendar.id}/leave/")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertIn('error', data)

    def test_leave_calendar_with_delete_method(self):
        """Leave calendar using DELETE method should also work."""
        self.client.force_authenticate(self.co_owner)
        
        response = self.client.delete(f"/api/v1/calendars/{self.calendar.id}/leave/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(self.calendar.co_owners.filter(id=self.co_owner.id).exists())

    def test_leave_calendar_unauthenticated(self):
        """Unauthenticated user cannot leave calendar."""
        response = self.client.post(f"/api/v1/calendars/{self.calendar.id}/leave/")
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_leave_calendar_not_found(self):
        """Attempting to leave non-existent calendar returns 404."""
        self.client.force_authenticate(self.co_owner)
        
        response = self.client.post("/api/v1/calendars/999999/leave/")
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_leave_calendar_with_both_roles(self):
        """If user is both co-owner and viewer, they should be removed from both."""
        # Add co_owner as viewer too
        self.calendar.viewers.add(self.co_owner)
        
        self.client.force_authenticate(self.co_owner)
        
        response = self.client.post(f"/api/v1/calendars/{self.calendar.id}/leave/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify user is removed from both
        self.assertFalse(self.calendar.co_owners.filter(id=self.co_owner.id).exists())
        self.assertFalse(self.calendar.viewers.filter(id=self.co_owner.id).exists())
