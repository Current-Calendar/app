import datetime
from datetime import date, time
from rest_framework.test import APITestCase
from rest_framework import status
from main.models import User, Notification, Calendar, Event, EventAttendance

ENDPOINT_NOTIFICATIONS = '/api/v1/notifications/'
ENDPOINT_MARK_AS_READ = '/api/v1/notifications/{id}/read/'
ENDPOINT_MARK_ALL_AS_READ = '/api/v1/notifications/read-all/'

class NotificationTests(APITestCase):
    def setUp(self) -> None:
        super().setUp()

        self.user1 = User.objects.create_user(
            username="user1", email="user1@example.com", password="user1"
        )
        self.user2 = User.objects.create_user(
            username="user2", email="user2@example.com", password="user2"
        )
        self.calendar = Calendar.objects.create(
            name="Test Calendar",
            creator=self.user1,
            privacy='PUBLIC'
        )
        self.event = Event.objects.create(
            title="Test Event",
            date=date.today(),
            time=time(12, 0),
            creator=self.user1
        )
        self.event.calendars.add(self.calendar)
        self.notification = Notification.objects.create(
            recipient=self.user1,
            sender=self.user2,
            type='EVENT_SAVED',
            message='User2 saved your event.',
            related_event=self.event,
        )
        self.notification_2 = Notification.objects.create(
            recipient=self.user1,
            sender=self.user2,
            type='CALENDAR_FOLLOW',
            message='User2 followed your calendar.',
            related_calendar=self.calendar,
        )

    def test_get_notifications(self):
        self.client.login(username='user1', password='user1')
        response = self.client.get(ENDPOINT_NOTIFICATIONS)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]['message'], 'User2 followed your calendar.')
        self.assertEqual(response.data[1]['message'], 'User2 saved your event.')
    
    def test_get_notifications_unauthenticated(self):
        response = self.client.get(ENDPOINT_NOTIFICATIONS)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_mark_notification_as_read(self):
        self.client.login(username='user1', password='user1')
        response = self.client.patch(ENDPOINT_MARK_AS_READ.format(id=self.notification.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)
    
    def test_mark_notification_as_read_unauthenticated(self):
        response = self.client.patch(ENDPOINT_MARK_AS_READ.format(id=self.notification.id))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_mark_notification_as_read_not_found(self):
        self.client.login(username='user1', password='user1')
        response = self.client.patch(ENDPOINT_MARK_AS_READ.format(id=999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_mark_all_notifications_as_read(self):
        self.client.login(username='user1', password='user1')
        response = self.client.patch(ENDPOINT_MARK_ALL_AS_READ)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.notification.refresh_from_db()
        self.notification_2.refresh_from_db()
        self.assertTrue(self.notification.is_read)
        self.assertTrue(self.notification_2.is_read)
    
    def test_mark_all_notifications_as_read_unauthenticated(self):
        response = self.client.patch(ENDPOINT_MARK_ALL_AS_READ)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class InvitationNotificationTests(APITestCase):
    def setUp(self) -> None:
        self.user1 = User.objects.create_user(
            username="user1", email="user1@example.com", password="user1"
        )
        self.user2 = User.objects.create_user(
            username="user2", email="user2@example.com", password="user2"
        )
        self.user3 = User.objects.create_user(
            username="user3", email="user3@example.com", password="user3", plan='STANDARD'
        )

        self.cal1 = Calendar.objects.create(
            name="Public Calendar",
            privacy="PUBLIC",
            creator=self.user1,
        )

        self.event1 = Event.objects.create(
            title="Birthday Dinner",
            description="See you at the usual restaurant.",
            date=date(2026, 3, 20),
            time=time(21, 00),
            creator=self.user1,
        )
        self.event1.calendars.add(self.cal1)
        self.event1.save()

        self.notification = Notification.objects.create(
            recipient=self.user2,
            sender=self.user1,
            type='EVENT_INVITE',
            related_event=self.event1,
        )
        self.notification2 = Notification.objects.create(
            recipient=self.user3,
            sender=self.user1,
            type='CALENDAR_INVITE',
            related_calendar=self.cal1,
        )

    def test_accept_unauthenticated(self):
        request = self.client.post(f"/api/v1/notifications/{self.notification.pk}/")

        self.assertEqual(request.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_accept_not_recipient(self):
        self.client.force_authenticate(self.user1)

        request = self.client.post(f"/api/v1/notifications/{self.notification.pk}/")

        self.assertEqual(request.status_code, status.HTTP_404_NOT_FOUND)

    def test_accept_event(self):
        self.client.force_authenticate(self.user2)

        request = self.client.post(f"/api/v1/notifications/{self.notification.pk}/")

        self.assertEqual(request.status_code, status.HTTP_200_OK)
        self.assertTrue(EventAttendance.objects.filter(user=self.user2, event=self.event1, status="ASSISTING").exists())
        self.assertFalse(Notification.objects.filter(recipient=self.user2, type="EVENT_INVITE", related_event=self.event1, sender=self.user1).exists())

    def test_decline_event(self):
        self.client.force_authenticate(self.user2)

        request = self.client.post(f"/api/v1/notifications/{self.notification.pk}/", {
            "status": "DECLINE"
        })

        self.assertEqual(request.status_code, status.HTTP_200_OK)
        self.assertTrue(EventAttendance.objects.filter(user=self.user2, event=self.event1, status="NOT_ASSISTING").exists())
        self.assertFalse(Notification.objects.filter(recipient=self.user2, type="EVENT_INVITE", related_event=self.event1, sender=self.user1).exists())

    def test_wrong_status(self):
        self.client.force_authenticate(self.user2)

        request = self.client.post(f"/api/v1/notifications/{self.notification.pk}/", {
            "status": "MAYBE"
        })

        self.assertEqual(request.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(EventAttendance.objects.filter(user=self.user2, event=self.event1, status="MAYBE").exists())
        self.assertTrue(Notification.objects.filter(recipient=self.user2, type="EVENT_INVITE", related_event=self.event1, sender=self.user1).exists())

    def test_accept_calendar(self):
        self.client.force_authenticate(self.user3)

        request = self.client.post(f"/api/v1/notifications/{self.notification2.pk}/")

        self.assertEqual(request.status_code, status.HTTP_200_OK)
        self.assertTrue(Calendar.objects.filter(subscribers__id=self.user3.pk).exists())
        self.assertFalse(Notification.objects.filter(recipient=self.user3, type="CALENDAR_INVITE", related_calendar=self.cal1, sender=self.user1).exists())

    def test_decline_calendar(self):
        self.client.force_authenticate(self.user3)

        request = self.client.post(f"/api/v1/notifications/{self.notification2.pk}/", {
            "status": "DECLINE"
        })

        self.assertEqual(request.status_code, status.HTTP_200_OK)
        self.assertFalse(Calendar.objects.filter(subscribers__id=self.user3.pk).exists())
        self.assertFalse(Notification.objects.filter(recipient=self.user3, type="CALENDAR_INVITE", related_calendar=self.cal1, sender=self.user1).exists())
    