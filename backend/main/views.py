from rest_framework.decorators import action, api_view
from rest_framework import viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from django.core.cache import cache
from django.contrib.gis.geos import Point
from main.models import MockElement, Usuario


class UserViewSet(viewsets.GenericViewSet):
    queryset = Usuario.objects.all()
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["post"])
    def follow(self, request: Request, pk: int) -> Response:
        user: Usuario = request.user
        user_to_follow: Usuario = self.get_object()

        if user.seguidos.filter(pk=user_to_follow.pk).exists():
            user.seguidos.remove(user_to_follow)
            followed = False
        else:
            user.seguidos.add(user_to_follow)
            followed = True

        user.save()

        return Response(
            {
                "user": user_to_follow.pk,
                "followed": followed,
            }
        )


@api_view(["GET"])
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