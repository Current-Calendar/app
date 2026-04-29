from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from ..models import Calendar, Event, EventLike, EventSave, Notification, EventAttendance, User
from django.contrib.gis.geos import Point
from django.core.exceptions import ValidationError
from django.db import transaction, IntegrityError
from django.db.models import Q, Prefetch
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from main.rs.events import recommend_events
from ..serializers import EventSerializer, EventPagination
from utils.storage import get_signed_url
import json
from datetime import datetime


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_event(request):

    data = request.data

    title = data.get("title")
    date = data.get("date")
    time = data.get("time")
    end_date = data.get("end_date")
    end_time = data.get("end_time")
    calendars_ids = data.get("calendars")

    if calendars_ids and isinstance(calendars_ids, str):
        try:
            parsed = json.loads(calendars_ids)
            if isinstance(parsed, list):
                calendars_ids = parsed
            else:
                 calendars_ids = [calendars_ids]
        except ValueError:
            calendars_ids = [calendars_ids]

    creator = request.user
    

    if not title:
        return Response(
            {"errors": ["El campo 'title' es obligatorio."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not date:
        return Response(
            {"errors": ["El campo 'date' es obligatorio."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not time:
        return Response(
            {"errors": ["El campo 'time' es obligatorio."]},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    if end_date:
        if not end_date.strip():
            end_date = None
    
    if Event.objects.filter(
        creator=creator,
        date=date,
        time=time
    ).exists():
        return Response(
            {"errors": ["Ya tienes un evento creado para esa fecha y hora."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not calendars_ids or not isinstance(calendars_ids, list):
        return Response(
            {"errors": ["Debe indicar al menos un calendar válido."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    calendars = Calendar.objects.filter(id__in=calendars_ids)

    if calendars.count() != len(calendars_ids):
        return Response(
            {"errors": ["Algún calendar no existe."]},
            status=status.HTTP_404_NOT_FOUND,
        )
    for calendar in calendars:
        is_creator_or_co_owner = calendar.creator == creator or calendar.co_owners.filter(id=creator.id).exists()

        if not is_creator_or_co_owner:
            return Response(
                {"errors": ["No tienes permiso para agregar eventos a este calendario."]},
                status=status.HTTP_403_FORBIDDEN,
            )

    location = None
    lat = data.get("latitud")
    lon = data.get("longitud")
    photo = request.FILES.get("photo")

    if lat and lon:
        try:
            location = Point(float(lon), float(lat))
        except Exception:
            return Response(
                {"errors": ["Latitud o longitud inválidas."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

    try:
        event_datetime = datetime.fromisoformat(f"{date}T{time}")
        if event_datetime < datetime.now():
            return Response(
                {"errors": ["No puedes crear un evento para una fecha y hora en el pasado."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
    except ValueError:
        return Response(
            {"errors": ["El formato de date o time es incorrecto."]},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    event = Event(
        title=title,
        description=data.get("description", ""),
        place_name=data.get("place_name", ""),
        date=date,
        time=time,
        end_date=end_date if end_date else None,
        end_time=end_time if end_time else None,
        photo=photo,
        recurrence=data.get("recurrence"),
        external_id=data.get("external_id"),
        location=location,
        creator=creator
    )

    try:
        event.full_clean()
        with transaction.atomic():
            event.save()
            event.calendars.set(calendars)
            if photo:
                event.photo.save(photo.name, photo, save=True)

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
            "title": event.title,
            "creator": event.creator.id,
            "description": event.description,
            "place_name": event.place_name,
            "date": event.date,
            "time": event.time,
            "recurrence": event.recurrence,
            "external_id": event.external_id,
            "calendars": calendars_ids,
            "created_at": event.created_at,
            "photo": get_signed_url(request, event.photo),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET', 'PUT', 'PATCH'])
def edit_event(request: Request, event_id):
    if not request.user.is_authenticated:
        return Response(None, status=status.HTTP_401_UNAUTHORIZED)

    event = get_object_or_404(Event, id=event_id)
    user = request.user

    current_calendars = event.calendars.all()
    if not current_calendars.exists():
        return Response(
            {"error": "No tienes permiso sobre este event"},
            status=status.HTTP_403_FORBIDDEN
        )

    for calendar in current_calendars:
        is_creator_or_co_owner = (
            calendar.creator == user or
            calendar.co_owners.filter(id=user.id).exists()
        )
        if not is_creator_or_co_owner:
            return Response(
                {"errors": ["No tienes permiso para editar eventos en este calendario."]},
                status=status.HTTP_403_FORBIDDEN
            )
    
    if event.date < datetime.now().date():
        return Response(
            {"errors": ["You cannot edit an event that has already occurred."]},
            status=status.HTTP_400_BAD_REQUEST
        )

    if request.method == 'GET':
        serializer = EventSerializer(event, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    # Handle PUT: Update event
    data = request.data

    # Validate required fields are not empty if provided
    if "title" in data and not data["title"]:
        return Response(
            {"errors": ["El campo 'title' no puede estar vacío."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if "date" in data and not data["date"]:
        return Response(
            {"errors": ["El campo 'date' no puede estar vacío."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if "time" in data and not data["time"]:
        return Response(
            {"errors": ["El campo 'time' no puede estar vacío."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    new_date = data.get("date", event.date)
    new_time = data.get("time", event.time)
    if new_date and new_time:
        try:
            event_datetime = datetime.fromisoformat(f"{new_date}T{new_time}")
            if event_datetime < datetime.now():
                return Response(
                    {"errors": ["No puedes editar un evento hacia una fecha y hora en el pasado."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except ValueError:
            return Response(
                {"errors": ["El formato de date o time es incorrecto."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # Update scalar fields if present
    editable_fields = [
        "title", "description", "place_name",
        "date", "time", "end_date", "end_time", "recurrence", "external_id",
    ]
    for field in editable_fields:
        if field in data:
            setattr(event, field, data[field])

    # Location via lat/lon
    if "latitud" in data or "longitud" in data:
        lat = data.get("latitud")
        lon = data.get("longitud")
        try:
            event.location = Point(float(lon), float(lat))
        except Exception:
            return Response(
                {"errors": ["Latitud o longitud inválidas."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if "photo" in request.FILES:
        if event.photo:
             event.photo.delete(save=False)
        event.photo = request.FILES["photo"]
    elif request.data.get("remove_photo") == "true":
         if event.photo:
             event.photo.delete(save=False)
         event.photo = None

    # Calendars M2M
    calendars = event.calendars.all()
    if "calendars" in data:
        calendars_ids = data["calendars"]
        if isinstance(calendars_ids, str):
            try:
                parsed = json.loads(calendars_ids)
                if isinstance(parsed, list):
                    calendars_ids = parsed
                else:
                    calendars_ids = [calendars_ids]
            except ValueError:
                calendars_ids = [calendars_ids]

        if not calendars_ids or not isinstance(calendars_ids, list):
            return Response(
                {"errors": ["Debe indicar al menos un calendar válido."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        calendars = Calendar.objects.filter(id__in=calendars_ids)
        if calendars.count() != len(calendars_ids):
            return Response(
                {"errors": ["Algún calendar no existe."]},
                status=status.HTTP_404_NOT_FOUND,
            )

    for calendar in calendars:
        is_creator_or_co_owner = (calendar.creator == user or calendar.co_owners.filter(id=user.id).exists())

        if not is_creator_or_co_owner:
            return Response({"errors": ["No tienes permiso para editar eventos en este calendario."]},
                status=status.HTTP_403_FORBIDDEN
            )

    try:
        event.full_clean()
        with transaction.atomic():
            event.save()
            if calendars is not None:
                event.calendars.set(calendars)

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
            "title": event.title,
            "description": event.description,
            "place_name": event.place_name,
            "date": event.date,
            "time": event.time,
            "recurrence": event.recurrence,
            "external_id": event.external_id,
            "calendars": list(event.calendars.values_list("id", flat=True)),
            "created_at": event.created_at,
            "photo": get_signed_url(request, event.photo),
        },
        status=status.HTTP_200_OK,
    )
    

@api_view(['GET'])
@permission_classes([AllowAny])
def list_events(request):
    """
    List and search events.

    GET /api/v1/events/list

    Query parameters:
        q           (str)  -- case-insensitive substring match on title/description
        calendarIds (str)  -- filter by calendar IDs (comma-separated)
        tags        (str)  -- filter by tag IDs (comma-separated, e.g., "1,2")
    """
    user = request.user
    
    if user.is_authenticated:
        privacy_filter = (
            Q(calendars__privacy='PUBLIC') |
            Q(calendars__creator=user) |
            Q(calendars__co_owners=user) |
            Q(calendars__viewers=user)
        )
    else:
        privacy_filter = Q(calendars__privacy='PUBLIC')

    prefetches = [
        'calendars',
        Prefetch(
            'attendances',
            queryset=EventAttendance.objects.filter(
                status='ASSISTING'
            ).select_related('user'),
        ),
    ]

    if user.is_authenticated:
        prefetches.append(
            Prefetch(
                'attendances',
                queryset=EventAttendance.objects.filter(user=user).only('status', 'event_id'),
                to_attr='my_attendance_records',
            )
        )

    queryset = (
        Event.objects
        .filter(privacy_filter)
        .distinct().
        select_related('creator')
        .prefetch_related(*prefetches)
        .order_by('-created_at')
    )

    calendar_ids = request.GET.get('calendarIds')
    if calendar_ids:
        id_list = [cid.strip() for cid in calendar_ids.split(',') if cid.strip().isdigit()]
        if id_list:
            queryset = queryset.filter(calendars__id__in=id_list).distinct()

        q = request.GET.get('q', '').strip()
        if q:
            queryset = queryset.filter(
                Q(title__icontains=q) | Q(description__icontains=q)
            )

        liked_ids, saved_ids = set(), set()
        if user.is_authenticated:
            all_ids = list(queryset.values_list('id', flat=True))
            liked_ids = set(EventLike.objects.filter(user=user, event_id__in=all_ids).values_list('event_id', flat=True))
            saved_ids = set(EventSave.objects.filter(user=user, event_id__in=all_ids).values_list('event_id', flat=True))

        serializer = EventSerializer(
            queryset, many=True,
            context={'request': request, 'liked_ids': liked_ids, 'saved_ids': saved_ids}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    q = request.GET.get('q', '').strip()
    if q:
        queryset = queryset.filter(
            Q(title__icontains=q) | Q(description__icontains=q)
        )

    # Filtrar por tags
    tags = request.GET.get('tags', '').strip()
    if tags:
        try:
            tag_ids = [tid.strip() for tid in tags.split(',') if tid.strip().isdigit()]
            if tag_ids:
                queryset = queryset.filter(tags__id__in=tag_ids).distinct()
        except ValueError:
            return Response(
                {"errors": ["Invalid 'tags' format. Expected comma-separated integers."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

    queryset = queryset.order_by('-created_at')

    paginator = EventPagination()
    page = paginator.paginate_queryset(queryset, request)

    liked_ids = set()
    saved_ids = set()
    if user.is_authenticated:
        page_ids = [e.id for e in page]
        liked_ids = set(EventLike.objects.filter(user=user, event_id__in=page_ids).values_list('event_id', flat=True))
        saved_ids = set(EventSave.objects.filter(user=user, event_id__in=page_ids).values_list('event_id', flat=True))

    serializer = EventSerializer(
        page, many=True,
        context={'request': request, 'liked_ids': liked_ids, 'saved_ids': saved_ids}
    )

    return paginator.get_paginated_response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def list_events_from_calendar(request):
    """
    List and search events.

    GET /api/v1/events/list

    Query parameters:
        calendarId (int) -- filter by calendar ID
    """
    user = request.user
    if user.is_authenticated:
        privacy_filter = (
            Q(calendars__privacy='PUBLIC') |
            Q(calendars__creator=user)
        )
    else:
        privacy_filter = Q(calendars__privacy='PUBLIC')

    queryset = Event.objects.filter(privacy_filter).distinct().order_by('-created_at')
    calendar_id = request.GET.get('calendarId')

    if calendar_id:
        queryset = queryset.filter(calendars__id=calendar_id)

    results = [
        {
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "place_name": event.place_name,
            "date": event.date,
            "time": event.time,
            "recurrence": event.recurrence,
            "external_id": event.external_id,
            "calendars": list(event.calendars.values_list("id", flat=True)),
            "created_at": event.created_at,
            "photo": get_signed_url(request, event.photo),
        }
        for event in queryset
    ]
    return Response(results, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def asign_event_to_calendar(request):
    evento_id = request.data.get('evento_id')
    calendario_id = request.data.get('calendario_id')

    if not evento_id or not calendario_id:
        return Response(
            {"error": "Se requieren evento_id y calendario_id"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        event = Event.objects.get(pk=evento_id)
    except Event.DoesNotExist:
        return Response({"error": "Event no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    try:
        calendar = Calendar.objects.get(pk=calendario_id)
    except Calendar.DoesNotExist:
        return Response({"error": "Calendar no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    if calendar.creator != request.user and not calendar.co_owners.filter(id=request.user.id).exists():
        return Response(
            {"errors": ["No tienes permiso para modificar este calendar."]},
            status = status.HTTP_403_FORBIDDEN
        )
    if event.creator != request.user:
        return Response(
            {"errors": ["No tienes permiso para usar este event."]},
            status = status.HTTP_403_FORBIDDEN
        )
    if event.calendars.filter(pk=calendar.pk).exists():
        return Response(
            {"error": "El event ya está asignado a este calendar"},
            status=status.HTTP_400_BAD_REQUEST
        )

    event.calendars.add(calendar)
    return Response(
        {"mensaje": f"Event '{event.title}' asignado al calendar '{calendar.name}'"},
        status=status.HTTP_200_OK
    )
    

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def deasign_event_from_calendar(request):
    evento_id = request.data.get('evento_id')
    calendario_id = request.data.get('calendario_id')

    if not evento_id or not calendario_id:
        return Response(
            {"error": "Se requieren evento_id y calendario_id"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        event = Event.objects.get(pk=evento_id)
    except Event.DoesNotExist:
        return Response({"error": "Event no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    try:
        calendar = Calendar.objects.get(pk=calendario_id)
    except Calendar.DoesNotExist:
        return Response({"error": "Calendar no encontrado"}, status=status.HTTP_404_NOT_FOUND)
    
    if calendar.creator != request.user and not calendar.co_owners.filter(id=request.user.id).exists():
        return Response(
            {"error": "No tienes permiso para modificar este calendar"},
            status=status.HTTP_403_FORBIDDEN
        )
    if event.creator != request.user:
        return Response(
            {"error": "No tienes permiso sobre este event"},
            status=status.HTTP_403_FORBIDDEN
        )

    if not event.calendars.filter(pk=calendar.pk).exists():
        return Response(
            {"error": "El event no está asignado a este calendar"},
            status=status.HTTP_400_BAD_REQUEST
        )

    event.calendars.remove(calendar)
    return Response(
        {"mensaje": f"Event '{event.title}' desasignado del calendar '{calendar.name}'"},
        status=status.HTTP_200_OK
    )
   
   
 
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_event(request, event_id):
    try:
        event = Event.objects.get(pk=event_id)
    except Event.DoesNotExist:
        return Response({"error": "Event no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    can_delete = event.calendars.filter(
        Q(creator=request.user) | Q(co_owners=request.user)
    ).exists()

    if not can_delete:
        return Response(
            {"error": "No tienes permiso para borrar este event."},
            status=status.HTTP_403_FORBIDDEN
        )

    event.delete()
    return Response({"message": "Event eliminado correctamente"}, status=status.HTTP_204_NO_CONTENT)



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recommended_events(request):
    try:
        user_id = request.user.id
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    cache_key = f"recommended_events_{user_id}"
    cached_data = cache.get(cache_key)
    if cached_data:
        return Response(cached_data, headers={"Access-Control-Allow-Origin": "*"})

    events = recommend_events(user, limit=30)
    liked_event_ids = set(EventLike.objects.filter(user=user).values_list('event_id', flat=True))
    saved_event_ids = set(EventSave.objects.filter(user=user).values_list('event_id', flat=True))
    serializer = EventSerializer(events, many=True, context={'request': request, 'liked_ids': liked_event_ids, 'saved_ids': saved_event_ids})

    cache.set(cache_key, serializer.data, 60 * 5)

    return Response(serializer.data, headers={"Access-Control-Allow-Origin": "*"})
def _can_like_event(user, event: Event) -> bool:
    """User can like an event if they can access at least one of its calendars."""
    for calendar in event.calendars.all():
        if calendar.privacy == "PUBLIC":
            return True
        if calendar.creator == user:
            return True
    return False


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_like_event(request, event_id):
    event = get_object_or_404(Event, id=event_id)
    user = request.user

    with transaction.atomic():
        like = EventLike.objects.filter(user=user, event=event).first()

        if like:
            like.delete()
            liked = False
        else:
            if not _can_like_event(user, event):
                return Response(
                    {"errors": ["No tienes permiso para dar me gusta a este evento."]},
                    status=status.HTTP_403_FORBIDDEN,
                )
            try:
                EventLike.objects.create(user=user, event=event)
            except IntegrityError:
                pass
            liked = True

    event.refresh_from_db(fields=['likes_count'])
    cache.delete(f"recommended_events_{user.id}")
    return Response(
        {
            "event_id": event_id,
            "liked": liked,
            "likes_count": event.likes_count,
            "liked_by_me": liked,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_save_event(request, event_id):
    event = get_object_or_404(Event, id=event_id)
    user = request.user

    with transaction.atomic():
        save = EventSave.objects.filter(user=user, event=event).first()

        if save:
            save.delete()
            saved = False
        else:
            try:
                EventSave.objects.create(user=user, event=event)
            except IntegrityError:
                pass
            saved = True

    cache.delete(f"recommended_events_{user.id}")
    return Response(
        {
            "event_id": event_id,
            "saved": saved,
            "saved_by_me": saved,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def rsvp_event(request, event_id):
    from ..models import EventAttendance
    
    event = get_object_or_404(Event, id=event_id)
    status_value = request.data.get('status')
    valid_statuses = ['ASSISTING', 'NOT_ASSISTING']
    if not status_value or status_value not in valid_statuses:
        return Response(
            {"error": f"Status must be one of: {valid_statuses}"},
            status=status.HTTP_400_BAD_REQUEST
        )
    #get_or_create + update
    attendance, _ = EventAttendance.objects.get_or_create(
        user=request.user,
        event=event,
    )
    attendance.status = status_value
    attendance.save()

    cache.delete(f"recommended_events_{request.user.id}")
    
    # Convertir a ISO 8601 con Z (UTC)
    responded_at_iso = attendance.updated_at.isoformat()
    if '+00:00' in responded_at_iso:
        responded_at_iso = responded_at_iso.replace('+00:00', 'Z')
    
    return Response({
        'status': attendance.status,
        'respondedAt': responded_at_iso,
    }, status=status.HTTP_200_OK)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def invite_event(request: Request, event_id: int):
    event = get_object_or_404(Event, pk=event_id)
    user_to_invite = get_object_or_404(User, pk=request.data.get("user"))

    if request.user == user_to_invite:
        return Response(
            {"error": "Cannot invite yourself"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if event.creator != request.user:
        return Response(
            {"error": "Only the event creator can send invitations"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not Notification.objects.filter(
        recipient=user_to_invite,
        type="EVENT_INVITE",
        related_event=event,
        sender=request.user,
    ).exists():
        Notification.objects.create(
            recipient=user_to_invite,
            type="EVENT_INVITE",
            related_event=event,
            sender=request.user,
            message=f"@{request.user.username} has invited you to the event \"{event.title}\".",
        )

    return Response(status=status.HTTP_204_NO_CONTENT)
