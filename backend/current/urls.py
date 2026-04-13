"""
URL configuration for current project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from drf_spectacular.views import SpectacularSwaggerView, SpectacularAPIView
from graphene_django.views import GraphQLView
from rest_framework import routers
from main import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from main.users import views as user_views
from main.calendars import views as calendar_views
from main.events import views as event_views
from main.comments import views as comment_views
from main.radar import views as radar_views
from main.auth import views as auth_views
from main.notifications import views as notification_views
from main.reports import views as report_views
from main.labels import CategoryViewSet, EventTagViewSet
from main.ads import views as ads_views
from django.urls import path, include
from django.contrib import admin
from django.views.decorators.csrf import csrf_exempt
from django.conf.urls.static import static
from django.conf import settings

api_router = routers.DefaultRouter()

# Registrar viewsets para categorías y tags
api_router.register(r'categories', CategoryViewSet, basename='category')
api_router.register(r'event-tags', EventTagViewSet, basename='event-tag')

urlpatterns = [
    path('api/v1/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/v1/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path("graphql/", csrf_exempt(GraphQLView.as_view(graphiql=True))),
    path("api/v1/", include(api_router.urls)),
    path('admin/', admin.site.urls),
    path('api/v1/auth/recover-password/', auth_views.recover_password, name='recover_password'),
    path('api/v1/auth/set-new-password/', auth_views.set_new_password, name='set_new_password'),
    path('api/v1/auth/validate-reset-token/', auth_views.validate_reset_token, name='validate_reset_token'),
    path('api/v1/auth/google-auth', auth_views.google_authorization, name='google_authorization'),
    path('api/v1/auth/oauth2callback/', auth_views.google_oauth2callback, name='google_oauth2_callback'),
    path('oauth2callback/', auth_views.google_oauth2callback, name='google_oauth2_callback_root'),
    path('api/v1/auth/register/', auth_views.register_user, name='register'),
    path('api/v1/auth/accept-legal/', auth_views.accept_legal_documents, name='accept_legal_documents'),
    path('api/v1/users/search/', user_views.search_users, name='search_users'),
    path('api/v1/users/<int:pk>/follow/', user_views.follow_or_unfollow_user, name='follow_users_logic'),
    path('api/v1/users/<int:pk>/followers/', user_views.get_followers, name='get_followers'),
    path('api/v1/users/<int:pk>/following/', user_views.get_following, name='get_following'),
    path('api/v1/users/<int:pk>/followed_calendars/', user_views.get_followed_calendars, name='followed_calendars'),
    path('api/v1/users/by-username/<str:username>/', user_views.get_user_by_username, name='get_user_by_username'),
    path('api/v1/users/<int:pk>/', user_views.get_user_by_id, name='get_user'),
    path('api/v1/users/me/', user_views.get_own_user, name='get_profile'),
    path('api/v1/users/me/edit/', user_views.edit_profile, name='edit_profile'),
    path('api/v1/users/me/plan/', user_views.update_plan, name='update_plan'),
    path('api/v1/users/me/delete/', user_views.delete_own_user, name='delete_own_user'),
    path('api/v1/calendars/<int:calendar_id>/publish/', calendar_views.publish_calendar, name='publish_calendar'),
    path('api/v1/calendars/<int:calendar_id>/delete/', calendar_views.delete_calendar, name='delete_calendar'),
    path('api/v1/calendars/<int:calendar_id>/edit/', calendar_views.edit_calendar, name='edit_calendar'),
    path('api/v1/calendars/<int:calendar_id>/subscribe/', calendar_views.subscribe_calendar, name='subscribe_calendar'),
    path('api/v1/calendars/<int:calendar_id>/like/', calendar_views.toggle_like_calendar, name='like_calendar'),
    path('api/v1/calendars/<int:calendar_id>/invite/', calendar_views.invite_calendar, name='invite_calendar'),
    path('api/v1/calendars/create/', calendar_views.create_calendar, name='create_calendar'),
    path('api/v1/calendars/list/', calendar_views.list_calendars, name='list_calendarios'),
    path('api/v1/calendars/subscribed/', calendar_views.list_subscribed_calendars, name='list_subscribed_calendars'),
    path('api/v1/calendars/my-calendars/', calendar_views.list_my_calendars, name='list_my_calendarios'),
    path('api/v1/calendars/co_owned/', calendar_views.list_co_owned_calendars, name='list_co_owned_calendars'),
    path('api/v1/calendars/import-google-calendar/', calendar_views.import_google_calendar, name='import_google_calendar'),
    path('api/v1/calendars/import-ios-calendar/', calendar_views.iOS_calendar_import, name='import_ios_calendar'),
    path('api/v1/calendars/import-ics/', calendar_views.ics_import, name='import_ics_calendar'),
    path('api/v1/calendars/<int:calendar_id>/export/', calendar_views.export_to_ics, name='export_to_ics'),
    path('api/v1/calendars/<int:calendar_id>/share/', calendar_views.get_calendar_share_info, name='get_calendar_share_info'),
    path('api/v1/calendars/<int:calendar_id>/leave/', calendar_views.leave_calendar, name='leave_calendar'),
    path('share/calendar/<int:calendar_id>/', calendar_views.share_calendar_html, name='share_calendar_html'),
    path('api/v1/events/create/', event_views.create_event, name='create_event'),
    path('api/v1/events/<int:event_id>/edit/', event_views.edit_event, name='edit_event'),
    path('api/v1/events/<int:event_id>/like/', event_views.toggle_like_event, name='like_event'),
    path('api/v1/events/<int:event_id>/save/', event_views.toggle_save_event, name='save_event'),
    path('api/v1/events/<int:event_id>/rsvp/', event_views.rsvp_event, name='rsvp_event'),
    path('api/v1/events/<int:event_id>/invite/', event_views.invite_event, name='invite_event'),
    path('api/v1/events/list', event_views.list_events, name='list_events'),
    path('api/v1/events/list/<int:calendar_id>', event_views.list_events_from_calendar, name='list_events_from_calendar'),
    path('api/v1/events/asign-to-calendar/', event_views.asign_event_to_calendar, name='asign_event_to_calendar'),
    path('api/v1/events/deasign-from-calendar/', event_views.deasign_event_from_calendar, name='deasign_event_from_calendar'),
    path('api/v1/events/<int:event_id>/delete/', event_views.delete_event, name='delete_event'),
    path('api/v1/comments/', comment_views.comments_collection, name='comments_collection'),
    path('api/v1/comments/<int:comment_id>/replies/', comment_views.list_replies, name='list_replies'),
    path('api/v1/comments/<int:comment_id>/delete/', comment_views.delete_comment, name='delete_comment'),
    path('api/v1/radar/', radar_views.radar_events, name='radar_events'),
    path('api/v1/notifications/', notification_views.get_notifications, name='get_notifications'),
    path('api/v1/notifications/<int:id>/', notification_views.handle_invite, name='handle_invite'),
    path('api/v1/notifications/<int:id>/read/', notification_views.mark_notification_as_read, name='mark_notification_as_read'),
    path('api/v1/notifications/read-all/', notification_views.mark_all_notifications_as_read, name='mark_all_notifications_as_read'),
    path('api/v1/reports/create/', report_views.create_report, name='create_report'),
    path('api/v1/events/<int:event_id>/chat/', views.event_chat_history, name='event-chat-history'),
    path('api/v1/recommendations/calendars/', calendar_views.recommended_calendars, name='recommended_calendars'),
    path('api/v1/recommendations/events/', event_views.recommended_events, name='recommended_events'),
    path('api/v1/ads/config/', ads_views.get_ads_config, name='ads_config'),
    path('silk/', include('silk.urls', namespace='silk'))
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
