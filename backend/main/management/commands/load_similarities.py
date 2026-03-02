from django.core.management.base import BaseCommand
from main.rs.calendars import load_similarities
from main.rs.events import load_events_similarities

class Command(BaseCommand):
    help = 'Recalcula y guarda las similitudes entre calendarios'

    def handle(self, *args, **kwargs):
        self.stdout.write('Calculando similitudes...')
        load_similarities()
        load_events_similarities()
        self.stdout.write(self.style.SUCCESS('Similitudes cargadas correctamente'))