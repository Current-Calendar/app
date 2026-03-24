from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D
from django.db.models import Q
from django.utils import timezone
from ..models import Event
from ..serializers import EventSerializer

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
        friends = user.following.all()

        filtro_privacidad = Q(calendars__privacy='PUBLIC') | \
                            Q(calendars__privacy='FRIENDS', calendars__creator__in=friends) | \
                            Q(creator=user)
    else:
        filtro_privacidad = Q(calendars__privacy='PUBLIC')

    events = (
        Event.objects
        .filter(
            filtro_privacidad,
            location__isnull=False,
            date__gte=timezone.now().date()
        )
        .annotate(distance=Distance("location", user_location))
        .filter(location__distance_lte=(user_location, D(km=radio)))
        .order_by("distance")
        .distinct()
    )

    resultados = [
        {
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "place_name": event.place_name,
            "date": event.date,
            "time": event.time,
            "distancia_km": round(event.distancia.km, 2),
            "latitud": event.location.y if event.location else None,
            "longitud": event.location.x if event.location else None,
        }
        for event in events
    ]
    serializer = EventSerializer(
        events, 
        many=True, 
        context={'request': request}
    )

    return Response(serializer.data, status=status.HTTP_200_OK)