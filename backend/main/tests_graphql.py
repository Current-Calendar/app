from graphene_django.utils.testing import GraphQLTestCase
from datetime import date, time
from django.contrib.gis.geos import Point
from rest_framework.test import APIClient

from .models import User, Event, Calendar, CalendarLike


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


class CalendarLikedByMeTests(GraphQLTestCase):
    """Tests for CalendarType.resolve_liked_by_me (lines 56-65)."""

    GRAPHQL_URL = "/graphql/"
    client_class = APIClient

    def setUp(self) -> None:
        self.user = User.objects.create_user(
            username="like_user", email="like_user@example.com", password="pass"
        )
        self.calendar = Calendar.objects.create(
            name="Likeable Calendar",
            privacy="PUBLIC",
            creator=self.user,
        )

    def test_liked_by_me_true_when_user_liked(self) -> None:
        CalendarLike.objects.create(user=self.user, calendar=self.calendar)
        self.client.force_login(self.user)

        response = self.query(
            """
            {
                allPublicCalendars {
                    id
                    name
                    likedByMe
                }
            }
            """,
        )

        self.assertResponseNoErrors(response)
        data = response.json()
        cal_data = data["data"]["allPublicCalendars"][0]
        self.assertTrue(cal_data["likedByMe"])

    def test_liked_by_me_false_when_user_not_liked(self) -> None:
        self.client.force_login(self.user)

        response = self.query(
            """
            {
                allPublicCalendars {
                    id
                    name
                    likedByMe
                }
            }
            """,
        )

        self.assertResponseNoErrors(response)
        data = response.json()
        cal_data = data["data"]["allPublicCalendars"][0]
        self.assertFalse(cal_data["likedByMe"])

    def test_liked_by_me_false_when_unauthenticated(self) -> None:
        response = self.query(
            """
            {
                allPublicCalendars {
                    id
                    name
                    likedByMe
                }
            }
            """,
        )

        self.assertResponseNoErrors(response)
        data = response.json()
        cal_data = data["data"]["allPublicCalendars"][0]
        self.assertFalse(cal_data["likedByMe"])


class EventLocationTests(GraphQLTestCase):
    """Tests for EventType.resolve_location (lines 85-86)."""

    GRAPHQL_URL = "/graphql/"
    client_class = APIClient

    def setUp(self) -> None:
        self.user = User.objects.create_user(
            username="loc_user", email="loc_user@example.com", password="pass"
        )
        self.event_with_loc = Event.objects.create(
            title="Located Event",
            date=date(2026, 6, 15),
            time=time(18, 0),
            creator=self.user,
            location=Point(-3.7038, 40.4168),
        )
        self.event_without_loc = Event.objects.create(
            title="No Location Event",
            date=date(2026, 6, 16),
            time=time(10, 0),
            creator=self.user,
        )

    def test_event_with_location_returns_coordinates(self) -> None:
        response = self.query(
            f"""
            {{
                eventById(id: {self.event_with_loc.pk}) {{
                    id
                    title
                    location {{
                        longitude
                        latitude
                    }}
                }}
            }}
            """,
        )

        self.assertResponseNoErrors(response)
        data = response.json()
        location = data["data"]["eventById"]["location"]
        self.assertIsNotNone(location)
        self.assertAlmostEqual(location["longitude"], -3.7038, places=3)
        self.assertAlmostEqual(location["latitude"], 40.4168, places=3)

    def test_event_without_location_returns_null(self) -> None:
        response = self.query(
            f"""
            {{
                eventById(id: {self.event_without_loc.pk}) {{
                    id
                    title
                    location {{
                        longitude
                        latitude
                    }}
                }}
            }}
            """,
        )

        self.assertResponseNoErrors(response)
        data = response.json()
        self.assertIsNone(data["data"]["eventById"]["location"])


