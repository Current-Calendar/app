from google_auth_oauthlib import flow as google_auth_oauthlib_flow
from rest_framework.decorators import api_view
from rest_framework.response import Response
import os
from django.conf import settings
from django.core.cache import cache
from django.shortcuts import redirect
from django.contrib.gis.geos import Point
from main.models import MockElement

GOOGLE_REDIRECT_URIS = settings.GOOGLE_REDIRECT_URIS
ALLOWED_WEBCAL_HOSTS = getattr(settings, "ALLOWED_WEBCAL_HOSTS")
REQUEST_TIMEOUT_SECONDS = 5

#if GOOGLE_REDIRECT_URIS and "localhost" in GOOGLE_REDIRECT_URIS:
if "localhost" in GOOGLE_REDIRECT_URIS:
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'


@api_view(["GET"])
def hola_mundo(request):
    cache_key = "sevilla_point_data"
    cached_data = cache.get(cache_key)    
    if cached_data:
        return Response({
            "source": "Redis (Cache)",
            "data": cached_data
        }, headers={"Access-Control-Allow-Origin": "*"})

    pnt = Point(-5.9926, 37.3861)    
    obj, created = MockElement.objects.get_or_create(
        nombre="La Giralda Mock",
        defaults={'punto_geografico': pnt}
    )

    result = {
        "id": obj.id,
        "nombre": obj.nombre,
        "coordenadas": {
            "longitude": obj.punto_geografico.x,
            "latitude": obj.punto_geografico.y
        },
        "created_in_db": created,
        "timestamp": str(obj.created_at)
    }

    cache.set(cache_key, result, 60)

    return Response({
        "source": "PostgreSQL (Base de Datos)",
        "data": result
    }, headers={"Access-Control-Allow-Origin": "*"})


def google_authorization(request):
    """Autorización de Google para obtener acceso a la API de Google Calendar."""
    flow = google_auth_oauthlib_flow.Flow.from_client_config(
        settings.GOOGLE_OAUTH2_CLIENT_CONFIG,
        scopes=['https://www.googleapis.com/auth/calendar.readonly'])
    flow.redirect_uri = GOOGLE_REDIRECT_URIS
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true')
    request.session['oauth_state'] = state
    return redirect(authorization_url)


def credentials_to_dict(credentials):
    """Convierte el objeto Credentials a un diccionario serializable."""
    return {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }


def google_oauth2callback(request):
    """Callback de Google después de la autorización."""
    state = request.session.get('oauth_state')
    flow = google_auth_oauthlib_flow.Flow.from_client_config(
        settings.GOOGLE_OAUTH2_CLIENT_CONFIG,
        scopes=['https://www.googleapis.com/auth/calendar.readonly'],
        state=state)
    
    flow.redirect_uri = GOOGLE_REDIRECT_URIS
    
    authorization_response = request.build_absolute_uri()
    flow.fetch_token(authorization_response=authorization_response)

    credentials = flow.credentials
    request.session['google_credentials'] = credentials_to_dict(credentials)

    return redirect('import_google_calendar')
