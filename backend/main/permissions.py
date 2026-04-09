from rest_framework import permissions
import math
from .entitlements import get_user_features
from .models import Calendar, Notification, User
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
    message = "Your current plan does not allow accepting calendar invitations."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        notification = get_object_or_404(Notification, pk=view.kwargs.get('id'))
        if notification.type != 'CALENDAR_INVITE':
            return True

        user_features = get_user_features(request.user)
        return user_features['can_co_own_calendars']
        