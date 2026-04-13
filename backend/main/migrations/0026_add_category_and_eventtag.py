# Generated migration to add Category and EventTag labels system
# This migration:
# 1. Creates the new Category model
# 2. Creates the new EventTag model
# 3. Adds M2M relationships for Calendar.categories and Event.tags
# Note: CalendarLabel model is NOT created since we're moving to the new system

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0025_alter_calendar_privacy_choices'),
    ]

    operations = [
        # Create new Category model
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('description', models.TextField(blank=True)),
                ('order', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['order', 'name'],
            },
        ),
        
        # Create new EventTag model
        migrations.CreateModel(
            name='EventTag',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tags', to='main.category')),
            ],
            options={
                'unique_together': {('name', 'category')},
            },
        ),
        
        # Add M2M for Calendar.categories
        migrations.AddField(
            model_name='calendar',
            name='categories',
            field=models.ManyToManyField(blank=True, related_name='calendars', to='main.category'),
        ),
        
        # Add M2M for Event.tags
        migrations.AddField(
            model_name='event',
            name='tags',
            field=models.ManyToManyField(blank=True, related_name='events', to='main.eventtag'),
        ),
    ]
