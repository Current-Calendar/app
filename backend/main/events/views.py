from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from ..models import Calendar, Event, Notification, EventAttendance, User
from django.contrib.gis.geos import Point
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from ..serializers import EventSerializer
from utils.storage import get_signed_url
import json


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_event(request):

    data = request.data

    title = data.get("title")
    date = data.get("date")
    time = data.get("time")
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
        if calendar.privacy in ("PRIVATE", "PUBLIC") and calendar.creator != creator:
            return Response({"errors": [f"No tienes permiso para añadir events al calendar {calendar.id}."]},
                status=status.HTTP_403_FORBIDDEN
            )
        if calendar.privacy == "FRIENDS":
            is_following_calendar = calendar.subscribers.filter(id=creator.pk).exists()
            if not is_following_calendar or not calendar.creator.is_friend_with(creator):
                 return Response({"errors": [f"No tienes permiso para añadir events al calendar {calendar.id}."]},
                    status=status.HTTP_403_FORBIDDEN
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
    
    event = Event(
        title=title,
        description=data.get("description", ""),
        place_name=data.get("place_name", ""),
        date=date,
        time=time,
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
    if request.method != "GET" and not request.user.is_authenticated:
        return Response(None, status=status.HTTP_401_UNAUTHORIZED)

    event = get_object_or_404(Event, id=event_id)
    
    if request.method == 'GET':
        serializer = EventSerializer(event, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    # Handle PUT: Update event
    data = request.data
    user = request.user

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

    # Update scalar fields if present
    editable_fields = [
        "title", "description", "place_name",
        "date", "time", "recurrence", "external_id",
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
        if calendar.privacy in ("PRIVATE", "PUBLIC") and calendar.creator != user:
            return Response({"errors": [f"No tienes permiso para editar events del calendar {calendar.id}."]},
                status=status.HTTP_403_FORBIDDEN
            )
        if calendar.privacy == "FRIENDS":
            is_following_calendar = calendar.subscribers.filter(id=user.pk).exists()
            if not is_following_calendar or not calendar.creator.is_friend_with(user):
                return Response({"errors": [f"No tienes permiso para editar events del calendar {calendar.id}."]},
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
def list_events(request):
    queryset = Event.objects.all()

    q = request.GET.get('q', '').strip()
    if q:
        queryset = queryset.filter(
            Q(title__icontains=q) | Q(description__icontains=q)
        )

    calendar_id = request.GET.get('calendarId')
    if calendar_id:
        queryset = queryset.filter(calendars__id=calendar_id)

    queryset = queryset.order_by('-created_at')

    serializer = EventSerializer(queryset, many=True, context={'request': request})

    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
def list_events_from_calendar(request):
    """
    List and search events.

    GET /api/v1/events/list

    Query parameters:
        calendarId (int) -- filter by calendar ID
    """
    queryset = Event.objects.all().order_by('-created_at')
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

    if calendar.creator != request.user:
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
    
    if calendar.creator != request.user:
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

    if event.creator != request.user:
        return Response(
            {"error": "No tienes permiso para borrar este event porque no eres el creator."}, 
            status=status.HTTP_403_FORBIDDEN
        )

    event.delete()
    return Response({"message": "Event eliminado correctamente"}, status=status.HTTP_204_NO_CONTENT)

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
            {"error": "Only the event creator send invitations"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    Notification.objects.create(
        recipient=user_to_invite,
        type="EVENT_INVITE",
        related_event=event,
        sender=request.user,
    )

    return Response(status=status.HTTP_204_NO_CONTENT)