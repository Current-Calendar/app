from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
from django.contrib.gis.geos import Point
from main.models import MockElement, Calendario, Evento

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
def asignar_evento_a_calendario(request):
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
def desasignar_evento_de_calendario(request):
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