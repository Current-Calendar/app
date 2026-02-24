from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.contrib.gis.geos import Point
from main.models import MockElement, Calendario, Usuario

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
def crear_calendario(request):
    data = request.data

    creador_id = data.get('creador_id')
    nombre = data.get('nombre')

    if not creador_id:
        return Response(
            {"errors": ["El campo 'creador_id' es obligatorio."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not nombre:
        return Response(
            {"errors": ["El campo 'nombre' es obligatorio."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        creador = Usuario.objects.get(pk=creador_id)
    except Usuario.DoesNotExist:
        return Response(
            {"errors": ["El usuario creador no existe."]},
            status=status.HTTP_404_NOT_FOUND,
        )

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
