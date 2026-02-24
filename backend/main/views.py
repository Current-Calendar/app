from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.cache import cache
from django.contrib.gis.geos import Point
from main.models import MockElement
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
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
class UsuarioPropioView(APIView):
    permission_classes = [IsAuthenticated]
    def delete(self, request):
        request.user.delete()
        return Response(
            {"message": "Usuario eliminado satisfactoriamente"},
            status=202
        )