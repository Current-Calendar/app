from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from .models import User, Calendar, Event
from django.contrib.auth.admin import UserAdmin

@admin.register(Calendar)
class CalendarioAdmin(admin.ModelAdmin):
    list_display = ('name', 'creator', 'privacy', 'origin', 'created_at')
    list_filter  = ('privacy', 'origin')
    search_fields = ('name', 'creator__username')

@admin.register(Event)
class EventoAdmin(GISModelAdmin):
    list_display = ('title', 'creator', 'place_name', 'created_at', 'date')
    search_fields = ('title', 'creator__username')
    filter_horizontal = ('calendars',) 
@admin.register(User)
class UsuarioAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Profile', {'fields': ('pronouns', 'biography', 'link', 'photo')}),
        ('Social',  {'fields': ('following', 'subscribed_calendars')}),
    )
    filter_horizontal = ('following', 'subscribed_calendars') 

    list_display = ('username', 'email', 'is_staff', 'total_following')    
