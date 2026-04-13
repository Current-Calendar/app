from django.core.management.base import BaseCommand
from django.db import transaction
from main.models import Category, EventTag


class Command(BaseCommand):
    help = 'Crea las categorías y tags predeterminados del sistema'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('╔════════════════════════════════════════════╗'))
        self.stdout.write(self.style.WARNING('║  Inicializando Categorías y Tags          ║'))
        self.stdout.write(self.style.WARNING('╚════════════════════════════════════════════╝'))

        with transaction.atomic():
            # Datos predeterminados
            categories_data = {
                'Trabajo': [
                    'Reunión', 'Presentación', 'Deadline', 'Conferencia', 
                    'Capacitación', 'Viaje', 'Congreso', 'Team Building',
                    'Tarea', 'Proyecto', 'Entrevista', 'Llamada'
                ],
                'Personal': [
                    'Aniversario', 'Cumpleaños', 'Compra', 'Casa', 
                    'Familia', 'Amigos', 'Cita', 'Descanso'
                ],
                'Deporte': [
                    'Entrenamiento', 'Partido', 'Competición', 'Clase', 
                    'Gimnasio', 'Carrera', 'Torneo', 'Liga'  
                ],
                'Estudios': [
                    'Clase', 'Examen', 'Proyecto', 'Taller', 
                    'Seminario', 'Defensa', 'Entrega', 'Estudio'
                ],
                'Salud': [
                    'Cita Médica', 'Terapia', 'Revisión', 'Vacuna', 
                    'Cirugía', 'Seguimiento', 'Chequeo'
                ],
                'Ocio': [
                    'Cine', 'Música', 'Teatro', 'Viaje', 
                    'Lectura', 'Videojuegos', 'Concierto', 'Festival', 'Fiesta'
                ],
            }

            created_categories = 0
            created_tags = 0

            for category_name, tags in categories_data.items():
                # Crear o obtener la categoría
                category, is_new = Category.objects.get_or_create(name=category_name)
                
                if is_new:
                    created_categories += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Categoría "{category_name}" creada')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'~ Categoría "{category_name}" ya existe')
                    )

                # Crear tags para la categoría
                for tag_name in tags:
                    tag, is_new = EventTag.objects.get_or_create(
                        name=tag_name,
                        category=category
                    )
                    
                    if is_new:
                        created_tags += 1
                        self.stdout.write(
                            self.style.SUCCESS(f'  └─ Tag "{tag_name}" creado')
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(f'  └─ Tag "{tag_name}" ya existe')
                        )

        self.stdout.write(self.style.SUCCESS('\n╔════════════════════════════════════════════╗'))
        self.stdout.write(self.style.SUCCESS(f'║  {created_categories} categorías y {created_tags} tags creados      ║'))
        self.stdout.write(self.style.SUCCESS('╚════════════════════════════════════════════╝\n'))
