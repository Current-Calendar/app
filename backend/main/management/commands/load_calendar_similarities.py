from django.core.management.base import BaseCommand
from main.rs.calendars import load_similarities

class Command(BaseCommand):
    help = 'Recalcula y guarda las similitudes entre calendarios'

    def handle(self, *args, **kwargs):
        self.stdout.write('Calculando similitudes...')
        load_similarities()
        self.stdout.write(self.style.SUCCESS('Similitudes cargadas correctamente'))