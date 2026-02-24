from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.cache import cache
from django.contrib.gis.geos import Point
from django.shortcuts import get_object_or_404
from main.models import MockElement
from .models import Calendario
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

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def eliminar_calendario(request, calendario_id):
    calendario = get_object_or_404(Calendario, id=calendario_id)
    
    # Only the creator can delete the calendar
    if calendario.creador != request.user:
        return Response({'error': 'You do not have permission to delete this calendar.'}, status=status.HTTP_403_FORBIDDEN)
    
    calendario.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def editar_calendario(request, calendario_id):
    calendario = get_object_or_404(Calendario, id=calendario_id)

    if calendario.creador != request.user:
        return Response({'error': 'You do not have permission to edit this calendar.'}, status=status.HTTP_403_FORBIDDEN)

    # fields that you can edit
    campos_editables = ['nombre', 'descripcion', 'estado']

    for campo in campos_editables:
        if campo in request.data:
            setattr(calendario, campo, request.data[campo])

    calendario.save()
    return Response({
        'id': calendario.id,
        'nombre': calendario.nombre,
        'descripcion': calendario.descripcion,
        'estado': calendario.estado,
    }, status=status.HTTP_200_OK)