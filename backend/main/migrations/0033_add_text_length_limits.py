from django.db import migrations, models


def truncate_existing_text(apps, schema_editor):
    User = apps.get_model('main', 'User')
    Calendar = apps.get_model('main', 'Calendar')
    Event = apps.get_model('main', 'Event')

    for user in User.objects.only('id', 'pronouns', 'bio').iterator():
        update_fields = []
        if user.pronouns and len(user.pronouns) > 50:
            user.pronouns = user.pronouns[:50]
            update_fields.append('pronouns')
        if user.bio and len(user.bio) > 500:
            user.bio = user.bio[:500]
            update_fields.append('bio')
        if update_fields:
            user.save(update_fields=update_fields)

    for calendar in Calendar.objects.only('id', 'description').iterator():
        if calendar.description and len(calendar.description) > 1000:
            calendar.description = calendar.description[:1000]
            calendar.save(update_fields=['description'])

    for event in Event.objects.only('id', 'description').iterator():
        if event.description and len(event.description) > 1000:
            event.description = event.description[:1000]
            event.save(update_fields=['description'])


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0032_feedback_model'),
    ]

    operations = [
        migrations.RunPython(truncate_existing_text, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='calendar',
            name='description',
            field=models.TextField(blank=True, max_length=1000),
        ),
        migrations.AlterField(
            model_name='event',
            name='description',
            field=models.TextField(blank=True, max_length=1000),
        ),
        migrations.AlterField(
            model_name='user',
            name='bio',
            field=models.TextField(blank=True, max_length=500),
        ),
        migrations.AlterField(
            model_name='user',
            name='pronouns',
            field=models.CharField(blank=True, max_length=50),
        ),
    ]
