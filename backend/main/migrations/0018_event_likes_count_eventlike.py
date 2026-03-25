from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0017_calendar_unique_private_calendar_per_user'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='likes_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.CreateModel(
            name='EventLike',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='event_likes', to=settings.AUTH_USER_MODEL)),
                ('event', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='likes', to='main.event')),
            ],
            options={
                'constraints': [
                    models.UniqueConstraint(fields=['user', 'event'], name='unique_event_like_per_user'),
                ],
            },
        ),
        migrations.CreateModel(
            name='EventSave',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='event_saves', to=settings.AUTH_USER_MODEL)),
                ('event', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='saves', to='main.event')),
            ],
            options={
                'constraints': [
                    models.UniqueConstraint(fields=['user', 'event'], name='unique_event_save_per_user'),
                ],
            },
        ),
    ]
