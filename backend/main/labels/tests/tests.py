from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from main.models import Label, Calendar, Event
from datetime import date, time, timedelta

User = get_user_model()


class LabelListTests(TestCase):
    """Tests para listar labels."""

    def setUp(self):
        """Crear labels de prueba."""
        self.label1 = Label.objects.create(name='Trabajo', color='#3498DB', icon='briefcase', is_default=True)
        self.label2 = Label.objects.create(name='Personal', color='#E74C3C', icon='user', is_default=True)
        self.label3 = Label.objects.create(name='Viaje', color='#F39C12', icon='plane', is_default=True)
        self.client = APIClient()

    def test_list_all_labels(self):
        """Test listar todas las labels."""
        response = self.client.get('/api/v1/labels/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

        label_names = {label['name'] for label in response.data}
        self.assertSetEqual(label_names, {'Trabajo', 'Personal', 'Viaje'})

    def test_list_default_labels(self):
        """Test listar solo labels predeterminadas."""
        Label.objects.create(
            name='Custom', color='#000000', icon='tag', is_default=False
        )
        response = self.client.get('/api/v1/labels/default/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

        for label in response.data:
            self.assertTrue(label['is_default'])


class AddLabelToCalendarTests(TestCase):
    """Tests para añadir labels a calendarios."""

    def setUp(self):
        """Crear usuario, calendario y label de prueba."""
        self.user = User.objects.create_user(username='testuser', email='test@test.com', password='testpass123')
        self.other_user = User.objects.create_user(username='other', email='other@test.com', password='testpass123')
        self.label = Label.objects.create(name='Trabajo', color='#3498DB', icon='briefcase', is_default=True)
        self.calendar = Calendar.objects.create(
            name='Mi Calendario',
            description='Test',
            creator=self.user,
            privacy='PRIVATE'
        )
        self.client = APIClient()

    def test_add_label_to_calendar_authenticated(self):
        """Test añadir label a calendario (autenticado)."""
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            f'/api/v1/calendars/{self.calendar.id}/labels/add/',
            {'label_id': self.label.id},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.calendar.refresh_from_db()
        self.assertIn(self.label, self.calendar.labels.all())

    def test_add_label_to_calendar_unauthenticated(self):
        """Test añadir label a calendario sin autenticación."""
        response = self.client.post(
            f'/api/v1/calendars/{self.calendar.id}/labels/add/',
            {'label_id': self.label.id},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_add_label_to_calendar_permission_denied(self):
        """Test que solo el creador puede añadir labels."""
        self.client.force_authenticate(user=self.other_user)
        response = self.client.post(
            f'/api/v1/calendars/{self.calendar.id}/labels/add/',
            {'label_id': self.label.id},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotIn(self.label, self.calendar.labels.all())

    def test_add_label_missing_label_id(self):
        """Test error cuando falta label_id o name."""
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            f'/api/v1/calendars/{self.calendar.id}/labels/add/',
            {},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_nonexistent_label(self):
        """Test error con label que no existe."""
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            f'/api/v1/calendars/{self.calendar.id}/labels/add/',
            {'label_id': 999},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class RemoveLabelFromCalendarTests(TestCase):
    """Tests para remover labels de calendarios."""

    def setUp(self):
        """Crear usuario, calendario y label de prueba."""
        self.user = User.objects.create_user(username='testuser', email='test@test.com', password='testpass123')
        self.other_user = User.objects.create_user(username='other', email='other@test.com', password='testpass123')
        self.label = Label.objects.create(name='Trabajo', color='#3498DB', icon='briefcase', is_default=True)
        self.calendar = Calendar.objects.create(
            name='Mi Calendario',
            description='Test',
            creator=self.user,
            privacy='PRIVATE'
        )
        self.calendar.labels.add(self.label)
        self.client = APIClient()

    def test_remove_label_from_calendar(self):
        """Test remover label de calendario."""
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(
            f'/api/v1/calendars/{self.calendar.id}/labels/remove/{self.label.id}/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.calendar.refresh_from_db()
        self.assertNotIn(self.label, self.calendar.labels.all())

    def test_remove_label_permission_denied(self):
        """Test que solo el creador puede remover labels."""
        self.client.force_authenticate(user=self.other_user)
        response = self.client.delete(
            f'/api/v1/calendars/{self.calendar.id}/labels/remove/{self.label.id}/'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn(self.label, self.calendar.labels.all())


class AddLabelToEventTests(TestCase):
    """Tests para añadir labels a eventos."""

    def setUp(self):
        """Crear usuario, evento y label de prueba."""
        self.user = User.objects.create_user(username='testuser', email='test@test.com', password='testpass123')
        self.other_user = User.objects.create_user(username='other', email='other@test.com', password='testpass123')
        self.label = Label.objects.create(name='Trabajo', color='#3498DB', icon='briefcase', is_default=True)
        self.calendar = Calendar.objects.create(
            name='Mi Calendario',
            description='Test',
            creator=self.user,
            privacy='PRIVATE'
        )
        test_date = date.today() + timedelta(days=1)
        test_time = time(10, 0)
        self.event = Event.objects.create(
            title='Evento Test',
            description='Test',
            date=test_date,
            time=test_time,
            creator=self.user,
            place_name='Test Location'
        )
        self.event.calendars.add(self.calendar)
        self.client = APIClient()

    def test_add_label_to_event_authenticated(self):
        """Test añadir label a evento (autenticado)."""
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            f'/api/v1/events/{self.event.id}/labels/add/',
            {'label_id': self.label.id},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertIn(self.label, self.event.labels.all())

    def test_add_label_to_event_permission_denied(self):
        """Test que solo el creador puede añadir labels."""
        self.client.force_authenticate(user=self.other_user)
        response = self.client.post(
            f'/api/v1/events/{self.event.id}/labels/add/',
            {'label_id': self.label.id},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotIn(self.label, self.event.labels.all())


class RemoveLabelFromEventTests(TestCase):
    """Tests para remover labels de eventos."""

    def setUp(self):
        """Crear usuario, evento y label de prueba."""
        self.user = User.objects.create_user(username='testuser', email='test@test.com', password='testpass123')
        self.other_user = User.objects.create_user(username='other', email='other@test.com', password='testpass123')
        self.label = Label.objects.create(name='Trabajo', color='#3498DB', icon='briefcase', is_default=True)
        self.calendar = Calendar.objects.create(
            name='Mi Calendario',
            description='Test',
            creator=self.user,
            privacy='PRIVATE'
        )
        test_date = date.today() + timedelta(days=1)
        test_time = time(10, 0)
        self.event = Event.objects.create(
            title='Evento Test',
            description='Test',
            date=test_date,
            time=test_time,
            creator=self.user,
            place_name='Test Location'
        )
        self.event.calendars.add(self.calendar)
        self.event.labels.add(self.label)
        self.client = APIClient()

    def test_remove_label_from_event(self):
        """Test remover label de evento."""
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(
            f'/api/v1/events/{self.event.id}/labels/remove/{self.label.id}/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertNotIn(self.label, self.event.labels.all())

    def test_remove_label_permission_denied(self):
        """Test que solo el creador puede remover labels."""
        self.client.force_authenticate(user=self.other_user)
        response = self.client.delete(
            f'/api/v1/events/{self.event.id}/labels/remove/{self.label.id}/'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn(self.label, self.event.labels.all())


class FilterEventsByLabelTests(TestCase):
    """Tests para filtrar eventos por label."""

    def setUp(self):
        """Crear usuario, eventos, calendario y labels de prueba."""
        self.user = User.objects.create_user(username='testuser', email='test@test.com', password='testpass123')
        self.label_trabajo = Label.objects.create(name='Trabajo', color='#3498DB', icon='briefcase', is_default=True)
        self.label_personal = Label.objects.create(name='Personal', color='#E74C3C', icon='user', is_default=True)
        self.calendar = Calendar.objects.create(
            name='Mi Calendario',
            description='Test',
            creator=self.user,
            privacy='PRIVATE'
        )

        test_time = time(10, 0)

        self.event1 = Event.objects.create(
            title='Evento Trabajo 1',
            description='Test',
            date=date.today() + timedelta(days=1),
            time=test_time,
            creator=self.user,
            place_name='Test Location'
        )
        self.event1.calendars.add(self.calendar)
        self.event1.labels.add(self.label_trabajo)

        self.event2 = Event.objects.create(
            title='Evento Trabajo 2',
            description='Test',
            date=date.today() + timedelta(days=2),
            time=test_time,
            creator=self.user,
            place_name='Test Location'
        )
        self.event2.calendars.add(self.calendar)
        self.event2.labels.add(self.label_trabajo)

        self.event3 = Event.objects.create(
            title='Evento Personal',
            description='Test',
            date=date.today() + timedelta(days=3),
            time=test_time,
            creator=self.user,
            place_name='Test Location'
        )
        self.event3.calendars.add(self.calendar)
        self.event3.labels.add(self.label_personal)

        self.client = APIClient()

    def test_filter_events_by_label(self):
        """Test filtrar eventos por label."""
        response = self.client.get('/api/v1/events/filter-by-label/?label=Trabajo')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        event_titles = {event['title'] for event in response.data}
        self.assertSetEqual(event_titles, {'Evento Trabajo 1', 'Evento Trabajo 2'})

    def test_filter_events_by_label_no_results(self):
        """Test filtrar eventos por label sin resultados."""
        Label.objects.create(name='Vacio', color='#000000', is_default=False)
        response = self.client.get('/api/v1/events/filter-by-label/?label=Vacio')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_filter_events_by_nonexistent_label(self):
        """Test filtrar eventos por label inexistente."""
        response = self.client.get('/api/v1/events/filter-by-label/?label=Inexistente')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)


class FilterCalendarsByLabelTests(TestCase):
    """Tests para filtrar calendarios por label."""

    def setUp(self):
        """Crear usuario, calendarios y labels de prueba."""
        self.user = User.objects.create_user(username='testuser', email='test@test.com', password='testpass123')
        self.label_trabajo = Label.objects.create(name='Trabajo', color='#3498DB', icon='briefcase', is_default=True)
        self.label_personal = Label.objects.create(name='Personal', color='#E74C3C', icon='user', is_default=True)

        self.calendar1 = Calendar.objects.create(
            name='Calendario Trabajo 1',
            description='Test',
            creator=self.user,
            privacy='PRIVATE'
        )
        self.calendar1.labels.add(self.label_trabajo)

        self.calendar2 = Calendar.objects.create(
            name='Calendario Trabajo 2',
            description='Test',
            creator=self.user,
            privacy='PRIVATE'
        )
        self.calendar2.labels.add(self.label_trabajo)

        self.calendar3 = Calendar.objects.create(
            name='Calendario Personal',
            description='Test',
            creator=self.user,
            privacy='PRIVATE'
        )
        self.calendar3.labels.add(self.label_personal)

        self.client = APIClient()

    def test_filter_calendars_by_label(self):
        """Test filtrar calendarios por label."""
        response = self.client.get('/api/v1/calendars/filter-by-label/?label=Trabajo')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        calendar_names = {calendar['name'] for calendar in response.data}
        self.assertSetEqual(calendar_names, {'Calendario Trabajo 1', 'Calendario Trabajo 2'})

    def test_filter_calendars_by_label_no_results(self):
        """Test filtrar calendarios por label sin resultados."""
        Label.objects.create(name='Vacio', color='#000000', is_default=False)
        response = self.client.get('/api/v1/calendars/filter-by-label/?label=Vacio')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_filter_calendars_by_nonexistent_label(self):
        """Test filtrar calendarios por label inexistente."""
        response = self.client.get('/api/v1/calendars/filter-by-label/?label=Inexistente')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)