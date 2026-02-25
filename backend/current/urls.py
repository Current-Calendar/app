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
from main.views import asignar_evento_a_calendario, desasignar_evento_de_calendario
from rest_framework import routers

api_router = routers.DefaultRouter()
api_router.register("users", views.UserViewSet, basename="users")

urlpatterns = [
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path("graphql/", csrf_exempt(GraphQLView.as_view(graphiql=True))),
    path("api/v1/", include(api_router.urls)),
    path('api/v1/mock', views.hola_mundo),
    path('api/eventos/asignar/', asignar_evento_a_calendario),
    path('api/eventos/desasignar/', desasignar_evento_de_calendario),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)