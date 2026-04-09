from django.db import migrations


def migrate_friends_to_private(apps, schema_editor):
    Calendar = apps.get_model('main', 'Calendar')
    Calendar.objects.filter(privacy='FRIENDS').update(privacy='PRIVATE')


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0023_alter_notification_type'),
    ]

    operations = [
        migrations.RunPython(migrate_friends_to_private, noop_reverse),
    ]
