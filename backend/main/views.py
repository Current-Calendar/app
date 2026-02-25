from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
from django.contrib.gis.geos import Point
from django.shortcuts import get_object_or_404
from main.models import MockElement, Calendario

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
def publish_calendar(request, calendario_id):
    calendar = get_object_or_404(Calendario, id=calendario_id)

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