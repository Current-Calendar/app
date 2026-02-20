from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from datetime import date, time
from main.models import Usuario, Calendario, Evento

class Command(BaseCommand):
    help = 'Genera datos de prueba iniciales para la aplicación Current'

    def handle(self, *args, **kwargs):
        self.stdout.write('Limpiando la base de datos...')
        Evento.objects.all().delete()
        Calendario.objects.all().delete()
        Usuario.objects.exclude(is_superuser=True).delete()

        self.stdout.write('Creando usuarios de prueba...')
        user1 = Usuario.objects.create_user(
            username='ana_garcia', 
            email='ana@example.com', 
            password='password123',
            foto='perfiles/avatar.png'
        )
        user2 = Usuario.objects.create_user(
            username='carlos_dev', 
            email='carlos@example.com', 
            password='password123',
            foto='perfiles/avatar.png'
        )
        user3 = Usuario.objects.create_user(
            username='gym_fit', 
            email='info@gymfit.com', 
            password='password123',
            foto='perfiles/avatar.png'
        )

        user1.seguidos.add(user2, user3)
        user2.seguidos.add(user1)

        self.stdout.write('Creando calendarios...')
        cal_ana_priv = Calendario.objects.create(nombre="Personal Ana", estado='PRIVADO', creador=user1)
        cal_ana_pub = Calendario.objects.create(nombre="Eventos Tech", estado='PUBLICO', creador=user1, origen='GOOGLE', id_externo='google_123', portada='portadas/portada.jpeg')
        cal_carlos_amigos = Calendario.objects.create(nombre="Planes Carlos", estado='AMIGOS', creador=user2)
        cal_gym = Calendario.objects.create(nombre="Clases GymFit", estado='PUBLICO', creador=user3)

        user2.calendarios_seguidos.add(cal_gym, cal_ana_pub)

        self.stdout.write('Creando eventos geolocalizados...')
        evento_tech = Evento.objects.create(
            titulo="Charla Django & React", 
            nombre_lugar="Campus Google",
            ubicacion=Point(-3.7038, 40.4168, srid=4326),
            fecha=date(2026, 3, 15), 
            hora=time(18, 30),
            foto='eventos/evento.jpg'
        )
        evento_tech.calendarios.add(cal_ana_pub)

        evento_cena = Evento.objects.create(
            titulo="Cena cumpleaños", 
            fecha=date(2026, 3, 20), 
            hora=time(21, 00)
        )
        evento_cena.calendarios.add(cal_carlos_amigos, cal_ana_priv)

        evento_gym = Evento.objects.create(
            titulo="Spinning Intensivo", 
            nombre_lugar="Sala Principal",
            ubicacion=Point(-3.6900, 40.4200, srid=4326),
            fecha=date(2026, 2, 25), 
            hora=time(10, 00)
        )
        evento_gym.calendarios.add(cal_gym, cal_carlos_amigos)

        self.stdout.write(self.style.SUCCESS('¡Datos de prueba generados con éxito! Ya puedes probar la API.'))