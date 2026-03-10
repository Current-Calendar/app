from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from datetime import date, time
from django.db import connection
from main.models import User, Calendar, Event, MockElement

class Command(BaseCommand):
    help = 'Generates initial test data for the Current application (PostgreSQL)'

    def handle(self, *args, **kwargs):
        self.stdout.write('Cleaning the database...')

        Event.objects.all().delete()
        Calendar.objects.all().delete()
        MockElement.objects.all().delete()
        User.objects.all().delete()

        self.stdout.write('Resetting PostgreSQL IDs...')
        with connection.cursor() as cursor:
            try:
                cursor.execute(f'ALTER SEQUENCE {Event._meta.db_table}_id_seq RESTART WITH 1;')
                cursor.execute(f'ALTER SEQUENCE {Calendar._meta.db_table}_id_seq RESTART WITH 1;')
                cursor.execute(f'ALTER SEQUENCE {MockElement._meta.db_table}_id_seq RESTART WITH 1;')
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Warning: Could not reset SQL sequences ({e})'))

        self.stdout.write('Creating test users...')
        user1 = User.objects.create_user(
            username='ana_garcia',
            email='ana@example.com',
            password='password123',
            pronouns='She/her',
            bio='Full Stack Developer. Passionate about code and the mountains.',
            photo='profiles/avatar.png'
        )
        user2 = User.objects.create_user(
            username='carlos_dev',
            email='carlos@example.com',
            password='password123',
            bio='Always learning something new.',
            link='https://github.com/carlosdev',
            photo='profiles/avatar.png'
        )
        user3 = User.objects.create_user(
            username='gym_fit',
            email='info@gymfit.com',
            password='password123',
            bio='Your trusted gym.',
            photo='profiles/avatar.png'
        )

        User.objects.create_user(
            username='admin',
            email='admin@currentcalendar.es',
            password='password123',
            bio='Your trusted admin.',
            photo='profiles/avatar.png',
            is_superuser=True,
            is_staff=True
        )

        user1.following.add(user2, user3)
        user2.following.add(user1)

        self.stdout.write('Creating calendars...')
        cal_ana_private = Calendar.objects.create(
            name="Ana's Personal",
            privacy='PRIVATE',
            creator=user1
        )
        cal_ana_public = Calendar.objects.create(
            name="Tech Events",
            privacy='PUBLIC',
            creator=user1,
            origin='GOOGLE',
            external_id='google_123',
            cover='covers/cover.jpeg'
        )
        cal_carlos_friends = Calendar.objects.create(
            name="Carlos Plans",
            privacy='FRIENDS',
            creator=user2
        )
        cal_gym = Calendar.objects.create(
            name="GymFit Classes",
            privacy='PUBLIC',
            creator=user3
        )

        user2.subscribed_calendars.add(cal_gym, cal_ana_public)

        self.stdout.write('Creating geolocated events...')
        event_tech = Event.objects.create(
            title="Django & React Talk",
            description="Learn how to connect React with GeoDjango.",
            place_name="Google Campus",
            location=Point(-3.7038, 40.4168, srid=4326),
            date=date(2026, 3, 15),
            time=time(18, 30),
            photo='events/event.jpg',
            creator=user1
        )
        event_tech.calendars.add(cal_ana_public)

        event_dinner = Event.objects.create(
            title="Birthday Dinner",
            place_name="El Buen Sabor Restaurant",
            description="See you at the usual restaurant.",
            date=date(2026, 3, 20),
            time=time(21, 00),
            photo='events/event.jpg',
            creator=user2
        )
        event_dinner.calendars.add(cal_carlos_friends, cal_ana_private)

        event_gym = Event.objects.create(
            title="Intensive Spinning",
            place_name="Main Hall",
            location=Point(-3.6900, 40.4200, srid=4326),
            date=date(2026, 2, 25),
            time=time(10, 00),
            photo='events/event.jpg',
            creator=user3
        )
        event_gym.calendars.add(cal_gym, cal_carlos_friends)

        event_triana = Event.objects.create(
            title="Tapas Tour in Triana",
            place_name="Triana Market (Plaza del Altozano)",
            description="Discover the best tapas bars in the heart of Triana. A gastronomic experience you cannot miss!",
            location=Point(-6.0062, 37.3866, srid=4326),
            date=date(2026, 3, 12),
            time=time(20, 30),
            photo='events/event.jpg',
            creator=user3
        )

        event_centro = Event.objects.create(
            title="Sunset Photos at Las Setas",
            place_name="Metropol Parasol (Plaza de la Encarnacion)",
            location=Point(-5.9930, 37.3929, srid=4326),
            date=date(2026, 3, 18),
            time=time(19, 15),
            creator=user3,
            photo='events/event.jpg',
        )

        event_heliopolis = Event.objects.create(
            title="Picnic at Alamillo Park",
            place_name="Alamillo Park (main area)",
            location=Point(-6.0038, 37.4236, srid=4326),
            date=date(2026, 3, 23),
            time=time(12, 0),
            creator=user3,
            photo='events/event.jpg',
        )

        event_triana.calendars.add(cal_gym)
        event_centro.calendars.add(cal_gym)
        event_heliopolis.calendars.add(cal_gym)

        self.stdout.write('Creating MockElements...')
        MockElement.objects.create(
            name="Madrid Test Point",
            geo_point=Point(-3.7038, 40.4168, srid=4326)
        )

        self.stdout.write(self.style.SUCCESS('Test data generated successfully! PostgreSQL sequences reset.'))
