from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("main", "0002_report"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="calendar",
            name="unique_private_calendar_per_user",
        ),
    ]
