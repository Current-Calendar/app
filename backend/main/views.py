import datetime
from asyncio import events
from icalendar import Calendar

import os
import ipaddress
import socket
from urllib.parse import urlparse
from django.conf import settings
from django.contrib.gis.geos import Point
from django.core.cache import cache
from django.shortcuts import redirect
from django.utils import timezone
from google_auth_oauthlib import flow as google_auth_oauthlib_flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from rest_framework.decorators import api_view
from rest_framework.response import Response
import requests

from main.models import MockElement, Usuario, Calendario, Evento

GOOGLE_REDIRECT_URIS = settings.GOOGLE_REDIRECT_URIS
ALLOWED_WEBCAL_HOSTS = getattr(settings, "ALLOWED_WEBCAL_HOSTS")
REQUEST_TIMEOUT_SECONDS = 5

if "localhost" in GOOGLE_REDIRECT_URIS:
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'


def _is_safe_calendar_url(raw_url: str):
    """Basic SSRF guard for external calendar downloads."""
    parsed = urlparse(raw_url)

    if parsed.scheme != "https":
        return False, "Solo se permiten URLs https"

    host = parsed.hostname
    if not host:
        return False, "URL sin host"

    # Host allowlist check (suffix based to allow subdomains)
    if ALLOWED_WEBCAL_HOSTS and not any(host == allowed or host.endswith(f".{allowed}") for allowed in ALLOWED_WEBCAL_HOSTS):
        return False, "Host no permitido"

    try:
        addr_info = socket.getaddrinfo(host, None)
        for _, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            ip_obj = ipaddress.ip_address(ip_str)
            if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_reserved or ip_obj.is_link_local or ip_obj.is_multicast:
                return False, "Host resuelve a una IP no pública"
    except Exception:
        return False, "No se pudo resolver el host"

    return True, None

@api_view(['GET'])
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

@api_view(['GET', 'POST'])
def import_google_calendar(request):
    """Endpoint para importar eventos del calendario de Google."""
    momento_actual = timezone.now().isoformat()
    events = []
    usuario_creador = Usuario.objects.filter(id=20).first()
    estado_solicitado = 'AMIGOS'
    raw_credentials = request.session.get('google_credentials')
    if not raw_credentials:
        return Response({"error": "No hay credenciales de Google en sesión"}, status=400)

    # Rebuild Credentials object from stored dict
    if isinstance(raw_credentials, dict):
        google_credentials = Credentials(**raw_credentials)
    else:
        google_credentials = raw_credentials

    try:
        service = build('calendar', 'v3', credentials=google_credentials)

        events_result = service.events().list(calendarId='primary', singleEvents=True, maxResults=2500, timeMin=momento_actual, orderBy='startTime').execute()
        events = events_result.get('items', [])

        calendar = Calendario.objects.create(
            nombre="Calendario de Google",
            descripcion="Calendario importado desde Google Calendar",
            estado=estado_solicitado,
            creador=usuario_creador,
            origen='GOOGLE',
            id_externo=service.calendarList().get(calendarId='primary').execute().get('id'),
        )

        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            end = event['end'].get('dateTime', event['end'].get('date'))

            evento = Evento.objects.create(
                titulo=event.get('summary', 'Sin título'),
                descripcion=event.get('description', ''),
                fecha=start[:10],
                hora=start[11:19] if 'T' in start else '00:00:00',
                id_externo=event['id'],
            )
            evento.calendarios.add(calendar)
    
    except Exception as e:
        print(f"Error al importar eventos: {e}")

    return Response({"message": "Eventos importados exitosamente", "count": len(events)}, headers={"Access-Control-Allow-Origin": "*"})

@api_view(['POST'])
def iOS_calendar_import(request):
    """Endpoint para importar eventos desde iOS Calendar."""

    webcal_url = request.data.get('webcal_url')
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

    try:
        response = requests.get(http_url, timeout=REQUEST_TIMEOUT_SECONDS, allow_redirects=False)
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
            
            # Extraer los datos
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

@api_view(['POST']) 
def ics_import(request):
    """Endpoint para importar eventos desde un archivo ICS subido por el usuario."""
    if 'file' not in request.FILES:
        return Response({"error": "Archivo ICS requerido"}, status=400, headers={"Access-Control-Allow-Origin": "*"})

    upload = request.FILES['file']

    try:
        cal = Calendar.from_ical(upload.read())
    except Exception as exc:  # malformed ICS
        return Response({"error": f"Archivo ICS inválido: {exc}"}, status=400, headers={"Access-Control-Allow-Origin": "*"})

    momento_actual = timezone.now()
    estado_solicitado = request.data.get('estado', 'PRIVADO')
    usuario_creador = Usuario.objects.filter(id=request.data.get('user')).first()
    if not usuario_creador:
        return Response({"error": "Usuario no encontrado"}, status=400, headers={"Access-Control-Allow-Origin": "*"})

    calendario = Calendario.objects.create(
            nombre="Calendario de ICS",
            descripcion="Calendario importado desde archivo ICS",
            estado=estado_solicitado,
            creador=usuario_creador,
            origen='CURRENT',
            id_externo=upload.name,
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
        
        # Extraer los datos
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
            id_externo=uid,
        )
        evento.calendarios.add(calendario)

    return Response({"message": "Archivo ICS importado exitosamente"}, headers={"Access-Control-Allow-Origin": "*"})
