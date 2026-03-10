from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from ..models import Calendario, Evento
from django.contrib.gis.geos import Point
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from ..serializers import EventoSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_event(request):

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


@api_view(['GET', 'PUT'])
def edit_event(request, evento_id):
    event = get_object_or_404(Evento, id=evento_id)
    
    # Handle GET: Return event data
    if request.method == 'GET':
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
    
    # Handle PUT: Update event
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
def deasign_event_from_calendar(request):
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
def delete_event(request, pk):
    try:
        evento = Evento.objects.get(pk=pk)
    except Evento.DoesNotExist:
        return Response({"error": "Evento no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    if evento.creador != request.user:
        return Response(
            {"error": "No tienes permiso para borrar este evento porque no eres el creador."}, 
            status=status.HTTP_403_FORBIDDEN
        )

    evento.delete()
    return Response({"message": "Evento eliminado correctamente"}, status=status.HTTP_204_NO_CONTENT)