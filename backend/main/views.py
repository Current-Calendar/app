from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.cache import cache
from django.contrib.gis.geos import Point
from main.models import MockElement


@api_view(["GET"])
def hello_world(request):
    cache_key = "sevilla_point_data"
    cached_data = cache.get(cache_key)
    if cached_data:
        return Response({
            "source": "Redis (Cache)",
            "data": cached_data
        }, headers={"Access-Control-Allow-Origin": "*"})

    pnt = Point(-5.9926, 37.3861)
    obj, created = MockElement.objects.get_or_create(
        name="La Giralda Mock",
        defaults={'geo_point': pnt}
    )

    result = {
        "id": obj.id,
        "name": obj.name,
        "coordinates": {
            "longitude": obj.geo_point.x,
            "latitude": obj.geo_point.y
        },
        "created_in_db": created,
        "timestamp": str(obj.created_at)
    }

    cache.set(cache_key, result, 60)

    return Response({
        "source": "PostgreSQL (Database)",
        "data": result
    }, headers={"Access-Control-Allow-Origin": "*"})
