from datetime import date, time
from rest_framework.test import APITestCase
from rest_framework import status
from main.models import Calendar, Event
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

        self.user.following.add(self.friend)

        self.public_calendar = Calendar.objects.create(
            name="Public",
            privacy="PUBLIC",
            creator=self.other
        )

        self.friends_calendar = Calendar.objects.create(
            name="Friends",
            privacy="FRIENDS",
            creator=self.friend
        )

        self.private_calendar = Calendar.objects.create(
            name="Private",
            privacy="PRIVATE",
            creator=self.other
        )

        location = Point(-3.7038, 40.4168)

        self.public_event = Event.objects.create(
            title="Event Público",
            date=date.today(),
            time=time(12, 0),
            location=location,
            creator=self.other
        )
        self.public_event.calendars.add(self.public_calendar)

        self.friends_event = Event.objects.create(
            title="Event Friends",
            date=date.today(),
            time=time(13, 0),
            location=location,
            creator=self.friend
        )
        self.friends_event.calendars.add(self.friends_calendar)

        self.private_event = Event.objects.create(
            title="Event Private",
            date=date.today(),
            time=time(14, 0),
            location=location,
            creator=self.other
        )
        self.private_event.calendars.add(self.private_calendar)

    def test_anonymous_only_sees_public(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        titles = [e["title"] for e in response.data]

        self.assertIn("Event Público", titles)
        self.assertNotIn("Event Friends", titles)
        self.assertNotIn("Event Private", titles)

    def test_authenticated_sees_public_and_friends(self):
        self.client.login(username="user1", password="testpass")

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        titles = [e["title"] for e in response.data]

        self.assertIn("Event Público", titles)
        self.assertIn("Event Friends", titles)
        self.assertNotIn("Event Private", titles)

    def test_non_friend_cannot_see_friends_event(self):
        self.client.login(username="other", password="testpass")

        response = self.client.get(self.url)

        titles = [e["title"] for e in response.data]

        self.assertIn("Event Público", titles)
        self.assertNotIn("Event Friends", titles)

    def test_event_outside_radius_not_returned(self):
        far_location = Point(-0.1276, 51.5074)

        far_event = Event.objects.create(
            title="Event Lejano",
            date=date.today(),
            time=time(15, 0),
            location=far_location,
            creator=self.other
        )
        far_event.calendars.add(self.public_calendar)

        response = self.client.get(self.url)

        titles = [e["title"] for e in response.data]

        self.assertNotIn("Event Lejano", titles)

    def test_invalid_lat_lon(self):
        response = self.client.get("/api/v1/radar/?lat=abc&lon=xyz")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_lat_returns_400(self):
        response = self.client.get("/api/v1/radar/?lon=-3.7038")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_lon_returns_400(self):
        response = self.client.get("/api/v1/radar/?lat=40.4168")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_both_returns_400(self):
        response = self.client.get("/api/v1/radar/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_custom_radio_parameter(self):
        response = self.client.get("/api/v1/radar/?lat=40.4168&lon=-3.7038&radio=1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_creator_sees_own_events(self):
        self.client.login(username="user1", password="testpass")
        own_event = Event.objects.create(
            title="My Own Event",
            date=date.today(),
            time=time(16, 0),
            location=Point(-3.7038, 40.4168),
            creator=self.user,
        )
        own_cal = Calendar.objects.create(
            name="My Private", privacy="PRIVATE", creator=self.user,
        )
        own_event.calendars.add(own_cal)

        response = self.client.get(self.url)
        titles = [e["title"] for e in response.data]
        self.assertIn("My Own Event", titles)