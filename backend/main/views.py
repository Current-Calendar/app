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
from rest_framework.request import Request
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authentication import SessionAuthentication
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D


from main.serializers import (
    UsuarioRegistroSerializer,
    UsuarioSerializer,
    UserSerializer,
    PublicUserSerializer,
    EventoSerializer
)

import requests
from rest_framework.views import APIView
from utils.security import get_safe_ip

from main.serializers import UsuarioRegistroSerializer, UsuarioSerializer,UserSerializer

from main.models import MockElement, Calendario, Evento, Usuario

from rest_framework.decorators import api_view, permission_classes

GOOGLE_REDIRECT_URIS = settings.GOOGLE_REDIRECT_URIS
ALLOWED_WEBCAL_HOSTS = getattr(settings, "ALLOWED_WEBCAL_HOSTS")
REQUEST_TIMEOUT_SECONDS = 5

#if GOOGLE_REDIRECT_URIS and "localhost" in GOOGLE_REDIRECT_URIS:
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


class UserViewSet(viewsets.GenericViewSet):
    queryset = Usuario.objects.all()
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["post"])
    def follow(self, request: Request, pk: int) -> Response:
        user: Usuario = request.user
        user_to_follow: Usuario = self.get_object()

        if user.seguidos.filter(pk=user_to_follow.pk).exists():
            user.seguidos.remove(user_to_follow)
            followed = False
        else:
            user.seguidos.add(user_to_follow)
            followed = True

        user.save()

        return Response(
            {
                "user": user_to_follow.pk,
                "followed": followed,
            }
        )




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
    usuario_creador = Usuario.objects.filter().first()
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
                creador=usuario_creador,
            )
            evento.calendarios.add(calendar)
    
    except Exception as e:
        print(f"Error al importar eventos: {e}")

    return Response({"message": "Eventos importados exitosamente", "count": len(events)}, headers={"Access-Control-Allow-Origin": "*"})

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
            creador = usuario_creador,
            id_externo=uid,
        )
        evento.calendarios.add(calendario)

    return Response({"message": "Archivo ICS importado exitosamente"}, headers={"Access-Control-Allow-Origin": "*"})

@api_view(['GET'])
def export_to_ics(request, calendario_id):
    """Endpoint para exportar un calendario a formato ICS."""
    try:
        calendario = Calendario.objects.get(id=calendario_id)
    except Calendario.DoesNotExist:
        return Response({"error": "Calendario no encontrado"}, status=404, headers={"Access-Control-Allow-Origin": "*"})

    cal = Calendar()
    cal.add('prodid', '-//Current Calendar//')
    cal.add('version', '2.0')

    for evento in calendario.eventos.all():
        event = evento.to_ical_event()
        cal.add_component(event)

    ics_content = cal.to_ical()
    response = Response(ics_content, content_type='text/calendar')
    response['Content-Disposition'] = f'attachment; filename="calendario_{calendario_id}.ics"'
    response["Access-Control-Allow-Origin"] = "*"
    return response

