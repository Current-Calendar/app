from graphene_django.utils.testing import GraphQLTestCase
from datetime import date, time
from rest_framework.test import APIClient

from .models import Usuario, Evento, Calendario


class MyFancyTestCase(GraphQLTestCase):

    GRAPHQL_URL = "/graphql/"
    client_class = APIClient

    def setUp(self) -> None:
        self.user1 = Usuario.objects.create_user(
            username="user1", email="user1@example.com", password="user1"
        )
        self.user2 = Usuario.objects.create_user(
            username="user2", email="user2@example.com", password="user2"
        )

        self.cal1 = Calendario.objects.create(
            nombre="Calendario Privado",
            estado="PRIVADO",
            creador=self.user1,
        )

        self.cal2 = Calendario.objects.create(
            nombre="Calendario para Amigos",
            estado="AMIGOS",
            creador=self.user2,
        )

        self.event1 = Evento.objects.create(
            titulo="Cena cumpleaños",
            descripcion="Nos vemos en el restaurante de siempre.",
            fecha=date(2026, 3, 20),
            hora=time(21, 00),
            creador=self.user1,
        )
        self.event1.calendarios.add(self.cal1)
        self.event1.save()

        self.event2 = Evento.objects.create(
            titulo="Reunión secreta",
            descripcion="Solo para mis amigos.",
            fecha=date(2026, 4, 20),
            hora=time(10, 00),
            creador=self.user2,
        )
        self.event2.calendarios.add(self.cal2)
        self.event2.save()

    def test_all_events(self) -> None:
        response = self.query(
            """
            {
                allEvents {
                    id
                    titulo
                    descripcion
                }
            }
            """,
        )

        self.assertResponseNoErrors(response)

        data = response.json()

        self.assertEqual(len(data["data"]["allEvents"]), 2)
        self.assertEqual(data["data"]["allEvents"][0]["titulo"], "Cena cumpleaños")
        self.assertEqual(data["data"]["allEvents"][1]["titulo"], "Reunión secreta")

    def test_all_events_date(self) -> None:
        response = self.query(
            """
            {
                allEvents(month: 4, year: 2026) {
                    id
                    titulo
                    descripcion
                }
            }
            """,
        )

        self.assertResponseNoErrors(response)

        data = response.json()

        self.assertEqual(len(data["data"]["allEvents"]), 1)
        self.assertEqual(data["data"]["allEvents"][0]["titulo"], "Reunión secreta")

    def test_event_by_id(self) -> None:
        response = self.query(
            f"""
            {{
                eventById(id: {self.event1.pk}) {{
                    id
                    titulo
                    descripcion
                }}
            }}
            """,
        )

        self.assertResponseNoErrors(response)

        data = response.json()

        self.assertEqual(data["data"]["eventById"]["titulo"], "Cena cumpleaños")

    def test_events_of_user(self) -> None:
        response = self.query(
            f"""
            {{
                eventsOfUser(id: {self.user2.pk}) {{
                    id
                    titulo
                    descripcion
                }}
            }}
            """,
        )

        self.assertResponseNoErrors(response)

        data = response.json()

        self.assertEqual(len(data["data"]["eventsOfUser"]), 1)
        self.assertEqual(data["data"]["eventsOfUser"][0]["titulo"], "Reunión secreta")

    def test_events_of_user_date(self) -> None:
        response = self.query(
            f"""
            {{
                eventsOfUser(id: {self.user2.pk}, year: 2026) {{
                    id
                    titulo
                    descripcion
                }}
            }}
            """,
        )

        self.assertResponseNoErrors(response)

        data = response.json()

        self.assertEqual(len(data["data"]["eventsOfUser"]), 1)
        self.assertEqual(data["data"]["eventsOfUser"][0]["titulo"], "Reunión secreta")
