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
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from main import views
from main.users import views as user_views
from main.calendars import views as calendar_views
from main.events import views as event_views
from main.radar import views as radar_views
from django.urls import path, include
from django.contrib import admin
from django.views.decorators.csrf import csrf_exempt
from django.conf.urls.static import static
from django.conf import settings

api_router = routers.DefaultRouter()
api_router.register("events", views.EventViewSet, basename="events")

urlpatterns = [
    path('api/v1/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/v1/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path("graphql/", csrf_exempt(GraphQLView.as_view(graphiql=True))),
    path("api/v1/", include(api_router.urls)),
    path('api/v1/mock', views.hola_mundo),
    path('api/v1/google-auth', views.google_authorization),
    path('oauth2callback/', views.google_oauth2callback, name='google_oauth2_callback'),
    path('admin/', admin.site.urls),
    path('api/v1/auth/register/', user_views.register_user, name='register'),
    path('api/v1/users/search/', user_views.search_users, name='search_users'),
    path('/api/v1/users/<int:pk>/follow/', user_views.follow_or_unfollow_user, name='follow_users_logic'),
    path('/api/v1/users/<int:pk>/', user_views.get_user_by_id, name='get_user'),
    path('/api/v1/users/me/', user_views.get_own_user, name='get_profile'),
    path('/api/v1/users/me/edit/', user_views.edit_profile, name='edit_profile'),
    path('/api/v1/users/me/delete/', user_views.delete_own_user, name='delete_own_user'),
    path('/api/v1/calendars/<int:calendar_id>/publish/', calendar_views.publish_calendar, name='publish_calendar'),
    path('/api/v1/calendars/<int:calendar_id>/delete/', calendar_views.delete_calendar, name='delete_calendar'),
    path('/api/v1/calendars/<int:calendar_id>/edit/', calendar_views.edit_calendar, name='edit_calendar'),
    path('/api/v1/calendars/create/', calendar_views.create_calendar, name='create_calendar'),
    path('/api/v1/calendars/list/', calendar_views.list_calendars, name='list_calendarios'),
    path('/api/v1/calendars/my-calendars/', calendar_views.list_my_calendars, name='list_my_calendarios'),
    path('/api/v1/calendars/import-google-calendar/', calendar_views.import_google_calendar, name='import_google_calendar'),
    path('/api/v1/calendars/import-ios-calendar/', calendar_views.iOS_calendar_import, name='import_ios_calendar'),
    path('/api/v1/calendars/import-ics/', calendar_views.ics_import, name='import_ics_calendar'),
    path('/api/v1/calendars/<int:calendar_id>/export/', calendar_views.export_to_ics, name='export_to_ics'),
    path('/api/v1/events/create/', event_views.create_event, name='create_event'),
    path('/api/v1/events/<int:event_id>/edit/', event_views.edit_event, name='edit_event'),
    path('/api/v1/events/list', event_views.list_events, name='list_events'),
    path('/api/v1/events/list/<int:calendar_id>', event_views.list_events_from_calendar, name='list_events_from_calendar'),
    path('/api/v1/events/asign-to-calendar/', event_views.asign_event_to_calendar, name='asign_event_to_calendar'),
    path('/api/v1/events/deasign-from-calendar/', event_views.deasign_event_from_calendar, name='deasign_event_from_calendar'),
    path('/api/v1/events/<int:event_id>/delete/', event_views.delete_event, name='delete_event'),
    path('/api/v1/radar/', radar_views.radar_events, name='radar_events'),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
