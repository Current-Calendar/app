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
def editar_evento(request, evento_id):
    evento = get_object_or_404(Evento, id=evento_id)
    data = request.data

    # Validar que campos requeridos no vengan vacios si se envian
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

    # Actualizar campos escalares si estan presentes
    campos_editables = [
        "titulo", "descripcion", "nombre_lugar",
        "fecha", "hora", "recurrencia", "id_externo",
    ]
    for campo in campos_editables:
        if campo in data:
            setattr(evento, campo, data[campo])

    # Ubicacion via lat/lon
    if "latitud" in data or "longitud" in data:
        lat = data.get("latitud")
        lon = data.get("longitud")
        try:
            evento.ubicacion = Point(float(lon), float(lat))
        except Exception:
            return Response(
                {"errors": ["Latitud o longitud inválidas."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # Calendarios M2M
    calendarios = None
    if "calendarios" in data:
        calendarios_ids = data["calendarios"]
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

    try:
        evento.full_clean()
        with transaction.atomic():
            evento.save()
            if calendarios is not None:
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
            "descripcion": evento.descripcion,
            "nombre_lugar": evento.nombre_lugar,
            "fecha": evento.fecha,
            "hora": evento.hora,
            "recurrencia": evento.recurrencia,
            "id_externo": evento.id_externo,
            "calendarios": list(evento.calendarios.values_list("id", flat=True)),
            "fecha_creacion": evento.fecha_creacion,
        },
        status=status.HTTP_200_OK,
    )