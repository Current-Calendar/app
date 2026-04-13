from rest_framework import permissions
import math
from .entitlements import get_user_features
from .models import Calendar, Event, Notification, User, CalendarInvitation
from .privacy import normalize_calendar_privacy
from django.shortcuts import get_object_or_404

class CanCreateCalendar(permissions.BasePermission):
    message = "You have reached the maximum amount of calendars allowed for your plan."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        requested_privacy = normalize_calendar_privacy(request.data.get('privacy', 'PRIVATE'))
        user_features = get_user_features(request.user)

        if requested_privacy == 'PUBLIC':
            calendar_limit = user_features['max_public_calendars']
            self.message = "You have reached the maximum amount of public calendars allowed for your plan."

        elif requested_privacy == 'PRIVATE': 
            calendar_limit = user_features['max_private_calendars']
            self.message = "You have reached the maximum amount of private calendars allowed for your plan."
        
        else:
            return True

        if calendar_limit == math.inf:
            return True
        
        calendars_count = Calendar.objects.filter(creator=request.user, privacy=requested_privacy).count()

        return calendars_count < calendar_limit

class CanChangePrivacy(permissions.BasePermission):
    message = "You cannot change the privacy of this calendar due to the limitations of your plan."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.method not in ['PUT', 'PATCH']:
            return True
        
        original_calendar_privacy = Calendar.objects.filter(id=view.kwargs.get('calendar_id')).values_list('privacy', flat=True).first()

        new_privacy = normalize_calendar_privacy(request.data.get('privacy'), default=None)
        if new_privacy is None or new_privacy == original_calendar_privacy:
            return True
        
        if new_privacy not in ['PUBLIC', 'PRIVATE']:
            return True

        user_features = get_user_features(request.user)

        if new_privacy == 'PUBLIC':
            calendar_limit = user_features['max_public_calendars']
            self.message = "You have reached the maximum amount of public calendars allowed for your plan."

        elif new_privacy == 'PRIVATE': 
            calendar_limit = user_features['max_private_calendars']
            self.message = "You have reached the maximum amount of private calendars allowed for your plan."
        
        else:
            return True

        if calendar_limit == math.inf:
            return True
        
        calendars_count = Calendar.objects.filter(creator=request.user, privacy=new_privacy).count()

        return calendars_count < calendar_limit


class CanAddFavoriteCalendar(permissions.BasePermission):
    message = "You have reached the maximum amount of favorite calendars allowed for your plan."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        user_features = get_user_features(request.user)
        favorite_limit = user_features['max_favorite_calendars']

        if favorite_limit == math.inf:
            return True
        
        favorite_calendars_count = request.user.subscribed_calendars.count()

        return favorite_calendars_count < favorite_limit

class CanAccessAnalytics(permissions.BasePermission):
    message = "Your current plan does not allow access to analytics."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        user_features = get_user_features(request.user)
        return user_features['can_access_analytics']

class CanCustomizeCalendars(permissions.BasePermission):
    message = "Your current plan does not allow customizing calendars."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        user_features = get_user_features(request.user)
        return user_features['can_customize_calendars']

class CanCoOwnCalendars(permissions.BasePermission):
    message = "Your current plan does not allow co-owning calendars."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        sender_features = get_user_features(request.user)
        invitee = get_object_or_404(User, id=request.data.get('user'))
        invitee_features = get_user_features(invitee)
        if not sender_features['can_co_own_calendars']:
            self.message = "Your current plan does not allow co-owning calendars"
            return False
        
        if not invitee_features['can_co_own_calendars']:
            self.message = "The user you are trying to invite cannot co-own calendars with their current plan"
            return False
        
        return True

class CanAcceptCalendarInvites(permissions.BasePermission):
    message = "Your current plan does not allow accepting this calendar invitation."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        notification = get_object_or_404(Notification, pk=view.kwargs.get('id'))

        if notification.type != 'CALENDAR_INVITE':
            return True

        action = request.data.get('status')
        if action == 'DECLINE':
            return True

        invitation = CalendarInvitation.objects.filter(
            calendar=notification.related_calendar,
            invitee=request.user,
            accepted=None,
        ).order_by('-id').first()

        if not invitation:
            return True

        user_features = get_user_features(request.user)

        if invitation.permission == "EDIT":
            self.message = "Your current plan does not allow accepting edit invitations for calendars."
            return user_features['can_co_own_calendars']

        if invitation.permission == "VIEW":
            favorite_limit = user_features['max_favorite_calendars']

            if favorite_limit == math.inf:
                return True

            favorite_calendars_count = request.user.subscribed_calendars.count()

            if favorite_calendars_count >= favorite_limit:
                self.message = (
                    "You cannot accept this invitation because you have already reached "
                    "the maximum number of favorite calendars allowed by your plan."
                )
                return False

            return True

        return True
    
