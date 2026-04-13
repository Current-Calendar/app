from graphene_django.utils.testing import GraphQLTestCase
from datetime import date, time
from rest_framework.test import APIClient

from .models import User, Event, Calendar


class GraphQLTests(GraphQLTestCase):

    GRAPHQL_URL = "/graphql/"
    client_class = APIClient

    def setUp(self) -> None:
        self.user1 = User.objects.create_user(
            username="user1", email="user1@example.com", password="user1"
        )
        self.user2 = User.objects.create_user(
            username="user2", email="user2@example.com", password="user2"
        )
        self.user3 = User.objects.create_user(
            username="user3", email="user3@example.com", password="user3"
        )

        self.cal1 = Calendar.objects.create(
            name="Private Calendar",
            privacy="PRIVATE",
            creator=self.user1,
        )

        self.cal2 = Calendar.objects.create(
            name="Restricted Calendar",
            privacy="PRIVATE",
            creator=self.user2,
        )

        self.cal3 = Calendar.objects.create(
            name="Public Calendar",
            privacy="PUBLIC",
            creator=self.user1,
        )
        self.cal3.subscribers.add(self.user3)
        self.cal3.save()

        self.event1 = Event.objects.create(
            title="Birthday Dinner",
            description="See you at the usual restaurant.",
            date=date(2026, 3, 20),
            time=time(21, 00),
            creator=self.user1,
        )
        self.event1.calendars.add(self.cal1)
        self.event1.save()

        self.event2 = Event.objects.create(
            title="Secret Meeting",
            description="Restricted meeting.",
            date=date(2026, 4, 20),
            time=time(10, 00),
            creator=self.user2,
        )
        self.event2.calendars.add(self.cal2)
        self.event2.save()

    def test_all_public_calendars(self) -> None:
        response = self.query(
            """
            {
                allPublicCalendars {
                    id
                    name
                    creator {
                        username
                    }
                }
            }
            """,
        )

        self.assertResponseNoErrors(response)

        data = response.json()

        self.assertEqual(len(data["data"]["allPublicCalendars"]), 1)
        self.assertEqual(
            data["data"]["allPublicCalendars"][0]["name"], "Public Calendar"
        )

    def test_my_calendars(self) -> None:
        self.client.force_login(self.user1)

        response = self.query(
            """
            {
                myCalendars {
                    id
                    name
                    creator {
                        username
                    }
                }
            }
            """,
        )

        self.assertResponseNoErrors(response)

        data = response.json()

        self.assertEqual(len(data["data"]["myCalendars"]), 2)
        self.assertEqual(data["data"]["myCalendars"][0]["name"], "Private Calendar")
        self.assertEqual(data["data"]["myCalendars"][0]["creator"]["username"], "user1")
        self.assertEqual(data["data"]["myCalendars"][1]["name"], "Public Calendar")
        self.assertEqual(data["data"]["myCalendars"][1]["creator"]["username"], "user1")

    def test_my_calendars_unauthenticated(self) -> None:
        response = self.query(
            """
            {
                myCalendars {
                    id
                    name
                    creator {
                        username
                    }
                }
            }
            """,
        )

        self.assertResponseNoErrors(response)

        data = response.json()

        self.assertEqual(len(data["data"]["myCalendars"]), 0)

    def test_followed_calendars_my_calendars(self) -> None:
        self.client.force_login(self.user1)

        response = self.query(
            """
            {
                followedCalendars {
                    id
                    name
                    creator {
                        username
                    }
                }
            }
            """,
        )

        self.assertResponseNoErrors(response)

        data = response.json()

        self.assertEqual(len(data["data"]["followedCalendars"]), 2)
        self.assertEqual(
            data["data"]["followedCalendars"][0]["name"], "Public Calendar"
        )
        self.assertEqual(
            data["data"]["followedCalendars"][0]["creator"]["username"], "user1"
        )
        self.assertEqual(
            data["data"]["followedCalendars"][1]["name"], "Private Calendar"
        )
        self.assertEqual(
            data["data"]["followedCalendars"][1]["creator"]["username"], "user1"
        )

    def test_followed_calendars(self) -> None:
        self.client.force_login(self.user3)

        response = self.query(
            """
            {
                followedCalendars {
                    id
                    name
                    creator {
                        username
                    }
                }
            }
            """,
        )

        self.assertResponseNoErrors(response)

        data = response.json()

        self.assertEqual(len(data["data"]["followedCalendars"]), 1)
        self.assertEqual(
            data["data"]["followedCalendars"][0]["name"], "Public Calendar"
        )
        self.assertEqual(
            data["data"]["followedCalendars"][0]["creator"]["username"], "user1"
        )

    def test_followed_calendars_unauthenticated(self) -> None:
        response = self.query(
            """
            {
                followedCalendars {
                    id
                    name
                    creator {
                        username
                    }
                }
            }
            """,
        )

        self.assertResponseNoErrors(response)

        data = response.json()

        self.assertEqual(len(data["data"]["followedCalendars"]), 0)

    def test_all_events(self) -> None:
        response = self.query(
            """
            {
                allEvents {
                    id
                    title
                    description
                }
            }
            """,
        )

        self.assertResponseNoErrors(response)

        data = response.json()

        self.assertEqual(len(data["data"]["allEvents"]), 2)
        self.assertEqual(data["data"]["allEvents"][0]["title"], "Birthday Dinner")
        self.assertEqual(data["data"]["allEvents"][1]["title"], "Secret Meeting")

    def test_all_events_date(self) -> None:
        response = self.query(
            """
            {
                allEvents(month: 4, year: 2026) {
                    id
                    title
                    description
                }
            }
            """,
        )

        self.assertResponseNoErrors(response)

        data = response.json()

        self.assertEqual(len(data["data"]["allEvents"]), 1)
        self.assertEqual(data["data"]["allEvents"][0]["title"], "Secret Meeting")

    def test_event_by_id(self) -> None:
        response = self.query(
            f"""
            {{
                eventById(id: {self.event1.pk}) {{
                    id
                    title
                    description
                }}
            }}
            """,
        )

        self.assertResponseNoErrors(response)

        data = response.json()

        self.assertEqual(data["data"]["eventById"]["title"], "Birthday Dinner")

    def test_events_of_user(self) -> None:
        response = self.query(
            f"""
            {{
                eventsOfUser(id: {self.user2.pk}) {{
                    id
                    title
                    description
                }}
            }}
            """,
        )

        self.assertResponseNoErrors(response)

        data = response.json()

        self.assertEqual(len(data["data"]["eventsOfUser"]), 1)
        self.assertEqual(data["data"]["eventsOfUser"][0]["title"], "Secret Meeting")

    def test_events_of_user_date(self) -> None:
        response = self.query(
            f"""
            {{
                eventsOfUser(id: {self.user2.pk}, year: 2026) {{
                    id
                    title
                    description
                }}
            }}
            """,
        )

        self.assertResponseNoErrors(response)

        data = response.json()

        self.assertEqual(len(data["data"]["eventsOfUser"]), 1)
        self.assertEqual(data["data"]["eventsOfUser"][0]["title"], "Secret Meeting")
