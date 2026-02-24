from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import Calendario, Usuario

class EliminarCalendarioTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create users
        self.creador = Usuario.objects.create_user(username='creador', password='pass1234')
        self.otro_usuario = Usuario.objects.create_user(username='otro', password='pass1234')

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
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

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
        self.creador = Usuario.objects.create_user(username='creador', password='pass1234')
        self.otro_usuario = Usuario.objects.create_user(username='otro', password='pass1234')

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
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

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
