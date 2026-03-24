import datetime
import html as html_lib
import requests
import socket
import ipaddress
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from main.models import Calendar, Event, User, Notification, CalendarLike
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from django.db import transaction, IntegrityError
from django.utils import timezone
from django.http import HttpResponse
from django.conf import settings
from utils.security import get_safe_ip
from utils.storage import get_signed_url
from icalendar import Calendar as ICalCalendar
from urllib.parse import urlparse
from django.core.cache import cache
from main.rs.calendars import recommend_calendars
from main.serializers import CalendarSummarySerializer

REQUEST_TIMEOUT_SECONDS = 5
ALLOWED_WEBCAL_HOSTS = getattr(settings, "ALLOWED_WEBCAL_HOSTS")


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def edit_co_owners(request, calendar_id):
    calendar = get_object_or_404(Calendar, id=calendar_id)

    if calendar.creator != request.user and not calendar.co_owners.filter(id=request.user.id).exists():
        return Response(
            {"errors": ["You do not have permission to modify this calendar."]},
            status = status.HTTP_403_FORBIDDEN
        )

    if "co_owners" not in request.data:
        return Response(
            {"errors": ["El campo 'co_owners' es obligatorio."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    co_owner_ids = request.data.get("co_owners")

    if not isinstance(co_owner_ids, list):
        return Response(
            {"errors": ["El campo 'co_owners' debe ser una lista de IDs de usuario."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        parsed_ids = [int(user_id) for user_id in co_owner_ids]
    except (TypeError, ValueError):
        return Response(
            {"errors": ["Todos los valores de 'co_owners' deben ser IDs numéricos."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    unique_ids = list(set(parsed_ids))

    if calendar.creator_id in unique_ids:
        return Response(
            {"errors": ["El creador no puede añadirse como co-owner."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    users = User.objects.filter(id__in=unique_ids)
    found_ids = set(users.values_list("id", flat=True))
    missing_ids = [user_id for user_id in unique_ids if user_id not in found_ids]

    if missing_ids:
        return Response(
            {"errors": [f"No existen usuarios con estos IDs: {missing_ids}."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if calendar.creator == request.user:
        calendar.co_owners.set(users)
    elif calendar.co_owners.filter(id=request.user.id).exists():
        calendar.co_owners.add(*users)

    co_owners_payload = list(
        calendar.co_owners.values("id", "username")
    )

    return Response(
        {
            "id": calendar.id,
            "name": calendar.name,
            "description": calendar.description,
            "privacy": calendar.privacy,
            "origin": calendar.origin,
            "creator": calendar.creator.id,
            "created_at": calendar.created_at,
            "co_owners": co_owners_payload,
        },
        status=status.HTTP_200_OK,
    )

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
            "created_at": calendar.created_at
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

    if 'cover' in request.FILES:
        if calendar.cover:
            calendar.cover.delete(save=False)
        calendar.cover = request.FILES['cover']
    elif request.data.get('remove_cover') == 'true':
        if calendar.cover:
            calendar.cover.delete(save=False)
        calendar.cover = None

    calendar.save()
    return Response({
        'id': calendar.id,
        'name': calendar.name,
        'description': calendar.description,
        'privacy': calendar.privacy,
        'cover': get_signed_url(request, calendar.cover),
        'co_owners': _serialize_co_owners(calendar),
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_calendar(request):
    data = request.data
    creator = request.user
    
    cover_file = request.FILES.get('cover')

    name = data.get('name')
    if isinstance(name, str):
        name = name.strip()
    description = data.get('description', '')

    if not name or not isinstance(name, str) or name.strip() == "":
        return Response(
            {"errors": ["El campo 'name' es obligatorio y no puede estar vacío."]},
            status = status.HTTP_400_BAD_REQUEST
        )
    
    if description and not isinstance(description, str):
        return Response(
            {"errors": ["El campo 'description' debe ser texto."]},
            status=status.HTTP_400_BAD_REQUEST
        )

    privacy = data.get('privacy', 'PRIVATE')
    valid_privacy = {choice[0] for choice in Calendar.PRIVACY_CHOICES}

    if privacy not in valid_privacy:
        return Response(
            {"errors": [f"El valor de 'privacy' no es válido. Valores permitidos: {', '.join(sorted(valid_privacy))}."]},
            status=status.HTTP_400_BAD_REQUEST
        )

    origin = data.get('origin', 'CURRENT')
    valid_origin = {choice[0] for choice in Calendar.ORIGIN_CHOICES}

    if origin not in valid_origin:
        return Response(
            {"errors": [f"El valor de 'origin' no es válido. Valores permitidos: {', '.join(sorted(valid_origin))}."]},
            status=status.HTTP_400_BAD_REQUEST
        )

    calendar = Calendar(
        creator=creator,
        name=name,
        description=data.get('description', ''),
        privacy=data.get('privacy', 'PRIVATE'),
        origin=data.get('origin', 'CURRENT'),
        external_id=data.get('external_id'),
    )
    
    if cover_file:
        calendar.cover.save(cover_file.name, cover_file, save=True)

    try:
        calendar.full_clean()
        with transaction.atomic():
            calendar.save()
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
    except IntegrityError:
        return Response(
            {"errors": ["No se pudo crear el calendario por una restricción de datos."]},
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
            "likes_count": calendar.likes_count,
            "liked_by_me": False,
            "cover": get_signed_url(request, calendar.cover),
        },
        status=status.HTTP_201_CREATED,
    )


def _get_liked_calendar_ids(user, queryset):
    if not user.is_authenticated:
        return set()
    return set(
        CalendarLike.objects.filter(user=user, calendar__in=queryset)
        .values_list("calendar_id", flat=True)
    )


def _serialize_co_owners(calendar: Calendar):
    return list(calendar.co_owners.values("id", "username"))


def _can_like_calendar(user, calendar: Calendar) -> bool:
    if calendar.co_owners.filter(id=user.id).exists() : 
        return True
    if calendar.creator == user:
        return True
    if calendar.privacy == "PUBLIC":
        return True
    if calendar.privacy == "FRIENDS" and calendar.creator.is_friend_with(user):
        return True
    return False


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_subscribed_calendars(request):
    """
    List calendars the authenticated user is subscribed to.

    GET /api/v1/calendars/subscribed/
    """
    queryset = request.user.subscribed_calendars.select_related('creator').prefetch_related('co_owners').order_by('-created_at')

    liked_ids = _get_liked_calendar_ids(request.user, queryset)

    results = [
        {
            "id": cal.id,
            "name": cal.name,
            "description": cal.description,
            "privacy": cal.privacy,
            "origin": cal.origin,
            "creator_id": cal.creator_id,
            "creator_username": cal.creator.username,
            "creator_photo": get_signed_url(request, cal.creator.photo),
            "created_at": cal.created_at,
            "likes_count": cal.likes_count,
            "liked_by_me": cal.id in liked_ids,
            "cover": get_signed_url(request, cal.cover),
            "co_owners": _serialize_co_owners(cal),
        }
        for cal in queryset
    ]

    return Response(results, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_friends_calendars(request):
    """
    List calendars with privacy FRIENDS created by mutual friends
    (users that the authenticated user follows and who also follow back).

    GET /api/v1/calendars/friends-calendars/
    """
    user = request.user

    mutual_friend_ids = user.following.filter(
        following=user
    ).values_list('id', flat=True)

    queryset = Calendar.objects.select_related('creator').filter(
        creator_id__in=mutual_friend_ids,
        privacy='FRIENDS'
    ).order_by('-created_at')

    liked_ids = _get_liked_calendar_ids(user, queryset)

    results = [
        {
            "id": cal.id,
            "name": cal.name,
            "description": cal.description,
            "privacy": cal.privacy,
            "origin": cal.origin,
            "creator_id": cal.creator_id,
            "creator_username": cal.creator.username,
            "creator_photo": get_signed_url(request, cal.creator.photo),
            "created_at": cal.created_at,
            "likes_count": cal.likes_count,
            "liked_by_me": cal.id in liked_ids,
            "cover": get_signed_url(request, cal.cover),
            "co_owners": _serialize_co_owners(cal),
        }
        for cal in queryset
    ]

    return Response(results, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_co_owned_calendars(request):
    """
    List calendars where the authenticated user is a co-owner.

    GET /api/v1/calendars/co_owners/
    """
    user = request.user

    queryset = Calendar.objects.select_related('creator').filter(
        co_owners=user
    ).order_by('-created_at')

    liked_ids = _get_liked_calendar_ids(user, queryset)

    results = [
        {
            "id": cal.id,
            "name": cal.name,
            "description": cal.description,
            "privacy": cal.privacy,
            "origin": cal.origin,
            "creator_id": cal.creator_id,
            "creator_username": cal.creator.username,
            "creator_photo": get_signed_url(request, cal.creator.photo),
            "created_at": cal.created_at,
            "likes_count": cal.likes_count,
            "liked_by_me": cal.id in liked_ids,
            "cover": get_signed_url(request, cal.cover),
            "co_owners": _serialize_co_owners(cal),
        }
        for cal in queryset
    ]

    return Response(results, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def subscribe_calendar(request, calendar_id):
    calendar = get_object_or_404(Calendar, id=calendar_id)
    user = request.user

    if calendar.creator == user:
        return Response(
            {'error': 'No puedes suscribirte a tu propio calendario.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if user.subscribed_calendars.filter(id=calendar_id).exists():
        user.subscribed_calendars.remove(calendar)
        return Response({'subscribed': False, 'calendar_id': calendar_id}, status=status.HTTP_200_OK)
    else:
        user.subscribed_calendars.add(calendar)
        Notification.objects.create(
            recipient=calendar.creator,
            sender=user,
            type= 'CALENDAR_FOLLOW',
            message=f"{user.username} has subscribed to '{calendar.name}'.",
            related_calendar=calendar
        )
        return Response({'subscribed': True, 'calendar_id': calendar_id}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def subscribe_calendar(request, calendar_id):
    calendar = get_object_or_404(Calendar, id=calendar_id)
    user = request.user

    if calendar.creator == user:
        return Response(
            {'error': 'No puedes suscribirte a tu propio calendario.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if user.subscribed_calendars.filter(id=calendar_id).exists():
        user.subscribed_calendars.remove(calendar)
        return Response({'subscribed': False, 'calendar_id': calendar_id}, status=status.HTTP_200_OK)
    else:
        user.subscribed_calendars.add(calendar)
        Notification.objects.create(
            recipient=calendar.creator,
            sender=user,
            type= 'CALENDAR_FOLLOW',
            message=f"{user.username} has subscribed to '{calendar.name}'.",
            related_calendar=calendar
        )
        return Response({'subscribed': True, 'calendar_id': calendar_id}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_like_calendar(request, calendar_id):
    calendar = get_object_or_404(Calendar, id=calendar_id)
    user = request.user

    with transaction.atomic():
        like = CalendarLike.objects.filter(user=user, calendar=calendar).first()

        if like:
            like.delete()
            liked = False
        else:
            if not _can_like_calendar(user, calendar):
                return Response(
                    {"errors": ["No tienes permiso para dar me gusta a este calendar."]},
                    status=status.HTTP_403_FORBIDDEN,
                )
            try:
                CalendarLike.objects.create(user=user, calendar=calendar)
            except IntegrityError:
                pass
            liked = True

    calendar.refresh_from_db(fields=['likes_count'])
    return Response(
        {
            "calendar_id": calendar_id,
            "liked": liked,
            "likes_count": calendar.likes_count,
            "liked_by_me": liked,
        },
        status=status.HTTP_200_OK,
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

    liked_ids = _get_liked_calendar_ids(request.user, queryset)

    results = [
        {
            "id": cal.id,
            "name": cal.name,
            "description": cal.description,
            "privacy": cal.privacy,
            "origin": cal.origin,
            "creator_id": cal.creator_id,
            "creator_username": cal.creator.username,
            "creator_photo": get_signed_url(request, cal.creator.photo),
            "created_at": cal.created_at,
            "likes_count": cal.likes_count,
            "liked_by_me": cal.id in liked_ids,
            "cover": get_signed_url(request, cal.cover)
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
    queryset = Calendar.objects.select_related('creator').prefetch_related('co_owners').filter(creator=request.user)

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

    liked_ids = _get_liked_calendar_ids(request.user, queryset)

    results = [
        {
            "id": cal.id,
            "name": cal.name,
            "description": cal.description,
            "privacy": cal.privacy,
            "origin": cal.origin,
            "creator_id": cal.creator_id,
            "creator_username": cal.creator.username,
            "creator_photo": get_signed_url(request, cal.creator.photo),
            "created_at": cal.created_at,
            "likes_count": cal.likes_count,
            "liked_by_me": cal.id in liked_ids,
            "cover": get_signed_url(request, cal.cover),
            "co_owners": _serialize_co_owners(cal),
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
@permission_classes([IsAuthenticated])
def get_calendar_share_info(request, calendar_id):
    """Returns shareable link info for a calendar."""
    calendar = get_object_or_404(Calendar, id=calendar_id)

    share_url = request.build_absolute_uri(f'/share/calendar/{calendar_id}/')
    deep_link = f"current://calendar-view?calendarId={calendar_id}"

    return Response({
        'calendar_id': calendar.id,
        'name': calendar.name,
        'description': calendar.description,
        'cover': get_signed_url(request, calendar.cover),
        'privacy': calendar.privacy,
        'creator_username': calendar.creator.username,
        'co_owners': _serialize_co_owners(calendar),
        'share_url': share_url,
        'deep_link': deep_link,
    })


def share_calendar_html(request, calendar_id):
    """Serve an HTML page with Open Graph meta tags for rich link previews."""
    calendar = get_object_or_404(Calendar, id=calendar_id)

    if calendar.privacy == 'PRIVATE':
        return HttpResponse(
            "<h1>This calendar is private</h1>",
            status=403,
            content_type='text/html'
        )

    _default_og_image = (
        getattr(settings, 'SHARE_OG_IMAGE_FALLBACK', None)
        or request.build_absolute_uri('/static/images/og-default.png')
    )
    if calendar.cover:
        raw_cover_url = get_signed_url(request, calendar.cover)
        is_local = raw_cover_url.startswith('http://localhost') or raw_cover_url.startswith('http://127.')
        # visual_cover: always show the real photo in the page
        visual_cover_url = raw_cover_url
        # og_cover: use fallback when local (WhatsApp/Telegram can't reach localhost)
        og_cover_url = raw_cover_url if not is_local else _default_og_image
    else:
        visual_cover_url = ''
        og_cover_url = _default_og_image
    deep_link = f"current://calendar-view?calendarId={calendar_id}"
    page_url = request.build_absolute_uri()

    safe_name = html_lib.escape(calendar.name)
    safe_desc = html_lib.escape(calendar.description or 'View this calendar on Current Calendar')
    safe_creator = html_lib.escape(calendar.creator.username)
    safe_visual_cover = html_lib.escape(visual_cover_url)
    safe_og_cover = html_lib.escape(og_cover_url)
    safe_deep_link = html_lib.escape(deep_link)
    safe_page_url = html_lib.escape(page_url)

    cover_html = f'<img class="cover" src="{safe_visual_cover}" alt="{safe_name}">' if visual_cover_url else '<div class="cover-placeholder">📅</div>'
    desc_html = f'<p class="description">{safe_desc}</p>' if calendar.description else ''
    og_image_html = f'<meta property="og:image" content="{safe_og_cover}"><meta name="twitter:image" content="{safe_og_cover}">'

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{safe_name} · Current Calendar</title>
  <meta property="og:title" content="{safe_name}">
  <meta property="og:description" content="{safe_desc}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="{safe_page_url}">
  {og_image_html}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{safe_name}">
  <meta name="twitter:description" content="{safe_desc}">
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f4f4; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }}
    .card {{ background: #fff; border-radius: 16px; overflow: hidden; max-width: 440px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }}
    .cover {{ width: 100%; height: 220px; object-fit: cover; background: #10464d; display: block; }}
    .cover-placeholder {{ width: 100%; height: 180px; background: linear-gradient(135deg, #10464d, #1a7a80); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 48px; }}
    .body {{ padding: 24px; }}
    h1 {{ font-size: 22px; font-weight: 800; color: #10464d; margin-bottom: 6px; }}
    .creator {{ font-size: 14px; color: #888; margin-bottom: 12px; }}
    .description {{ font-size: 15px; color: #555; line-height: 1.5; margin-bottom: 20px; }}
    .btn {{ display: block; text-align: center; background: #10464d; color: #fff; text-decoration: none; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 16px; }}
    .btn:hover {{ background: #0d3a40; }}
  </style>
</head>
<body>
  <div class="card">
    {cover_html}
    <div class="body">
      <h1>{safe_name}</h1>
      <p class="creator">by @{safe_creator}</p>
      {desc_html}
      <a class="btn" href="{safe_deep_link}">Open in Current Calendar</a>
    </div>
  </div>
</body>
</html>"""

    return HttpResponse(html_content, content_type='text/html; charset=utf-8')


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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recommended_calendars(request):
    try:
        user_id = request.user.id
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    cache_key = f"recommended_calendars_{user_id}"
    cached_data = cache.get(cache_key)
    if cached_data:
        return Response(cached_data, headers={"Access-Control-Allow-Origin": "*"})

    calendars = recommend_calendars(user, limit=30)
    serializer = CalendarSummarySerializer(calendars, many=True)

    cache.set(cache_key, serializer.data, 60 * 5)

    return Response(serializer.data, headers={"Access-Control-Allow-Origin": "*"})
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def invite_calendar(request: Request, calendar_id: int) -> Response:
    calendar = get_object_or_404(Calendar, pk=calendar_id)
    user_to_invite = get_object_or_404(User, pk=request.data.get("user"))

    if request.user == user_to_invite:
        return Response(
            {"error": "Cannot invite yourself"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if calendar.creator != request.user:
        return Response(
            {"error": "Only the calendar creator can send invitations"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if calendar.privacy == "PRIVATE":
        return Response(
            {"error": "Cannot invite to a private calendar"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    elif calendar.privacy == "FRIENDS":
        if not request.user.is_friend_with(user_to_invite):
            return Response(
                {"error": "Cannot invite non-friend to friends calendar"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if not Notification.objects.filter(
        recipient=user_to_invite,
        type="CALENDAR_INVITE",
        related_calendar=calendar,
        sender=request.user,
    ).exists():
        Notification.objects.create(
            recipient=user_to_invite,
            type="CALENDAR_INVITE",
            related_calendar=calendar,
            sender=request.user,
        )

    return Response(status=status.HTTP_204_NO_CONTENT)
