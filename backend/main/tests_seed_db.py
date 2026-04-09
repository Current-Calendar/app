from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from main.models import Calendar


class SeedDbCommandTests(TestCase):
    def test_seed_db_creates_no_friends_calendars(self):
        stdout = StringIO()

        call_command('seed_db', stdout=stdout)

        self.assertFalse(Calendar.objects.filter(privacy='FRIENDS').exists())
        self.assertTrue(
            Calendar.objects.filter(name='Carlos Plans', privacy='PRIVATE').exists()
        )
