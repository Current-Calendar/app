import datetime
import requests
import socket
import ipaddress
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from main.models import Calendar, Event, User
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from django.db import transaction, IntegrityError
from django.utils import timezone
from django.http import HttpResponse
from django.conf import settings
from utils.security import get_safe_ip
from icalendar import Calendar as ICalCalendar
from urllib.parse import urlparse

REQUEST_TIMEOUT_SECONDS = 5
ALLOWED_WEBCAL_HOSTS = getattr(settings, "ALLOWED_WEBCAL_HOSTS")

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def publish_calendar(request, calendar_id):
    calendar = get_object_or_404(Calendar, id=calendar_id)

    if calendar.creator != request.user:
        return Response(
            {"errors": ["No tienes permiso para publicar este calendar."]},
            status = status.HTTP_403_FORBIDDEN
        )

    if calendar.privacy == 'PUBLIC':
        return Response(
            {"errors": ["El calendar ya es público."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    calendar.privacy = 'PUBLIC'
    calendar.save()

    return Response(
        {
            "id": calendar.id,
            "name": calendar.name,
            "description": calendar.description,
            "privacy": calendar.privacy,
            "origin": calendar.origin,
            "creator": calendar.creator.id,
            "created_at": calendar.created_at,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['GET','DELETE'])
@permission_classes([IsAuthenticated])
def delete_calendar(request, calendar_id):
    calendar = get_object_or_404(Calendar, id=calendar_id)
    
    # Only the creator can delete the calendar
    if calendar.creator != request.user:
        return Response({'error': 'You do not have permission to delete this calendar.'}, status=status.HTTP_403_FORBIDDEN)
    
    calendar.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['PUT', 'PATCH','GET'])
@permission_classes([IsAuthenticated])
def edit_calendar(request, calendar_id):
    calendar = get_object_or_404(Calendar, id=calendar_id)

    if calendar.creator != request.user:
        return Response({'error': 'You do not have permission to edit this calendar.'}, status=status.HTTP_403_FORBIDDEN)

    ESTADOS_VALIDOS = {'PRIVATE', 'FRIENDS', 'PUBLIC'}
    campos_editables = ['name', 'privacy', 'description']


    for campo in campos_editables:
        if campo in request.data:
            valor = request.data[campo]
            if isinstance(valor, str) and valor.strip() == '':
                return Response(
                    {'error': f"El campo '{campo}' no puede ser una cadena vacía."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if campo == 'privacy' and valor not in ESTADOS_VALIDOS:
                return Response(
                    {'error': f"El privacy '{valor}' no es válido. Los valores permitidos son: {', '.join(sorted(ESTADOS_VALIDOS))}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            setattr(calendar, campo, valor)

    calendar.save()
    return Response({
        'id': calendar.id,
        'name': calendar.name,
        'description': calendar.description,
        'privacy': calendar.privacy,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_calendar(request):
    data = request.data

    name = data.get('name')

    if not name:
        return Response(
            {"errors": ["El campo 'name' es obligatorio."]},
            status = status.HTTP_400_BAD_REQUEST
        )
    creator = request.user

    calendar = Calendar(
        creator=creator,
        name=name,
        description=data.get('description', ''),
        privacy=data.get('privacy', 'PRIVATE'),
        origin=data.get('origin', 'CURRENT'),
        external_id=data.get('external_id'),
        cover=request.FILES.get('cover')
    )

    CONSTRAINT_PRIVADO = "unique_private_calendar_per_user"

    try:
        calendar.full_clean()
        with transaction.atomic():
            calendar.save()
    except ValidationError as exc:
        # full_clean() / validate_constraints() puede lanzar ValidationError
        # cuando se viola el UniqueConstraint condicional (privacy=PRIVADO).
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
            "id": calendar.id,
            "origin": calendar.origin,
            "external_id": calendar.external_id,
            "name": calendar.name,
            "description": calendar.description,
            "privacy": calendar.privacy,
            "creator_id": calendar.creator_id,
            "created_at": calendar.created_at,
            "cover": request.build_absolute_uri(calendar.cover.url) if calendar.cover else None,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
def list_calendars(request):
    """
    List and search calendars.

    GET /api/v1/calendars/list

    Query parameters:
        q       (str)  -- case-insensitive substring match on calendar name
        privacy  (str)  -- filter by privacy status (PRIVATE | FRIENDS | PUBLIC)
    """
    queryset = Calendar.objects.select_related('creator').all()

    q = request.GET.get('q', '').strip()
    if q:
        queryset = queryset.filter(name__icontains=q)

    privacy = request.GET.get('privacy', '').strip().upper()
    valid_privacys = {choice[0] for choice in Calendar.PRIVACY_CHOICES}
    if privacy:
        if privacy not in valid_privacys:
            return Response(
                {"errors": [f"Invalid 'privacy' value. Allowed values: {', '.join(sorted(valid_privacys))}."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        queryset = queryset.filter(privacy=privacy)

    queryset = queryset.order_by('-created_at')

    results = [
        {
            "id": cal.id,
            "name": cal.name,
            "description": cal.description,
            "privacy": cal.privacy,
            "origin": cal.origin,
            "creator_id": cal.creator_id,
            "creator_username": cal.creator.username,
            "created_at": cal.created_at,
            "cover": request.build_absolute_uri(cal.cover.url) if cal.cover else None,
        }
        for cal in queryset
    ]

    return Response(results, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_my_calendars(request):
    """
    List calendars created by the authenticated user.

    GET /api/v1/calendars/mis-calendars

    Query parameters:
        q       (str)  -- case-insensitive substring match on calendar name
        privacy  (str)  -- filter by privacy status (PRIVATE | FRIENDS | PUBLIC)
    """
    queryset = Calendar.objects.select_related('creator').filter(creator=request.user)

    q = request.GET.get('q', '').strip()
    if q:
        queryset = queryset.filter(name__icontains=q)

    privacy = request.GET.get('privacy', '').strip().upper()
    valid_privacys = {choice[0] for choice in Calendar.PRIVACY_CHOICES}
    if privacy:
        if privacy not in valid_privacys:
            return Response(
                {"errors": [f"Invalid 'privacy' value. Allowed values: {', '.join(sorted(valid_privacys))}."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        queryset = queryset.filter(privacy=privacy)

    queryset = queryset.order_by('-created_at')

    results = [
        {
            "id": cal.id,
            "name": cal.name,
            "description": cal.description,
            "privacy": cal.privacy,
            "origin": cal.origin,
            "creator_id": cal.creator_id,
            "creator_username": cal.creator.username,
            "created_at": cal.created_at,
            "cover": request.build_absolute_uri(cal.cover.url) if cal.cover else None,
        }
        for cal in queryset
    ]

    return Response(results, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def import_google_calendar(request):
    """Endpoint para importar eventos del calendar de Google."""
    momento_actual = timezone.now().isoformat()
    events = []
    user_creator = User.objects.filter().first()
    privacy_solicitado = 'FRIENDS'
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

        calendar = Calendar.objects.create(
            name="Calendar de Google",
            description="Calendar importado desde Google Calendar",
            privacy=privacy_solicitado,
            creator=user_creator,
            origin='GOOGLE',
            external_id=service.calendarList().get(calendarId='primary').execute().get('id'),
        )

        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            end = event['end'].get('dateTime', event['end'].get('date'))

            event = Event.objects.create(
                title=event.get('summary', 'Sin título'),
                description=event.get('description', ''),
                date=start[:10],
                time=start[11:19] if 'T' in start else '00:00:00',
                external_id=event['id'],
                creator=user_creator,
            )
            event.calendars.add(calendar)
    
    except Exception as e:
        print(f"Error al importar eventos: {e}")

    return Response({"message": "Eventos importados exitosamente", "count": len(events)}, headers={"Access-Control-Allow-Origin": "*"})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def iOS_calendar_import(request):
    """Endpoint para importar eventos desde iOS Calendar."""

    webcal_url = request.data.get('webcal_url')  # nosemgrep: python.django.security.injection.ssrf.ssrf-injection-requests.ssrf-injection-requests (validado con _is_safe_calendar_url)
    user_id = request.data.get('user')
    privacy_solicitado = request.data.get('privacy', 'PRIVATE') 
    user_creator = User.objects.filter(id=user_id).first()

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

        cal = ICalCalendar.from_ical(response.content)
        momento_actual = timezone.now()
        eventos_guardados = 0

        calendar = Calendar.objects.create(
            name="Calendar de iOS",
            description="Calendar importado desde iOS Calendar",
            privacy=privacy_solicitado,
            creator=user_creator,
            origin='APPLE',
            external_id=http_url,
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
            
            
            title = str(component.get('summary', 'Sin título'))
            description = str(component.get('description', ''))
            uid = str(component.get('uid'))
            
            date_str = inicio_dt.strftime('%Y-%m-%d')
            time_str = inicio_dt.strftime('%H:%M:%S')

            event = Event.objects.create(
                title=title,
                description=description,
                date=date_str,
                time=time_str,
                creator= user_creator,
                external_id=uid,
            )
            event.calendars.add(calendar)
            eventos_guardados += 1

        return Response({
            "message": "Calendar iOS importado exitosamente", 
            "count": eventos_guardados
        })

    except requests.exceptions.RequestException as e:
        return Response({"error": f"Error al descargar el calendar: {str(e)}"}, status=400)
    except Exception as e:
        return Response({"error": f"Error procesando el archivo: {str(e)}"}, status=400)
    

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


@api_view(['POST']) 
def ics_import(request):
    """Endpoint para importar eventos desde un archivo ICS subido por el user."""
    if 'file' not in request.FILES:
        return Response({"error": "Archivo ICS requerido"}, status=400, headers={"Access-Control-Allow-Origin": "*"})

    upload = request.FILES['file']

    try:
        cal = ICalCalendar.from_ical(upload.read())
    except Exception as exc:  # malformed ICS
        return Response({"error": f"Archivo ICS inválido: {exc}"}, status=400, headers={"Access-Control-Allow-Origin": "*"})

    momento_actual = timezone.now()
    privacy_solicitado = request.data.get('privacy', 'PRIVATE')
    user_creator = User.objects.filter(id=request.data.get('user')).first()
    if not user_creator:
        return Response({"error": "User no encontrado"}, status=400, headers={"Access-Control-Allow-Origin": "*"})

    calendar = Calendar.objects.create(
            name="Calendar de ICS",
            description="Calendar importado desde archivo ICS",
            privacy=privacy_solicitado,
            creator=user_creator,
            origin='CURRENT',
            external_id=upload.name,
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
        title = str(component.get('summary', 'Sin título'))
        description = str(component.get('description', ''))
        uid = str(component.get('uid'))
        
        date_str = inicio_dt.strftime('%Y-%m-%d')
        time_str = inicio_dt.strftime('%H:%M:%S')

        event = Event.objects.create(
            title=title,
            description=description,
            date=date_str,
            time=time_str,
            creator = user_creator,
            external_id=uid,
        )
        event.calendars.add(calendar)

    return Response({"message": "Archivo ICS importado exitosamente"}, headers={"Access-Control-Allow-Origin": "*"})


@api_view(['GET'])
def export_to_ics(request, calendar_id):
    """Endpoint para exportar un calendar a formato ICS."""
    try:
        calendar = Calendar.objects.get(id=calendar_id)
    except Calendar.DoesNotExist:
        return Response({"error": "Calendar no encontrado"}, status=404, headers={"Access-Control-Allow-Origin": "*"})

    cal = ICalCalendar()
    cal.add('prodid', '-//Current Calendar//')
    cal.add('version', '2.0')

    for event in calendar.eventos.all():
        event = event.to_ical_event()
        cal.add_component(event)

    ics_content = cal.to_ical()
    response = HttpResponse(ics_content, status=200, content_type='text/calendar; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="calendario_{calendar_id}.ics"'
    response["Access-Control-Allow-Origin"] = "*"
    return response