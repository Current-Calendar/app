from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from datetime import date, time
from django.db import connection
from main.models import Usuario, Calendario, Evento, MockElement, EtiquetaCalendario

class Command(BaseCommand):
    help = 'Genera datos de prueba iniciales para la aplicación Current (PostgreSQL)'

    def handle(self, *args, **kwargs):
        self.stdout.write('Limpiando la base de datos...')
        
        Evento.objects.all().delete()
        Calendario.objects.all().delete()
        EtiquetaCalendario.objects.all().delete()
        MockElement.objects.all().delete()
        Usuario.objects.exclude(is_superuser=True).delete()

        self.stdout.write('Reseteando los IDs de PostgreSQL...')
        with connection.cursor() as cursor:
            try:
                cursor.execute(f'ALTER SEQUENCE {Evento._meta.db_table}_id_seq RESTART WITH 1;')
                cursor.execute(f'ALTER SEQUENCE {Calendario._meta.db_table}_id_seq RESTART WITH 1;')
                cursor.execute(f'ALTER SEQUENCE {MockElement._meta.db_table}_id_seq RESTART WITH 1;')
                cursor.execute(f'ALTER SEQUENCE {EtiquetaCalendario._meta.db_table}_id_seq RESTART WITH 1;')
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Aviso: No se pudieron resetear las secuencias SQL ({e})'))

        self.stdout.write('Creando usuarios de prueba...')
        user1 = Usuario.objects.create_user(
            username='ana_garcia', 
            email='ana@example.com', 
            password='password123',
            pronombres='Ella/su',
            biografia='Desarrolladora Full Stack. Apasionada por el código y la montaña.',
            foto='perfiles/avatar.png'
        )
        user2 = Usuario.objects.create_user(
            username='carlos_dev', 
            email='carlos@example.com', 
            password='password123',
            biografia='Siempre aprendiendo algo nuevo.',
            link='https://github.com/carlosdev',
            foto='perfiles/avatar.png'
        )
        user3 = Usuario.objects.create_user(
            username='gym_fit', 
            email='info@gymfit.com', 
            password='password123',
            biografia='Tu gimnasio de confianza.',
            foto='perfiles/avatar.png'
        )

        user1.seguidos.add(user2, user3)
        user2.seguidos.add(user1)

        self.stdout.write('Creando calendarios...')
        cal_ana_priv = Calendario.objects.create(
            nombre="Personal Ana", 
            estado='PRIVADO', 
            creador=user1
        )
        cal_ana_pub = Calendario.objects.create(
            nombre="Eventos Tech", 
            estado='PUBLICO', 
            creador=user1, 
            origen='GOOGLE', 
            id_externo='google_123', 
            portada='portadas_calendarios/portada.jpeg'
        )
        cal_carlos_amigos = Calendario.objects.create(
            nombre="Planes Carlos", 
            estado='AMIGOS', 
            creador=user2
        )
        cal_gym = Calendario.objects.create(
            nombre="Clases GymFit", 
            estado='PUBLICO', 
            creador=user3
        )

        user2.calendarios_seguidos.add(cal_gym, cal_ana_pub)

        self.stdout.write('Creando etiquetas...')
        etiqueta_tech = EtiquetaCalendario.objects.create(nombre="Tecnología")
        etiqueta_fitness = EtiquetaCalendario.objects.create(nombre="Fitness")
        etiqueta_social = EtiquetaCalendario.objects.create(nombre="Social")

        cal_ana_pub.etiquetas.add(etiqueta_tech)
        cal_carlos_amigos.etiquetas.add(etiqueta_social)
        cal_gym.etiquetas.add(etiqueta_fitness)

        self.stdout.write('Creando eventos geolocalizados...')
        evento_tech = Evento.objects.create(
            titulo="Charla Django & React", 
            descripcion="Aprende a conectar React con GeoDjango.",
            nombre_lugar="Campus Google",
            ubicacion=Point(-3.7038, 40.4168, srid=4326),
            fecha=date(2026, 3, 15), 
            hora=time(18, 30),
            foto='fotos_eventos/evento.jpg',
            creador=user1
        )
        evento_tech.calendarios.add(cal_ana_pub)

        evento_cena = Evento.objects.create(
            titulo="Cena cumpleaños", 
            descripcion="Nos vemos en el restaurante de siempre.",
            fecha=date(2026, 3, 20), 
            hora=time(21, 00),
            creador=user2
        )
        evento_cena.calendarios.add(cal_carlos_amigos, cal_ana_priv)

        evento_gym = Evento.objects.create(
            titulo="Spinning Intensivo", 
            nombre_lugar="Sala Principal",
            ubicacion=Point(-3.6900, 40.4200, srid=4326),
            fecha=date(2026, 2, 25), 
            hora=time(10, 00),
            creador=user3
        )
        evento_gym.calendarios.add(cal_gym, cal_carlos_amigos)

        self.stdout.write('Creando MockElements...')
        MockElement.objects.create(
            nombre="Punto de prueba Madrid",
            punto_geografico=Point(-3.7038, 40.4168, srid=4326)
        )

        self.stdout.write(self.style.SUCCESS('¡Datos de prueba generados con éxito! Secuencias de PostgreSQL reiniciadas.'))