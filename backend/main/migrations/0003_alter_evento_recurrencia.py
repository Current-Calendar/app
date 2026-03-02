# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0002_calendario_fecha_creacion_evento_fecha_creacion_and_more'),
    ]

    operations = [
        # Drop integer column and re-add as jsonb since PostgreSQL cannot cast int->jsonb
        migrations.RemoveField(
            model_name='evento',
            name='recurrencia',
        ),
        migrations.AddField(
            model_name='evento',
            name='recurrencia',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