@api_view(['GET'])
def buscar_usuarios(request):
    query = request.GET.get("search")

    if not query:
        return Response(
            {"errors": ["El parámetro 'search' es obligatorio."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    usuarios = Usuario.objects.filter(
        Q(username__icontains=query) |
        Q(email__icontains=query) |
        Q(pronombres__icontains=query)
    ).distinct()

    resultados = [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "pronombres": user.pronombres,
            "biografia": user.biografia,
            "foto": user.foto.url if user.foto else None,
            "total_seguidores": user.total_seguidores,
            "total_seguidos": user.total_seguidos,
            "total_calendarios_seguidos": user.total_calendarios_seguidos,
        }
        for user in usuarios
    ]

    return Response(resultados, status=status.HTTP_200_OK)
    

@api_view(['POST'])
@permission_classes([AllowAny])
def registro_usuario(request):
    """
    Endpoint para registrar un nuevo usuario.
    
    POST /api/v1/auth/registro/
    Body: {
        "username": "string",
        "email": "string",
        "password": "string",
        "password2": "string"
    }
    """
    serializer = UsuarioRegistroSerializer(data=request.data)
    
    if serializer.is_valid():
        usuario = serializer.save()
        usuario.backend = 'django.contrib.auth.backends.ModelBackend'
        login(request, usuario)
        
        # Devolver datos del usuario creado
        usuario_serializer = UsuarioSerializer(usuario)
        
        return Response({
            'message': 'Usuario registrado exitosamente',
            'usuario': usuario_serializer.data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def crear_calendario(request):
    data = request.data

    nombre = data.get('nombre')

    if not nombre:
        return Response(
            {"errors": ["El campo 'nombre' es obligatorio."]},
            status = status.HTTP_400_BAD_REQUEST
        )
    creador = request.user

    calendario = Calendario(
        creador=creador,
        nombre=nombre,
        descripcion=data.get('descripcion', ''),
        estado=data.get('estado', 'PRIVADO'),
        origen=data.get('origen', 'CURRENT'),
        id_externo=data.get('id_externo'),
    )

  
    CONSTRAINT_PRIVADO = "unico_calendario_privado_por_usuario"

    try:
        calendario.full_clean()
        with transaction.atomic():
            calendario.save()
    except ValidationError as exc:
        # full_clean() / validate_constraints() puede lanzar ValidationError
        # cuando se viola el UniqueConstraint condicional (estado=PRIVADO).
        raw_messages = []
        if hasattr(exc, "message_dict"):
            for field_errors in exc.message_dict.values():
                raw_messages.extend(field_errors)
        if not raw_messages and getattr(exc, "messages", None):
            raw_messages.extend(exc.messages)

        if any(CONSTRAINT_PRIVADO in str(m) for m in raw_messages):
            return Response(
                {"errors": ["El usuario ya tiene un calendario privado."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"errors": raw_messages or ["Datos inválidos."]},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except IntegrityError:
        return Response(
            {"errors": ["El usuario ya tiene un calendario privado."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "id": calendario.id,
            "origen": calendario.origen,
            "id_externo": calendario.id_externo,
            "nombre": calendario.nombre,
            "descripcion": calendario.descripcion,
            "estado": calendario.estado,
            "creador_id": calendario.creador_id,
            "fecha_creacion": calendario.fecha_creacion,
        },
        status=status.HTTP_201_CREATED,
    )

@api_view(['GET'])
def list_calendars(request):
    """
    List and search calendars.

    GET /api/v1/calendarios/list

    Query parameters:
        q       (str)  -- case-insensitive substring match on calendar name
        estado  (str)  -- filter by privacy status (PRIVADO | AMIGOS | PUBLICO)
    """
    queryset = Calendario.objects.select_related('creador').all()

    q = request.GET.get('q', '').strip()
    if q:
        queryset = queryset.filter(nombre__icontains=q)

    estado = request.GET.get('estado', '').strip().upper()
    valid_estados = {choice[0] for choice in Calendario.ESTADOS_PRIVACIDAD}
    if estado:
        if estado not in valid_estados:
            return Response(
                {"errors": [f"Invalid 'estado' value. Allowed values: {', '.join(sorted(valid_estados))}."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        queryset = queryset.filter(estado=estado)

    queryset = queryset.order_by('-fecha_creacion')

    results = [
        {
            "id": cal.id,
            "nombre": cal.nombre,
            "descripcion": cal.descripcion,
            "estado": cal.estado,
            "origen": cal.origen,
            "creador_id": cal.creador_id,
            "creador_username": cal.creador.username,
            "fecha_creacion": cal.fecha_creacion,
        }
        for cal in queryset
    ]

    return Response(results, status=status.HTTP_200_OK)

@api_view(['GET'])
def list_events_from_calendar(request):
    """
    List and search events.

    GET /api/v1/eventos/list

    Query parameters:
        calendarId (int) -- filter by calendar ID
    """
    queryset = Evento.objects.all()
    calendar_id = request.GET.get('calendarId')

    if calendar_id:
        queryset = queryset.filter(calendarios__id=calendar_id)

    results = [
        {
            "id": event.id,
            "titulo": event.titulo,
            "descripcion": event.descripcion,
            "nombre_lugar": event.nombre_lugar,
            "fecha": event.fecha,
            "hora": event.hora,
            "recurrencia": event.recurrencia,
            "id_externo": event.id_externo,
            "calendarios": list(event.calendarios.values_list("id", flat=True)),
            "fecha_creacion": event.fecha_creacion,
        }
        for event in queryset
    ]
    return Response(results, status=status.HTTP_200_OK)


@api_view(['GET'])
def list_events(request):
    queryset = Evento.objects.all()

    q = request.GET.get('q', '').strip()
    if q:
        queryset = queryset.filter(
            Q(titulo__icontains=q) | Q(descripcion__icontains=q)
        )

    calendar_id = request.GET.get('calendarId')
    if calendar_id:
        queryset = queryset.filter(calendarios__id=calendar_id)

    queryset = queryset.order_by('-fecha_creacion')

    serializer = EventoSerializer(queryset, many=True, context={'request': request})

    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['POST'])
def asignar_evento_a_calendario(request):
    evento_id = request.data.get('evento_id')
    calendario_id = request.data.get('calendario_id')

    if not evento_id or not calendario_id:
        return Response(
            {"error": "Se requieren evento_id y calendario_id"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        evento = Evento.objects.get(pk=evento_id)
    except Evento.DoesNotExist:
        return Response({"error": "Evento no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    try:
        calendario = Calendario.objects.get(pk=calendario_id)
    except Calendario.DoesNotExist:
        return Response({"error": "Calendario no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    if calendario.creador !=request.user:
        return Response(
            {"errors": ["No tienes permiso para modificar este calendario."]},
            status = status.HTTP_403_FORBIDDEN
        )
    if evento.creador !=request.user:
        return Response(
            {"errors": ["No tienes permiso para usar este evento."]},
            status = status.HTTP_403_FORBIDDEN
        )
    if evento.calendarios.filter(pk=calendario.pk).exists():
        return Response(
            {"error": "El evento ya está asignado a este calendario"},
            status=status.HTTP_400_BAD_REQUEST
        )

    evento.calendarios.add(calendario)
    return Response(
        {"mensaje": f"Evento '{evento.titulo}' asignado al calendario '{calendario.nombre}'"},
        status=status.HTTP_200_OK
    )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def desasignar_evento_de_calendario(request):
    evento_id = request.data.get('evento_id')
    calendario_id = request.data.get('calendario_id')

    if not evento_id or not calendario_id:
        return Response(
            {"error": "Se requieren evento_id y calendario_id"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        evento = Evento.objects.get(pk=evento_id)
    except Evento.DoesNotExist:
        return Response({"error": "Evento no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    try:
        calendario = Calendario.objects.get(pk=calendario_id)
    except Calendario.DoesNotExist:
        return Response({"error": "Calendario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
    
    if calendario.creador != request.user:
        return Response(
            {"error": "No tienes permiso para modificar este calendario"},
            status=status.HTTP_403_FORBIDDEN
        )
    if evento.creador != request.user:
        return Response(
            {"error": "No tienes permiso sobre este evento"},
            status=status.HTTP_403_FORBIDDEN
        )

    if not evento.calendarios.filter(pk=calendario.pk).exists():
        return Response(
            {"error": "El evento no está asignado a este calendario"},
            status=status.HTTP_400_BAD_REQUEST
        )

    evento.calendarios.remove(calendario)
    return Response(
        {"mensaje": f"Evento '{evento.titulo}' desasignado del calendario '{calendario.nombre}'"},
        status=status.HTTP_200_OK
    )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def eliminar_calendario(request, calendario_id):
    calendario = get_object_or_404(Calendario, id=calendario_id)
    
    # Only the creator can delete the calendar
    if calendario.creador != request.user:
        return Response({'error': 'You do not have permission to delete this calendar.'}, status=status.HTTP_403_FORBIDDEN)
    
    calendario.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def editar_calendario(request, calendario_id):
    calendario = get_object_or_404(Calendario, id=calendario_id)

    if calendario.creador != request.user:
        return Response({'error': 'You do not have permission to edit this calendar.'}, status=status.HTTP_403_FORBIDDEN)

    ESTADOS_VALIDOS = {'PRIVADO', 'AMIGOS', 'PUBLICO'}
    campos_editables = ['nombre', 'descripcion', 'estado']


    for campo in campos_editables:
        if campo in request.data:
            valor = request.data[campo]
            if isinstance(valor, str) and valor.strip() == '':
                return Response(
                    {'error': f"El campo '{campo}' no puede ser una cadena vacía."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if campo == 'estado' and valor not in ESTADOS_VALIDOS:
                return Response(
                    {'error': f"El estado '{valor}' no es válido. Los valores permitidos son: {', '.join(sorted(ESTADOS_VALIDOS))}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            setattr(calendario, campo, valor)

    calendario.save()
    return Response({
        'id': calendario.id,
        'nombre': calendario.nombre,
        'descripcion': calendario.descripcion,
        'estado': calendario.estado,
    }, status=status.HTTP_200_OK)

class UsuarioPropioView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Obtener datos del usuario autenticado"""
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=200)

    def put(self, request):
        serializer = UserSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=200)
        return Response(serializer.errors, status=400)
    def delete(self, request):
        request.user.delete()
        return Response(
            {"message": "Usuario eliminado satisfactoriamente"},
            status=202
        )
  
@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def edit_event(request, evento_id):
    event = get_object_or_404(Evento, id=evento_id)

    if event.creador !=request.user:
        return Response(
            {"errors": ["No tienes permiso para editar este evento."]},
            status = status.HTTP_403_FORBIDDEN
        )

    data = request.data

    # Validate required fields are not empty if provided
    if "titulo" in data and not data["titulo"]:
        return Response(
            {"errors": ["El campo 'titulo' no puede estar vacío."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if "fecha" in data and not data["fecha"]:
        return Response(
            {"errors": ["El campo 'fecha' no puede estar vacío."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if "hora" in data and not data["hora"]:
        return Response(
            {"errors": ["El campo 'hora' no puede estar vacío."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Update scalar fields if present
    editable_fields = [
        "titulo", "descripcion", "nombre_lugar",
        "fecha", "hora", "recurrencia", "id_externo",
    ]
    for field in editable_fields:
        if field in data:
            setattr(event, field, data[field])

    # Location via lat/lon
    if "latitud" in data or "longitud" in data:
        lat = data.get("latitud")
        lon = data.get("longitud")
        try:
            event.ubicacion = Point(float(lon), float(lat))
        except Exception:
            return Response(
                {"errors": ["Latitud o longitud inválidas."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # Calendars M2M
    calendars = None
    if "calendarios" in data:
        calendar_ids = data["calendarios"]
        if not calendar_ids or not isinstance(calendar_ids, list):
            return Response(
                {"errors": ["Debe indicar al menos un calendario válido."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        calendars = Calendario.objects.filter(id__in=calendar_ids)
        if calendars.count() != len(calendar_ids):
            return Response(
                {"errors": ["Algún calendario no existe."]},
                status=status.HTTP_404_NOT_FOUND,
            )

    try:
        event.full_clean()
        with transaction.atomic():
            event.save()
            if calendars is not None:
                event.calendarios.set(calendars)

    except ValidationError as exc:
        raw_messages = []
        if hasattr(exc, "message_dict"):
            for field_errors in exc.message_dict.values():
                raw_messages.extend(field_errors)
        if not raw_messages and getattr(exc, "messages", None):
            raw_messages.extend(exc.messages)

        return Response(
            {"errors": raw_messages or ["Datos inválidos."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "id": event.id,
            "titulo": event.titulo,
            "descripcion": event.descripcion,
            "nombre_lugar": event.nombre_lugar,
            "fecha": event.fecha,
            "hora": event.hora,
            "recurrencia": event.recurrencia,
            "id_externo": event.id_externo,
            "calendarios": list(event.calendarios.values_list("id", flat=True)),
            "fecha_creacion": event.fecha_creacion,
        },
        status=status.HTTP_200_OK,
    )
@api_view(['POST'])
def crear_evento(request):

    data = request.data

    titulo = data.get("titulo")
    fecha = data.get("fecha")
    hora = data.get("hora")
    calendarios_ids = data.get("calendarios")
    creador = request.user
    

    if not titulo:
        return Response(
            {"errors": ["El campo 'titulo' es obligatorio."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not fecha:
        return Response(
            {"errors": ["El campo 'fecha' es obligatorio."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not hora:
        return Response(
            {"errors": ["El campo 'hora' es obligatorio."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not calendarios_ids or not isinstance(calendarios_ids, list):
        return Response(
            {"errors": ["Debe indicar al menos un calendario válido."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    calendarios = Calendario.objects.filter(id__in=calendarios_ids)

    if calendarios.count() != len(calendarios_ids):
        return Response(
            {"errors": ["Algún calendario no existe."]},
            status=status.HTTP_404_NOT_FOUND,
        )
    for calendario in calendarios:
        if calendario.creador != creador:
            return Response({"errors": [f"No tienes permiso para añadir eventos al calendario {calendario.id}."]},
            status=status.HTTP_403_FORBIDDEN
            )

    ubicacion = None
    lat = data.get("latitud")
    lon = data.get("longitud")

    if lat and lon:
        try:
            ubicacion = Point(float(lon), float(lat))
        except Exception:
            return Response(
                {"errors": ["Latitud o longitud inválidas."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
    
    evento = Evento(
        titulo=titulo,
        descripcion=data.get("descripcion", ""),
        nombre_lugar=data.get("nombre_lugar", ""),
        fecha=fecha,
        hora=hora,
        recurrencia=data.get("recurrencia"),
        id_externo=data.get("id_externo"),
        ubicacion=ubicacion,
        creador=creador
    )

    try:
        evento.full_clean()
        with transaction.atomic():
            evento.save()
            evento.calendarios.set(calendarios)

    except ValidationError as exc:
        raw_messages = []
        if hasattr(exc, "message_dict"):
            for field_errors in exc.message_dict.values():
                raw_messages.extend(field_errors)
        if not raw_messages and getattr(exc, "messages", None):
            raw_messages.extend(exc.messages)

        return Response(
            {"errors": raw_messages or ["Datos inválidos."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "id": evento.id,
            "titulo": evento.titulo,
            "creador": evento.creador.id,
            "descripcion": evento.descripcion,
            "nombre_lugar": evento.nombre_lugar,
            "fecha": evento.fecha,
            "hora": evento.hora,
            "recurrencia": evento.recurrencia,
            "id_externo": evento.id_externo,
            "calendarios": calendarios_ids,
            "fecha_creacion": evento.fecha_creacion,
        },
        status=status.HTTP_201_CREATED,
    )
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def publish_calendar(request, calendario_id):
    calendar = get_object_or_404(Calendario, id=calendario_id)

    if calendar.creador !=request.user:
        return Response(
            {"errors": ["No tienes permiso para publicar este calendario."]},
            status = status.HTTP_403_FORBIDDEN
        )

    if calendar.estado == 'PUBLICO':
        return Response(
            {"errors": ["El calendario ya es público."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    calendar.estado = 'PUBLICO'
    calendar.save()

    return Response(
        {
            "id": calendar.id,
            "nombre": calendar.nombre,
            "descripcion": calendar.descripcion,
            "estado": calendar.estado,
            "origen": calendar.origen,
            "creador": calendar.creador.id,
            "fecha_creacion": calendar.fecha_creacion,
        },
        status=status.HTTP_200_OK,

    )


@api_view(['GET'])
def radar_events(request):
    #/api/radar?lat=..&lon=..&radio=5
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

    eventos = (
        Evento.objects
        .filter(
            ubicacion__isnull=False,
            fecha__gte=timezone.now().date()
        )
        .annotate(distancia=Distance("ubicacion", user_location))
        .filter(ubicacion__distance_lte=(user_location, D(km=radio)))
        .order_by("distancia")
    )

    serializer = EventoSerializer(
        eventos, 
        many=True, 
        context={'request': request}
    )

    return Response(serializer.data, status=status.HTTP_200_OK)