class FilterEventsWeekTests(GraphQLTestCase):
    """Tests for filter_events with week filter (line 91)."""

    GRAPHQL_URL = "/graphql/"
    client_class = APIClient

    def setUp(self) -> None:
        self.user = User.objects.create_user(
            username="week_user", email="week_user@example.com", password="pass"
        )
        # 2026-01-05 is ISO week 2
        self.event_week2 = Event.objects.create(
            title="Week 2 Event",
            date=date(2026, 1, 5),
            time=time(10, 0),
            creator=self.user,
        )
        # 2026-01-19 is ISO week 4
        self.event_week4 = Event.objects.create(
            title="Week 4 Event",
            date=date(2026, 1, 19),
            time=time(10, 0),
            creator=self.user,
        )

    def test_filter_by_week(self) -> None:
        response = self.query(
            """
            {
                allEvents(week: 2, year: 2026) {
                    id
                    title
                }
            }
            """,
        )

        self.assertResponseNoErrors(response)
        data = response.json()
        titles = [e["title"] for e in data["data"]["allEvents"]]
        self.assertIn("Week 2 Event", titles)
        self.assertNotIn("Week 4 Event", titles)


class EventByIdNotFoundTests(GraphQLTestCase):
    """Tests for resolve_event_by_id when event does not exist (lines 167-168)."""

    GRAPHQL_URL = "/graphql/"
    client_class = APIClient

    def test_event_by_id_returns_null_for_nonexistent(self) -> None:
        response = self.query(
            """
            {
                eventById(id: 999999) {
                    id
                    title
                }
            }
            """,
        )

        self.assertResponseNoErrors(response)
        data = response.json()
        self.assertIsNone(data["data"]["eventById"])


class HolidaysTests(GraphQLTestCase):
    """Tests for resolve_holidays (lines 189-203)."""

    GRAPHQL_URL = "/graphql/"
    client_class = APIClient

    def setUp(self) -> None:
        self.current_user = User.objects.create_user(
            username="current", email="current@example.com", password="pass"
        )
        self.holidays_calendar = Calendar.objects.create(
            name="Holidays",
            privacy="PUBLIC",
            creator=self.current_user,
        )
        self.holiday_event = Event.objects.create(
            title="Christmas",
            date=date(2026, 12, 25),
            time=time(0, 0),
            creator=self.current_user,
        )
        self.holiday_event.calendars.add(self.holidays_calendar)

        self.other_holiday = Event.objects.create(
            title="New Year",
            date=date(2026, 1, 1),
            time=time(0, 0),
            creator=self.current_user,
        )
        self.other_holiday.calendars.add(self.holidays_calendar)

    def test_holidays_returns_all_holiday_events(self) -> None:
        response = self.query(
            """
            {
                holidays {
                    id
                    title
                }
            }
            """,
        )

        self.assertResponseNoErrors(response)
        data = response.json()
        titles = [e["title"] for e in data["data"]["holidays"]]
        self.assertIn("Christmas", titles)
        self.assertIn("New Year", titles)

    def test_holidays_filtered_by_month(self) -> None:
        response = self.query(
            """
            {
                holidays(month: 12, year: 2026) {
                    id
                    title
                }
            }
            """,
        )

        self.assertResponseNoErrors(response)
        data = response.json()
        self.assertEqual(len(data["data"]["holidays"]), 1)
        self.assertEqual(data["data"]["holidays"][0]["title"], "Christmas")

    def test_holidays_no_current_user_returns_empty(self) -> None:
        # Delete the "current" user so the resolver can't find it
        User.objects.filter(username="current").delete()

        response = self.query(
            """
            {
                holidays {
                    id
                    title
                }
            }
            """,
        )

        self.assertResponseNoErrors(response)
        data = response.json()
        self.assertEqual(len(data["data"]["holidays"]), 0)

    def test_holidays_no_holidays_calendar_returns_empty(self) -> None:
        # Delete the "Holidays" calendar so the resolver can't find it
        Calendar.objects.filter(name="Holidays").delete()

        response = self.query(
            """
            {
                holidays {
                    id
                    title
                }
            }
            """,
        )

        self.assertResponseNoErrors(response)
        data = response.json()
        self.assertEqual(len(data["data"]["holidays"]), 0)
