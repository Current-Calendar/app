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
from django.urls import path, include
from main import views
from drf_spectacular.views import SpectacularSwaggerView, SpectacularAPIView
from django.views.decorators.csrf import csrf_exempt
from graphene_django.views import GraphQLView
from django.conf import settings
from django.conf.urls.static import static
from main.views import assign_event_to_calendar, unassign_event_from_calendar, list_calendars, list_my_calendars, radar_events
from rest_framework import routers
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib import admin

api_router = routers.DefaultRouter()
api_router.register("users", views.UserViewSet, basename="users")
api_router.register("events", views.EventViewSet, basename="events")

urlpatterns = [
    path('api/v1/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/v1/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path("graphql/", csrf_exempt(GraphQLView.as_view(graphiql=True))),
    path("api/v1/", include(api_router.urls)),
    path('api/v1/mock', views.hello_world),
    path('api/v1/calendars/<int:calendar_id>/publish', views.publish_calendar),
    path('api/v1/calendars/<int:calendar_id>/delete/', views.delete_calendar, name='delete_calendar'),
    path('api/v1/calendars/<int:calendar_id>/edit/', views.edit_calendar, name='edit_calendar'),
    path('api/v1/events', views.create_event),
    path('api/v1/events/<int:event_id>', views.edit_event),
    path('api/v1/users/search', views.search_users),
    path('api/v1/auth/register/', views.register_user, name='register'),
    path('api/v1/calendars', views.create_calendar),
    path('api/v1/calendars/list', list_calendars, name='list_calendars'),
    path('api/v1/calendars/my-calendars', list_my_calendars, name='list_my_calendars'),
    path('api/v1/events/list', views.list_events, name='list_events'),
    path('api/v1/events/list/<int:calendar_id>', views.list_events_from_calendar, name='list_events_from_calendar'),
    path('api/events/assign/', assign_event_to_calendar),
    path('api/events/unassign/', unassign_event_from_calendar),
    path('api/v1/events/<int:event_id>/delete/', views.delete_event, name='delete_event'),
    path('api/v1/google-auth', views.google_authorization),
    path('oauth2callback/', views.google_oauth2callback, name='google_oauth2_callback'),
    path('api/calendars/import-google-calendar', views.import_google_calendar, name='import_google_calendar'),
    path('api/calendars/import-ios-calendar', views.iOS_calendar_import, name='import_ios_calendar'),
    path('api/calendars/import-ics', views.ics_import, name='import_ics_calendar'),
    path('api/calendars/<int:calendar_id>/export', views.export_to_ics, name='export_to_ics'),
    path('api/v1/radar/', radar_events, name='radar_events'),
    path('api/v1/users/me', views.CurrentUserView.as_view(), name="current-user-view"),
    path('admin/', admin.site.urls),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
