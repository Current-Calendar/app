from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("main", "0004_calendar_cover"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="calendar",
            name="unique_private_calendar_per_user",
        ),
    ]
