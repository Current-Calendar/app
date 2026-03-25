# Generated migration to remove unique private calendar per user constraint

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0018_event_likes_count_eventlike'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='calendar',
            name='unique_private_calendar_per_user',
        ),
    ]
