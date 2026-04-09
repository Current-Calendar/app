from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0024_migrate_friends_calendars_to_private'),
    ]

    operations = [
        migrations.AlterField(
            model_name='calendar',
            name='privacy',
            field=models.CharField(choices=[('PRIVATE', 'Private'), ('PUBLIC', 'Public')], default='PRIVATE', max_length=10),
        ),
    ]
