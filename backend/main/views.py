from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
from django.contrib.gis.geos import Point
from django.core.exceptions import ValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404
from main.models import MockElement, Evento, Calendario

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


@api_view(['PUT'])
def edit_event(request, evento_id):
    event = get_object_or_404(Evento, id=evento_id)
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