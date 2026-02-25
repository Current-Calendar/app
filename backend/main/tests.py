from django.test import TestCase
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
