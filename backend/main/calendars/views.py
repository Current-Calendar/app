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
from main.models import Calendario, Evento, Usuario
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from django.db import transaction, IntegrityError
from django.utils import timezone
from django.http import HttpResponse
from django.conf import settings
from utils.security import get_safe_ip
from icalendar import Calendar
from urllib.parse import urlparse

REQUEST_TIMEOUT_SECONDS = 5
ALLOWED_WEBCAL_HOSTS = getattr(settings, "ALLOWED_WEBCAL_HOSTS")

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def publish_calendar(request, calendar_id):
    calendar = get_object_or_404(Calendario, id=calendar_id)

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


@api_view(['GET','DELETE'])
@permission_classes([IsAuthenticated])
def delete_calendar(request, calendar_id):
    calendario = get_object_or_404(Calendario, id=calendar_id)
    
    # Only the creator can delete the calendar
    if calendario.creador != request.user:
        return Response({'error': 'You do not have permission to delete this calendar.'}, status=status.HTTP_403_FORBIDDEN)
    
    calendario.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['PUT', 'PATCH','GET'])
@permission_classes([IsAuthenticated])
def edit_calendar(request, calendar_id):
    calendario = get_object_or_404(Calendario, id=calendar_id)

    if calendario.creador != request.user:
        return Response({'error': 'You do not have permission to edit this calendar.'}, status=status.HTTP_403_FORBIDDEN)

    ESTADOS_VALIDOS = {'PRIVADO', 'AMIGOS', 'PUBLICO'}
    campos_editables = ['nombre', 'estado', 'descripcion']


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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_calendar(request):
    data = request.data
    print("DATA:", request.data)
    print("FILES:", request.FILES)

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
        portada=request.FILES.get('portada')
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
            "portada": request.build_absolute_uri(calendario.portada.url) if calendario.portada else None,
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
            "portada": request.build_absolute_uri(cal.portada.url) if cal.portada else None,
        }
        for cal in queryset
    ]

    return Response(results, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_my_calendars(request):
    """
    List calendars created by the authenticated user.

    GET /api/v1/calendarios/mis-calendarios

    Query parameters:
        q       (str)  -- case-insensitive substring match on calendar name
        estado  (str)  -- filter by privacy status (PRIVADO | AMIGOS | PUBLICO)
    """
    queryset = Calendario.objects.select_related('creador').filter(creador=request.user)

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
            "portada": request.build_absolute_uri(cal.portada.url) if cal.portada else None,
        }
        for cal in queryset
    ]

    return Response(results, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
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
def export_to_ics(request, calendar_id):
    """Endpoint para exportar un calendario a formato ICS."""
    try:
        calendario = Calendario.objects.get(id=calendar_id)
    except Calendario.DoesNotExist:
        return Response({"error": "Calendario no encontrado"}, status=404, headers={"Access-Control-Allow-Origin": "*"})

    cal = Calendar()
    cal.add('prodid', '-//Current Calendar//')
    cal.add('version', '2.0')

    for evento in calendario.eventos.all():
        event = evento.to_ical_event()
        cal.add_component(event)

    ics_content = cal.to_ical()
    response = HttpResponse(ics_content, status=200, content_type='text/calendar; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="calendario_{calendar_id}.ics"'
    response["Access-Control-Allow-Origin"] = "*"
    return response