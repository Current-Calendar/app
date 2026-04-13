from django.db import migrations


def seed_default_categories_and_tags(apps, schema_editor):
    Category = apps.get_model('main', 'Category')
    EventTag = apps.get_model('main', 'EventTag')

    categories_data = {
        'Trabajo': [
            'Reunión', 'Presentación', 'Deadline', 'Conferencia',
            'Capacitación', 'Viaje', 'Congreso', 'Team Building',
            'Tarea', 'Proyecto', 'Entrevista', 'Llamada',
        ],
        'Personal': [
            'Aniversario', 'Cumpleaños', 'Compra', 'Casa',
            'Familia', 'Amigos', 'Cita', 'Descanso',
        ],
        'Deporte': [
            'Entrenamiento', 'Partido', 'Competición', 'Clase',
            'Gimnasio', 'Carrera', 'Torneo', 'Liga',
        ],
        'Estudios': [
            'Clase', 'Examen', 'Proyecto', 'Taller',
            'Seminario', 'Defensa', 'Entrega', 'Estudio',
        ],
        'Salud': [
            'Cita Médica', 'Terapia', 'Revisión', 'Vacuna',
            'Cirugía', 'Seguimiento', 'Chequeo',
        ],
        'Ocio': [
            'Cine', 'Música', 'Teatro', 'Viaje',
            'Lectura', 'Videojuegos', 'Concierto', 'Festival', 'Fiesta',
        ],
    }

    for category_name, tags in categories_data.items():
        category, _ = Category.objects.get_or_create(name=category_name)
        for tag_name in tags:
            EventTag.objects.get_or_create(name=tag_name, category=category)


def reverse_seed_default_categories_and_tags(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0027_alter_category_options_and_more'),
    ]

    operations = [
        migrations.RunPython(
            seed_default_categories_and_tags,
            reverse_seed_default_categories_and_tags,
        ),
    ]
