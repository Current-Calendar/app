import datetime
from asyncio import events
from icalendar import Calendar
import os
import ipaddress
import socket
from urllib.parse import urlparse
from django.conf import settings
from django.contrib.auth import login
from django.contrib.gis.geos import Point
from main.models import MockElement
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.shortcuts import redirect, get_object_or_404
from django.utils import timezone
from django.db import IntegrityError, transaction
from django.db.models import Q
from google_auth_oauthlib import flow as google_auth_oauthlib_flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework import status, viewsets, mixins
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.contrib.gis.geos import Point
from django.http import HttpResponse

from main.serializers import (
    EventoSerializer
)
import requests
from utils.security import get_safe_ip

from main.models import MockElement, Calendario, Evento, Usuario
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D
from .permissions import IsCreator
from django.db.models import Q

from rest_framework.decorators import api_view, permission_classes

GOOGLE_REDIRECT_URIS = settings.GOOGLE_REDIRECT_URIS
ALLOWED_WEBCAL_HOSTS = getattr(settings, "ALLOWED_WEBCAL_HOSTS")
REQUEST_TIMEOUT_SECONDS = 5

#if GOOGLE_REDIRECT_URIS and "localhost" in GOOGLE_REDIRECT_URIS:
if "localhost" in GOOGLE_REDIRECT_URIS:
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'


class EventViewSet(mixins.DestroyModelMixin, viewsets.GenericViewSet):
    queryset = Evento.objects.all()
    permission_classes = [IsAuthenticated & IsCreator]


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


@api_view(['POST'])
def iOS_calendar_import(request):
    """Endpoint para importar eventos desde iOS Calendar."""

    webcal_url = request.data.get('webcal_url')  # nosemgrep: python.django.security.injection.ssrf.ssrf-injection-requests.ssrf-injection-requests (validado con _is_safe_calendar_url)
    user_id = request.data.get('user')
    estado_solicitado = request.data.get('estado', 'PRIVADO') 
    usuario_creador = Usuario.objects.filter(id=user_id).first()

    if not webcal_url:
        return Response({"error": "webcal_url es requerido"}, status=400, headers={"Access-Control-Allow-Origin": "*"})

    if webcal_url.startswith("webcal://"):
        http_url = webcal_url.replace("webcal://", "https://", 1)
    else:
        http_url = webcal_url
    
   
    is_safe, reason = _is_safe_calendar_url(http_url)
    if not is_safe:
        return Response({"error": f"URL no permitida: {reason}"}, status=400, headers={"Access-Control-Allow-Origin": "*"})

  
    safe_ip = get_safe_ip(http_url)
    if not safe_ip:
        return Response({"error": "La URL apunta a un destino no permitido por motivos de seguridad"}, status=403, headers={"Access-Control-Allow-Origin": "*"})

    try:
    
        response = requests.get(http_url, timeout=REQUEST_TIMEOUT_SECONDS, allow_redirects=False)  # nosemgrep: python.django.security.injection.ssrf.ssrf-injection-requests.ssrf-injection-requests
        response.raise_for_status()

        cal = Calendar.from_ical(response.content)
        momento_actual = timezone.now()
        eventos_guardados = 0

        calendario = Calendario.objects.create(
            nombre="Calendario de iOS",
            descripcion="Calendario importado desde iOS Calendar",
            estado=estado_solicitado,
            creador=usuario_creador,
            origen='APPLE',
            id_externo=http_url,
        )

        for component in cal.walk():
            if component.name != "VEVENT":
                continue

            inicio_dt = component.get('dtstart').dt

            if isinstance(inicio_dt, datetime.date) and not isinstance(inicio_dt, datetime.datetime):
                inicio_dt = datetime.datetime.combine(inicio_dt, datetime.time.min)

            if inicio_dt.tzinfo is None:
                inicio_dt = timezone.make_aware(inicio_dt)

            if inicio_dt < momento_actual:
                continue
            
            
            titulo = str(component.get('summary', 'Sin título'))
            descripcion = str(component.get('description', ''))
            uid = str(component.get('uid'))
            
            fecha_str = inicio_dt.strftime('%Y-%m-%d')
            hora_str = inicio_dt.strftime('%H:%M:%S')

            evento = Evento.objects.create(
                titulo=titulo,
                descripcion=descripcion,
                fecha=fecha_str,
                hora=hora_str,
                creador= usuario_creador,
                id_externo=uid,
            )
            evento.calendarios.add(calendario)
            eventos_guardados += 1

        return Response({
            "message": "Calendario iOS importado exitosamente", 
            "count": eventos_guardados
        })

    except requests.exceptions.RequestException as e:
        return Response({"error": f"Error al descargar el calendario: {str(e)}"}, status=400)
    except Exception as e:
        return Response({"error": f"Error procesando el archivo: {str(e)}"}, status=400)


@api_view(['GET'])
def radar_events(request):
    # /api/radar?lat=..&lon=..&radio=5
    lat = request.GET.get("lat")
    lon = request.GET.get("lon")
    radio = request.GET.get("radio", 5)

    if not lat or not lon:
        return Response(
            {"error": "Debes enviar lat y lon"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        lat = float(lat)
        lon = float(lon)
        radio = float(radio)
    except ValueError:
        return Response(
            {"error": "lat, lon y radio deben ser numéricos"},
            status=status.HTTP_400_BAD_REQUEST
        )

    user_location = Point(lon, lat, srid=4326)

    user = request.user

    if user.is_authenticated:
        amigos = user.seguidos.all()

        filtro_privacidad = Q(calendarios__estado='PUBLICO') | \
                            Q(calendarios__estado='AMIGOS', calendarios__creador__in=amigos) | \
                            Q(creador=user)
    else:
        filtro_privacidad = Q(calendarios__estado='PUBLICO')

    eventos = (
        Evento.objects
        .filter(
            filtro_privacidad,
            ubicacion__isnull=False,
            fecha__gte=timezone.now().date()
        )
        .annotate(distancia=Distance("ubicacion", user_location))
        .filter(ubicacion__distance_lte=(user_location, D(km=radio)))
        .order_by("distancia")
        .distinct()
    )

    resultados = [
        {
            "id": evento.id,
            "titulo": evento.titulo,
            "descripcion": evento.descripcion,
            "nombre_lugar": evento.nombre_lugar,
            "fecha": evento.fecha,
            "hora": evento.hora,
            "distancia_km": round(evento.distancia.km, 2),
            "latitud": evento.ubicacion.y if evento.ubicacion else None,
            "longitud": evento.ubicacion.x if evento.ubicacion else None,
        }
        for evento in eventos
    ]
    serializer = EventoSerializer(
        eventos, 
        many=True, 
        context={'request': request}
    )

    return Response(serializer.data, status=status.HTTP_200_OK)