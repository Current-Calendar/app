from django.db import migrations, models
import django.utils.timezone


def split_end_date_datetime(apps, schema_editor):
    """Extract date and time from old DateTimeField end_date into separate fields."""
    Event = apps.get_model('main', 'Event')
    for event in Event.objects.exclude(end_date_old__isnull=True):
        dt = event.end_date_old
        if dt:
            event.end_date = dt.date()
            event.end_time = dt.time()
            event.save(update_fields=['end_date', 'end_time'])


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0030_event_end_date'),
    ]

    operations = [
        # 1. Rename old DateTimeField to end_date_old
        migrations.RenameField(
            model_name='event',
            old_name='end_date',
            new_name='end_date_old',
        ),
        # 2. Add new DateField end_date
        migrations.AddField(
            model_name='event',
            name='end_date',
            field=models.DateField(blank=True, null=True),
        ),
        # 3. Add new TimeField end_time
        migrations.AddField(
            model_name='event',
            name='end_time',
            field=models.TimeField(blank=True, null=True),
        ),
        # 4. Migrate data from old datetime to new date + time fields
        migrations.RunPython(split_end_date_datetime, migrations.RunPython.noop),
        # 5. Remove old DateTimeField
        migrations.RemoveField(
            model_name='event',
            name='end_date_old',
        ),
    ]
