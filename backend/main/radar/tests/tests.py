from datetime import date, time
from rest_framework.test import APITestCase
from rest_framework import status
from main.models import Calendario, Evento
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point

User = get_user_model()

class RadarEventsTest(APITestCase):

    def setUp(self):
        self.url = "/api/v1/radar/?lat=40.4168&lon=-3.7038&radio=10"

        self.user = User.objects.create_user(
            username="user1",
            email="user1@test.com",
            password="testpass"
        )

        self.friend = User.objects.create_user(
            username="friend",
            email="friend@test.com",
            password="testpass"
        )

        self.other = User.objects.create_user(
            username="other",
            email="other@test.com",
            password="testpass"
        )

        self.user.seguidos.add(self.friend)

        self.public_calendar = Calendario.objects.create(
            nombre="Public",
            estado="PUBLICO",
            creador=self.other
        )

        self.friends_calendar = Calendario.objects.create(
            nombre="Friends",
            estado="AMIGOS",
            creador=self.friend
        )

        self.private_calendar = Calendario.objects.create(
            nombre="Private",
            estado="PRIVADO",
            creador=self.other
        )

        location = Point(-3.7038, 40.4168)

        self.public_event = Evento.objects.create(
            titulo="Evento Público",
            fecha=date.today(),
            hora=time(12, 0),
            ubicacion=location,
            creador=self.other
        )
        self.public_event.calendarios.add(self.public_calendar)

        self.friends_event = Evento.objects.create(
            titulo="Evento Amigos",
            fecha=date.today(),
            hora=time(13, 0),
            ubicacion=location,
            creador=self.friend
        )
        self.friends_event.calendarios.add(self.friends_calendar)

        self.private_event = Evento.objects.create(
            titulo="Evento Privado",
            fecha=date.today(),
            hora=time(14, 0),
            ubicacion=location,
            creador=self.other
        )
        self.private_event.calendarios.add(self.private_calendar)

    def test_anonymous_only_sees_public(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        titles = [e["titulo"] for e in response.data]

        self.assertIn("Evento Público", titles)
        self.assertNotIn("Evento Amigos", titles)
        self.assertNotIn("Evento Privado", titles)

    def test_authenticated_sees_public_and_friends(self):
        self.client.login(username="user1", password="testpass")

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        titles = [e["titulo"] for e in response.data]

        self.assertIn("Evento Público", titles)
        self.assertIn("Evento Amigos", titles)
        self.assertNotIn("Evento Privado", titles)

    def test_non_friend_cannot_see_friends_event(self):
        self.client.login(username="other", password="testpass")

        response = self.client.get(self.url)

        titles = [e["titulo"] for e in response.data]

        self.assertIn("Evento Público", titles)
        self.assertNotIn("Evento Amigos", titles)

    def test_event_outside_radius_not_returned(self):
        far_location = Point(-0.1276, 51.5074)

        far_event = Evento.objects.create(
            titulo="Evento Lejano",
            fecha=date.today(),
            hora=time(15, 0),
            ubicacion=far_location,
            creador=self.other
        )
        far_event.calendarios.add(self.public_calendar)

        response = self.client.get(self.url)

        titles = [e["titulo"] for e in response.data]

        self.assertNotIn("Evento Lejano", titles)

    def test_invalid_lat_lon(self):
        response = self.client.get("/api/v1/radar/?lat=abc&lon=xyz")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)