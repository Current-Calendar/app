from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.cache import cache
from django.contrib.gis.geos import Point
from django.db.models import Q
from main.models import MockElement, Usuario
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

@api_view(['GET'])
def buscar_usuarios(request):
    query = request.GET.get("search")

    if not query:
        return Response(
            {"errors": ["El parámetro 'search' es obligatorio."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    usuarios = Usuario.objects.filter(
        Q(username__icontains=query) |
        Q(email__icontains=query) |
        Q(pronombres__icontains=query)
    ).distinct()

    resultados = [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "pronombres": user.pronombres,
            "biografia": user.biografia,
            "foto": user.foto.url if user.foto else None,
            "total_seguidores": user.total_seguidores,
            "total_seguidos": user.total_seguidos,
            "total_calendarios_seguidos": user.total_calendarios_seguidos,
        }
        for user in usuarios
    ]

    return Response(resultados, status=status.HTTP_200_OK)