from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0032_feedback_model'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='bio',
            field=models.TextField(blank=True, max_length=150),
        ),
        migrations.AlterField(
            model_name='calendar',
            name='description',
            field=models.TextField(blank=True, max_length=500),
        ),
    ]
