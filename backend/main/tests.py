from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from main.models import Usuario, Calendario, Evento

# Create your tests here.

ENDPOINT_EDITAR_EVENTO = "/api/v1/eventos/{}"


class EditarEventoTests(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.usuario = Usuario.objects.create_user(
            username="eventuser",
            email="event@example.com",
            password="testpass123",
        )

        self.calendario1 = Calendario.objects.create(
            creador=self.usuario,
            nombre="Calendario 1",
            estado="PUBLICO",
        )

        self.calendario2 = Calendario.objects.create(
            creador=self.usuario,
            nombre="Calendario 2",
            estado="PUBLICO",
        )

        self.evento = Evento.objects.create(
            titulo="Evento Original",
            descripcion="Descripcion original",
            nombre_lugar="Lugar original",
            fecha="2026-03-01",
            hora="18:00:00",
        )
        self.evento.calendarios.set([self.calendario1])

    def endpoint(self, evento_id=None):
        return ENDPOINT_EDITAR_EVENTO.format(evento_id or self.evento.id)

    # ── Casos de éxito ──

    def test_editar_titulo(self):
        response = self.client.put(
            self.endpoint(),
            {"titulo": "Titulo Nuevo"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.evento.refresh_from_db()
        self.assertEqual(self.evento.titulo, "Titulo Nuevo")

    def test_editar_varios_campos(self):
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
        self.evento.refresh_from_db()
        self.assertEqual(self.evento.titulo, "Nuevo titulo")
        self.assertEqual(self.evento.descripcion, "Nueva descripcion")
        self.assertEqual(self.evento.nombre_lugar, "Nuevo lugar")

    def test_editar_fecha_y_hora(self):
        response = self.client.put(
            self.endpoint(),
            {"fecha": "2026-06-15", "hora": "20:30:00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.evento.refresh_from_db()
        self.assertEqual(str(self.evento.fecha), "2026-06-15")
        self.assertEqual(str(self.evento.hora), "20:30:00")

    def test_cambiar_calendarios(self):
        response = self.client.put(
            self.endpoint(),
            {"calendarios": [self.calendario2.id]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cals = list(self.evento.calendarios.values_list("id", flat=True))
        self.assertEqual(cals, [self.calendario2.id])

    def test_editar_ubicacion(self):
        response = self.client.put(
            self.endpoint(),
            {"latitud": 37.3861, "longitud": -5.9926},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.evento.refresh_from_db()
        self.assertIsNotNone(self.evento.ubicacion)
        self.assertAlmostEqual(self.evento.ubicacion.y, 37.3861, places=4)
        self.assertAlmostEqual(self.evento.ubicacion.x, -5.9926, places=4)

    def test_editar_recurrencia_e_id_externo(self):
        response = self.client.put(
            self.endpoint(),
            {"recurrencia": 7, "id_externo": "ext-123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.evento.refresh_from_db()
        self.assertEqual(self.evento.recurrencia, 7)
        self.assertEqual(self.evento.id_externo, "ext-123")

    def test_campos_no_enviados_no_se_modifican(self):
        titulo_original = self.evento.titulo
        descripcion_original = self.evento.descripcion

        response = self.client.put(
            self.endpoint(),
            {"nombre_lugar": "Solo cambio lugar"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.evento.refresh_from_db()
        self.assertEqual(self.evento.titulo, titulo_original)
        self.assertEqual(self.evento.descripcion, descripcion_original)
        self.assertEqual(self.evento.nombre_lugar, "Solo cambio lugar")

    def test_respuesta_contiene_keys_esperadas(self):
        response = self.client.put(
            self.endpoint(),
            {"titulo": "Check keys"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        keys_esperadas = {
            "id", "titulo", "descripcion", "nombre_lugar",
            "fecha", "hora", "recurrencia", "id_externo",
            "calendarios", "fecha_creacion",
        }
        self.assertEqual(set(response.data.keys()), keys_esperadas)

    # ── Casos de error ──

    def test_evento_no_existe(self):
        response = self.client.put(
            self.endpoint(evento_id=9999),
            {"titulo": "No existe"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_titulo_vacio(self):
        response = self.client.put(
            self.endpoint(),
            {"titulo": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_fecha_vacia(self):
        response = self.client.put(
            self.endpoint(),
            {"fecha": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_hora_vacia(self):
        response = self.client.put(
            self.endpoint(),
            {"hora": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_calendario_inexistente(self):
        response = self.client.put(
            self.endpoint(),
            {"calendarios": [9999]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("errors", response.data)

    def test_lista_calendarios_vacia(self):
        response = self.client.put(
            self.endpoint(),
            {"calendarios": []},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_latlon_invalidas(self):
        response = self.client.put(
            self.endpoint(),
            {"latitud": "abc", "longitud": "xyz"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_get_no_permitido(self):
        response = self.client.get(self.endpoint())
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_post_no_permitido(self):
        response = self.client.post(
            self.endpoint(),
            {"titulo": "No permitido"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
