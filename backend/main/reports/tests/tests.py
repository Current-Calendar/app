import datetime
from datetime import date, time
from rest_framework.test import APITestCase
from rest_framework import status
from main.models import User, Calendar, Event

ENDPOINT = '/api/v1/reports/create/'

class ReportCreationTests(APITestCase):
    def setUp(self):
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

    def test_report_user(self):
        self.client.login(username='user2', password='user2')
        data = {
            'reported_type': 'USER',
            'reported_user': self.user1.id,
            'reason': 'INAPPROPRIATE_CONTENT'
        }
        response = self.client.post(ENDPOINT, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['reported_type'], 'USER')
        self.assertEqual(response.data['reported_user'], self.user1.id)
        self.assertEqual(response.data['reason'], 'INAPPROPRIATE_CONTENT')
    
    def test_report_calendar(self):
        self.client.login(username='user2', password='user2')
        data = {
            'reported_type': 'CALENDAR',
            'reported_calendar': self.calendar.id,
            'reason': 'INAPPROPRIATE_CONTENT'
        }
        response = self.client.post(ENDPOINT, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['reported_type'], 'CALENDAR')
        self.assertEqual(response.data['reported_calendar'], self.calendar.id)
        self.assertEqual(response.data['reason'], 'INAPPROPRIATE_CONTENT')
    
    def test_report_event(self):
        self.client.login(username='user2', password='user2')
        data = {
            'reported_type': 'EVENT',
            'reported_event': self.event.id,
            'reason': 'INAPPROPRIATE_CONTENT'
        }
        response = self.client.post(ENDPOINT, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['reported_type'], 'EVENT')
        self.assertEqual(response.data['reported_event'], self.event.id)
        self.assertEqual(response.data['reason'], 'INAPPROPRIATE_CONTENT')
    
    def test_report_without_authentication(self):
        data = {
            'reported_type': 'USER',
            'reported_user': self.user1.id,
            'reason': 'INAPPROPRIATE_CONTENT'
        }
        response = self.client.post(ENDPOINT, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_report_with_invalid_data(self):
        self.client.login(username='user2', password='user2')
        data = {
            'reported_type': 'USER',
            'reason': 'INAPPROPRIATE_CONTENT'
        }
        response = self.client.post(ENDPOINT, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_report_with_invalid_reported_type(self):
        self.client.login(username='user2', password='user2')
        data = {
            'reported_type': 'INVALID_TYPE',
            'reported_object_id': self.user1.id,
            'reason': 'INAPPROPRIATE_CONTENT'
        }
        response = self.client.post(ENDPOINT, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_report_with_nonexistent_object(self):
        self.client.login(username='user2', password='user2')
        data = {
            'reported_type': 'USER',
            'reported_object_id': 9999,
            'reason': 'INAPPROPRIATE_CONTENT'
        }
        response = self.client.post(ENDPOINT, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_report_with_mismatched_reported_type_and_object_id(self):
        self.client.login(username='user2', password='user2')
        data = {
            'reported_type': 'EVENT',
            'reported_object_id': self.user1.id,
            'reason': 'INAPPROPRIATE_CONTENT'
        }
        response = self.client.post(ENDPOINT, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_report_with_empty_reason(self):
        self.client.login(username='user2', password='user2')
        data = {
            'reported_type': 'USER',
            'reported_object_id': self.user1.id,
            'reason': ''
        }
        response = self.client.post(ENDPOINT, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_self_reporting(self):
        self.client.login(username='user1', password='user1')
        data = {
            'reported_type': 'USER',
            'reported_object_id': self.user1.id,
            'reason': 'INAPPROPRIATE_CONTENT'
        }
        response = self.client.post(ENDPOINT, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_report_with_invalid_reason(self):
        self.client.login(username='user2', password='user2')
        data = {
            'reported_type': 'USER',
            'reported_object_id': self.user1.id,
            'reason': 'INVALID_REASON'
        }
        response = self.client.post(ENDPOINT, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_report_private_calendar(self):
        private_calendar = Calendar.objects.create(
            name="Private Calendar",
            creator=self.user1,
            privacy='PRIVATE'
        )
        self.client.login(username='user2', password='user2')
        data = {
            'reported_type': 'CALENDAR',
            'reported_calendar': private_calendar.id,
            'reason': 'INAPPROPRIATE_CONTENT'
        }
        response = self.client.post(ENDPOINT, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertRaisesMessage(response, "Cannot report a private calendar.")
    
    def test_report_event_in_private_calendar(self):
        private_calendar = Calendar.objects.create(
            name="Private Calendar",
            creator=self.user1,
            privacy='PRIVATE'
        )
        private_event = Event.objects.create(
            title="Private Event",
            date=date.today(),
            time=time(12, 0),
            creator=self.user1
        )
        private_event.calendars.add(private_calendar)

        self.client.login(username='user2', password='user2')
        data = {
            'reported_type': 'EVENT',
            'reported_event': private_event.id,
            'reason': 'INAPPROPRIATE_CONTENT'
        }
        response = self.client.post(ENDPOINT, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertRaisesMessage(response, "Cannot report an event that belongs to a private calendar.")
