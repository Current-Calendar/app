from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.cache import cache
from django.contrib.gis.geos import Point
from main.models import MockElement, Evento, Calendario
from django.core.exceptions import ValidationError
from django.db import transaction
from rest_framework import status

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

@api_view(['POST'])
def crear_evento(request):
    data = request.data

    titulo = data.get("titulo")
    fecha = data.get("fecha")
    hora = data.get("hora")
    calendarios_ids = data.get("calendarios")

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