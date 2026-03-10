from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D
from django.db.models import Q
from django.utils import timezone
from ..models import Evento
from ..serializers import EventoSerializer

@api_view(['GET'])
def radar_events(request):
    # /api/radar?lat=..&lon=..&radio=5
    lat = request.GET.get("lat")
    lon = request.GET.get("lon")
    radio = request.GET.get("radio", 5)

    if not lat or not lon:
        return Response(
            {"error": "Debes enviar lat y lon"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        lat = float(lat)
        lon = float(lon)
        radio = float(radio)
    except ValueError:
        return Response(
            {"error": "lat, lon y radio deben ser numéricos"},
            status=status.HTTP_400_BAD_REQUEST
        )

    user_location = Point(lon, lat, srid=4326)

    user = request.user

    if user.is_authenticated:
        amigos = user.seguidos.all()

        filtro_privacidad = Q(calendarios__estado='PUBLICO') | \
                            Q(calendarios__estado='AMIGOS', calendarios__creador__in=amigos) | \
                            Q(creador=user)
    else:
        filtro_privacidad = Q(calendarios__estado='PUBLICO')

    eventos = (
        Evento.objects
        .filter(
            filtro_privacidad,
            ubicacion__isnull=False,
            fecha__gte=timezone.now().date()
        )
        .annotate(distancia=Distance("ubicacion", user_location))
        .filter(ubicacion__distance_lte=(user_location, D(km=radio)))
        .order_by("distancia")
        .distinct()
    )

    resultados = [
        {
            "id": evento.id,
            "titulo": evento.titulo,
            "descripcion": evento.descripcion,
            "nombre_lugar": evento.nombre_lugar,
            "fecha": evento.fecha,
            "hora": evento.hora,
            "distancia_km": round(evento.distancia.km, 2),
            "latitud": evento.ubicacion.y if evento.ubicacion else None,
            "longitud": evento.ubicacion.x if evento.ubicacion else None,
        }
        for evento in eventos
    ]
    serializer = EventoSerializer(
        eventos, 
        many=True, 
        context={'request': request}
    )

    return Response(serializer.data, status=status.HTTP_200_OK)