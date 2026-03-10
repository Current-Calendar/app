from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from .models import User, Calendar, Event
from django.contrib.auth.admin import UserAdmin

@admin.register(Calendar)
class CalendarioAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'creador', 'estado', 'origen', 'fecha_creacion')
    list_filter  = ('estado', 'origen')
    search_fields = ('nombre', 'creador__username')

@admin.register(Event)
class EventoAdmin(GISModelAdmin):
    list_display = ('titulo', 'creador', 'nombre_lugar', 'fecha_creacion', 'fecha')
    search_fields = ('titulo', 'creador__username')
    filter_horizontal = ('calendarios',) 
@admin.register(Event)
class UsuarioAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Perfil', {'fields': ('pronombres', 'biografia', 'link', 'foto')}),
        ('Social',  {'fields': ('seguidos', 'calendarios_seguidos')}),
    )
    filter_horizontal = ('seguidos', 'calendarios_seguidos') 

    list_display = ('username', 'email', 'is_staff', 'total_seguidores')    