class CanReceiveCalendarViewInvites(permissions.BasePermission):
    message = "This user cannot receive more invitations because they have already exceeded the maximum number of favorite calendars allowed by their plan."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        invitee_id = request.data.get('user')
        if not invitee_id:
            self.message = "Invitee user is required."
            return False

        invitee = get_object_or_404(User, id=invitee_id)
        invitee_features = get_user_features(invitee)
        favorite_limit = invitee_features['max_favorite_calendars']

        if favorite_limit == math.inf:
            return True

        favorite_calendars_count = invitee.subscribed_calendars.count()

        return favorite_calendars_count < favorite_limit


class IsOwnerOrCoOwnerOfCalendar(permissions.BasePermission):
    """
    Permiso que verifica si el usuario es owner o coowner del calendario.
    Se usa para operaciones en categorías y tags de un calendario específico.
    """
    message = "You must be the owner or coowner of this calendar to perform this action."

    def has_object_permission(self, request, view, obj):
        # obj es el Calendar
        return request.user == obj.creator or request.user in obj.co_owners.all()


class CanAssignCategoryToCalendar(permissions.BasePermission):
    """
    Permite acciones de categoría sobre calendario cuando el usuario es owner/coowner.
    Diseñada para acciones custom de `CategoryViewSet` basadas en `calendar_id` del body.
    """
    message = "You must be the owner or coowner of this calendar to perform this action."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.user.is_staff:
            return True

        calendar_id = request.data.get('calendar_id') if request.data else None

        # Dejamos que la view devuelva 400 si falta calendar_id
        if not calendar_id:
            return True

        # Dejamos que la view devuelva 404 si calendar_id no existe
        try:
            calendar = Calendar.objects.get(id=calendar_id)
        except Calendar.DoesNotExist:
            return True

        return request.user == calendar.creator or request.user in calendar.co_owners.all()

    def has_object_permission(self, request, view, obj):
        # No validamos contra obj porque aquí obj es Category
        return True


class CanManageEventTagsForEvent(permissions.BasePermission):
    """
    Permite añadir/remover tags de evento cuando el usuario es owner/coowner
    de al menos un calendario que contiene el evento.
    Diseñada para acciones custom de `EventTagViewSet` basadas en `event_id` del body.
    """
    message = "You must be the owner or coowner of a calendar containing this event."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.user.is_staff:
            return True

        event_id = request.data.get('event_id') if request.data else None

        # Dejamos que la view devuelva 400 si falta event_id
        if not event_id:
            return True

        # Dejamos que la view devuelva 404 si event_id no existe
        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return True

        for calendar in event.calendars.all():
            if request.user == calendar.creator or request.user in calendar.co_owners.all():
                return True

        return False

    def has_object_permission(self, request, view, obj):
        # No validamos contra obj porque aquí obj es EventTag
        return True


class CanManageCategoriesAndTags(permissions.BasePermission):
    """
    Permiso dual:
    - has_permission: Valida que el usuario sea admin O que intente asignar a su calendario
    - has_object_permission: Valida ownership de la categoría/tag a nivel de calendario
    """
    message = "You don't have permission to manage categories and tags."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Admin siempre puede
        if request.user.is_staff:
            return True
        
        # Para operaciones de assign/add: buscar calendar_id en kwargs o data
        calendar_id = request.parser_context['kwargs'].get('calendar_id') if hasattr(request, 'parser_context') else None
        if not calendar_id and request.data:
            calendar_id = request.data.get('calendar_id')
        
        # Si hay calendar_id, validar que sea owner/coowner
        if calendar_id:
            try:
                calendar = Calendar.objects.get(id=calendar_id)
                return request.user == calendar.creator or request.user in calendar.co_owners.all()
            except Calendar.DoesNotExist:
                return False
        
        return True

    def has_object_permission(self, request, view, obj):
        # Para operaciones CRUD en categorías/tags (solo admin)
        if request.method in ['GET']:
            return True
        
        return request.user.is_staff
        