from django.contrib.gis.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models import Q
from django.utils import timezone

class Usuario(AbstractUser):
    email = models.EmailField(unique=True) 
    pronombres = models.CharField(max_length=150, blank=True)
    biografia = models.TextField(blank=True)
    link = models.URLField(blank=True)
    foto = models.ImageField(upload_to='perfiles/', null=True, blank=True)
    seguidos = models.ManyToManyField('self', symmetrical=False, related_name='seguidores_set', blank=True)
    calendarios_seguidos = models.ManyToManyField('Calendario', related_name='suscriptores', blank=True)

    @property
    def total_seguidores(self):
        return self.seguidores_set.count()

    @property
    def total_seguidos(self):
        return self.seguidos.count()
    
    @property
    def total_calendarios_seguidos(self):
        return self.calendarios_seguidos.count()
    

    def __str__(self):
        return self.username

class Calendario(models.Model):
    ESTADOS_PRIVACIDAD = [
        ('PRIVADO', 'Privado'),
        ('AMIGOS', 'Amigos'),
        ('PUBLICO', 'Público'),
    ]
    
    ORIGEN_CHOICES = [
        ('CURRENT', 'Nativo de Current'),
        ('GOOGLE', 'Google Calendar'),
        ('APPLE', 'Apple Calendar'),
    ]
    
    origen = models.CharField(max_length=20, choices=ORIGEN_CHOICES, default='CURRENT')
    id_externo = models.CharField(max_length=255, null=True, blank=True, db_index=True) 
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    portada = models.FileField(upload_to='portadas_calendarios/', null=True, blank=True)
    estado = models.CharField(max_length=10, choices=ESTADOS_PRIVACIDAD, default='PRIVADO')
    creador = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='calendarios_creados')
    fecha_creacion = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['creador'],
                condition=Q(estado='PRIVADO'),
                name='unico_calendario_privado_por_usuario'
            )
        ]

    @property
    def num_suscriptores(self):
        return self.suscriptores.count()

    def __str__(self):
        return f"{self.nombre} ({self.get_origen_display()})"

class Evento(models.Model):
    titulo = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    nombre_lugar = models.CharField(max_length=255, blank=True) 
    ubicacion = models.PointField(geography=True, spatial_index=True, null=True, blank=True)
    fecha = models.DateField()
    hora = models.TimeField()
    foto = models.ImageField(upload_to='fotos_eventos/', null=True, blank=True)
    recurrencia = models.IntegerField(null=True, blank=True)
    id_externo = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    calendarios = models.ManyToManyField(Calendario, related_name='eventos')
    fecha_creacion = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.titulo} - {self.fecha}"

class MockElement(models.Model):
    nombre = models.CharField(max_length=100)
    punto_geografico = models.PointField()
    created_at = models.DateTimeField(auto_now_add=True)