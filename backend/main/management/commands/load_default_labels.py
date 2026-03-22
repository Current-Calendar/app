from django.core.management.base import BaseCommand
from main.models import Label


class Command(BaseCommand):
    help = 'Load default labels for events and calendars'

    def handle(self, *args, **kwargs):
        self.stdout.write('Loading default labels...')

        labels_data = [
            {'name': 'Trabajo', 'color': '#3498DB', 'icon': 'briefcase'},
            {'name': 'Personal', 'color': '#E74C3C', 'icon': 'user'},
            {'name': 'Viaje', 'color': '#F39C12', 'icon': 'plane'},
            {'name': 'Familia', 'color': '#9B59B6', 'icon': 'heart'},
            {'name': 'Amigos', 'color': '#1ABC9C', 'icon': 'users'},
            {'name': 'Deporte', 'color': '#27AE60', 'icon': 'dumbbell'},
            {'name': 'Salud', 'color': '#E67E22', 'icon': 'hospital'},
            {'name': 'Otro', 'color': '#95A5A6', 'icon': 'tag'},
        ]

        for label_data in labels_data:
            label, created = Label.objects.get_or_create(
                name=label_data['name'],
                defaults={
                    'color': label_data['color'],
                    'icon': label_data['icon'],
                    'is_default': True,
                    'created_at': None  # Django lo setea automáticamente con auto_now_add
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Label "{label.name}" created'))
            else:
                self.stdout.write(self.style.WARNING(f'✓ Label "{label.name}" already exists'))

        self.stdout.write(self.style.SUCCESS('Default labels loaded successfully!'))
