from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from .models import User, Calendar, Event, Report, Feedback
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
        ('Profile', {'fields': ('pronouns', 'bio', 'link', 'photo','plan')}),
        ('Social',  {'fields': ('following', 'subscribed_calendars')}),
    )
    filter_horizontal = ('following', 'subscribed_calendars') 

    list_display = ('username', 'email', 'last_login', 'is_staff', 'total_following')    

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('reporter', 'reported_type', 'status', 'created_at')
    list_filter  = ('reported_type', 'status', 'created_at')

@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('user', 'type', 'created_at')
    list_filter  = ('type', 'created_at')
    search_fields = ('user__username', 'description')
    readonly_fields = ('user', 'type', 'description', 'created_at')
from django.contrib import admin

from .models import LoginLog


@admin.register(LoginLog)
class LoginLogAdmin(admin.ModelAdmin):
    list_display = ("user", "ip_address", "created_at")
    list_filter = ("created_at", "user")
    search_fields = ("user__username", "ip_address")
    ordering = ("-created_at",)

    # Solo lectura en formulario
    readonly_fields = ("user", "ip_address", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
