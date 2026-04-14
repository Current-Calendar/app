from datetime import date, time
from rest_framework.test import APITestCase
from rest_framework import status

from main.models import (
    User, Calendar, Event, Comment, EventAttendance, EventSave,
)


class AnalyticsDashboardTests(APITestCase):

    def setUp(self):
        self.business_user = User.objects.create_user(
            username="analytics_owner",
            email="analytics_owner@test.com",
            password="pass1234",
            plan="BUSINESS",
        )
        self.free_user = User.objects.create_user(
            username="analytics_free",
            email="analytics_free@test.com",
            password="pass1234",
            plan="FREE",
        )
        self.other_user = User.objects.create_user(
            username="analytics_other",
            email="analytics_other@test.com",
            password="pass1234",
        )

        self.calendar = Calendar.objects.create(
            name="Analytics Cal",
            privacy="PUBLIC",
            creator=self.business_user,
        )
        self.calendar.subscribers.add(self.other_user)

        self.event = Event.objects.create(
            title="Analytics Event",
            date=date(2026, 6, 15),
            time=time(18, 0),
            creator=self.business_user,
        )
        self.event.calendars.add(self.calendar)

        EventAttendance.objects.create(
            user=self.other_user, event=self.event, status="ASSISTING"
        )
        Comment.objects.create(
            author=self.other_user,
            calendar=self.calendar,
            body="Great calendar!",
        )
        Comment.objects.create(
            author=self.other_user,
            event=self.event,
            body="Great event!",
        )

    def test_unauthenticated_returns_401(self):
        response = self.client.get("/api/v1/analytics/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_free_user_returns_403(self):
        self.client.force_authenticate(self.free_user)
        response = self.client.get("/api/v1/analytics/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_business_user_returns_200(self):
        self.client.force_authenticate(self.business_user)
        response = self.client.get("/api/v1/analytics/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_response_contains_summary(self):
        self.client.force_authenticate(self.business_user)
        response = self.client.get("/api/v1/analytics/")
        data = response.data
        self.assertIn("summary", data)
        summary = data["summary"]
        self.assertEqual(summary["total_calendars"], 1)
        self.assertEqual(summary["total_events"], 1)
        self.assertEqual(summary["total_subscribers"], 1)
        self.assertEqual(summary["total_attendees"], 1)
        self.assertEqual(summary["total_comments"], 2)

    def test_response_contains_calendars_data(self):
        self.client.force_authenticate(self.business_user)
        response = self.client.get("/api/v1/analytics/")
        calendars = response.data["calendars"]
        self.assertEqual(len(calendars), 1)
        cal = calendars[0]
        self.assertEqual(cal["name"], "Analytics Cal")
        self.assertIn("subscribers", cal)
        self.assertIn("likes", cal)
        self.assertIn("comments", cal)
        self.assertIn("events_count", cal)

    def test_response_contains_events_data(self):
        self.client.force_authenticate(self.business_user)
        response = self.client.get("/api/v1/analytics/")
        events = response.data["events"]
        self.assertEqual(len(events), 1)
        ev = events[0]
        self.assertEqual(ev["title"], "Analytics Event")
        self.assertIn("attendees", ev)
        self.assertEqual(ev["attendees"]["assisting"], 1)
        self.assertIn("likes", ev)
        self.assertIn("saves", ev)
        self.assertIn("comments", ev)
        self.assertIn("calendars", ev)

    def test_event_saves_counted(self):
        EventSave.objects.create(user=self.other_user, event=self.event)
        self.client.force_authenticate(self.business_user)
        response = self.client.get("/api/v1/analytics/")
        ev = response.data["events"][0]
        self.assertEqual(ev["saves"], 1)

    def test_co_owner_sees_shared_calendar(self):
        co_owner = User.objects.create_user(
            username="co_owner_analytics",
            email="co_analytics@test.com",
            password="pass1234",
            plan="BUSINESS",
        )
        self.calendar.co_owners.add(co_owner)
        self.client.force_authenticate(co_owner)
        response = self.client.get("/api/v1/analytics/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["total_calendars"], 1)

    def test_empty_analytics_for_new_user(self):
        new_user = User.objects.create_user(
            username="new_analytics",
            email="new_analytics@test.com",
            password="pass1234",
            plan="BUSINESS",
        )
        self.client.force_authenticate(new_user)
        response = self.client.get("/api/v1/analytics/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        summary = response.data["summary"]
        self.assertEqual(summary["total_calendars"], 0)
        self.assertEqual(summary["total_events"], 0)

    def test_not_assisting_attendance_not_counted(self):
        EventAttendance.objects.create(
            user=self.business_user, event=self.event, status="NOT_ASSISTING"
        )
        self.client.force_authenticate(self.business_user)
        response = self.client.get("/api/v1/analytics/")
        self.assertEqual(response.data["summary"]["total_attendees"], 1)
        ev = response.data["events"][0]
        self.assertEqual(ev["attendees"]["not_assisting"], 1)
