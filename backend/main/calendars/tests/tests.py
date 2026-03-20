from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.test import TestCase
from main.models import User, Calendar

CALENDAR_ENDPOINT_CREATE = "/api/v1/calendars/create/"
PUBLISH_CALENDAR_ENDPOINT = "/api/v1/calendars/{}/publish/"
ENDPOINT_LIST_CALENDARIOS = "/api/v1/calendars/list/"

class CrearCalendarTests(APITestCase):
    """Tests para POST /api/v1/calendars"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
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

    def test_crear_calendario_amigos_exitoso(self):
        """Crea un calendar con privacy FRIENDS correctamente."""
        self.client.force_authenticate(self.user)

        payload = {
            "name": "Calendar FRIENDS",
            "privacy": "FRIENDS",
        }
        response = self.client.post(CALENDAR_ENDPOINT_CREATE, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["privacy"], "FRIENDS")

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
        self.assertIn("El campo 'name' es obligatorio.", response.json()["errors"])

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
        self.assertEqual(response.json()["privacy"], "PRIVATE")

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
            name="Friends Events",
            description="Friends calendar",
            privacy="FRIENDS",
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
        # 'Friends' only appears in 'Friends Events', so exactly 1 match expected
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"q": "Friends"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.json()]
        self.assertIn("Friends Events", names)
        self.assertNotIn("Private Events", names)
        self.assertNotIn("Public Events", names)
        self.assertNotIn("Open Events", names)

    def test_search_is_case_insensitive(self):
        """Name search is case-insensitive."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"q": "PRIVATE"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["name"], "Private Events")

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
        """privacy=PRIVADO returns only private calendars."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"privacy": "PRIVATE"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["privacy"], "PRIVATE")

    def test_filter_by_privacy_amigos(self):
        """privacy=FRIENDS returns only friends calendars."""
        response = self.client.get(ENDPOINT_LIST_CALENDARIOS, {"privacy": "FRIENDS"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["privacy"], "FRIENDS")

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

        self.friends_calendar = Calendar.objects.create(
            creator=self.user,
            name="Calendar FRIENDS",
            privacy="FRIENDS",
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

    def test_publish_friends_calendar(self):
        self.client.force_authenticate(self.user)

        response = self.client.put(
            self.endpoint(self.friends_calendar.id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.friends_calendar.refresh_from_db()
        self.assertEqual(self.friends_calendar.privacy, "PUBLIC")

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