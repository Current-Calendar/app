from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework import status
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D
from django.core.cache import cache
from django.db.models import Q, Prefetch
from django.utils import timezone
from ..models import Event, EventAttendance, EventLike, EventSave
from ..serializers import EventSerializer
from main.entitlements import get_user_features
from current.throttles import HeavyEndpointThrottle

RADAR_CACHE_TTL_SECONDS = 30


@api_view(['GET'])
@throttle_classes([HeavyEndpointThrottle])
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
    user_key = user.id if user.is_authenticated else 'anon'
    # 5 decimals (~1.1m) keeps the key stable when the device sits still
    # without grouping clearly distinct positions into the same cache entry.
    cache_key = f"radar_events_{user_key}_{round(lat, 5)}_{round(lon, 5)}_{radio}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return Response(cached_data, status=status.HTTP_200_OK)

    limit_days = 0
    if user.is_authenticated:
        user_features = get_user_features(user)
        limit_days = user_features['max_days_difference_radar']
        filtro_privacidad = (
            Q(calendars__privacy='PUBLIC')
            | Q(creator=user)
            | Q(calendars__creator=user)
            | Q(calendars__co_owners=user)
            | Q(calendars__viewers=user)
            | Q(attendances__user=user, attendances__status='ASSISTING')
        )
    else:
        filtro_privacidad = Q(calendars__privacy='PUBLIC')

    today = timezone.now().date()
    max_date = today + timezone.timedelta(days=limit_days)

    prefetches = [
        'calendars',
        Prefetch(
            'attendances',
            queryset=EventAttendance.objects.filter(
                status='ASSISTING'
            ).select_related('user'),
            to_attr='assisting_attendances',
        ),
    ]
    if user.is_authenticated:
        prefetches.append(
            Prefetch(
                'attendances',
                queryset=EventAttendance.objects.filter(user=user).only(
                    'status', 'event_id'
                ),
                to_attr='my_attendance_records',
            )
        )

    events = (
        Event.objects
        .filter(
            filtro_privacidad,
            location__isnull=False,
            date__gte=today,
            date__lte=max_date
        )
        .annotate(distance=Distance("location", user_location))
        .filter(location__distance_lte=(user_location, D(km=radio)))
        .order_by("distance")
        .distinct()
        .select_related('creator')
        .prefetch_related(*prefetches)
    )

    event_list = list(events)

    liked_ids, saved_ids = set(), set()
    if user.is_authenticated:
        event_ids = [event.id for event in event_list]
        liked_ids = set(
            EventLike.objects.filter(user=user, event_id__in=event_ids)
            .values_list('event_id', flat=True)
        )
        saved_ids = set(
            EventSave.objects.filter(user=user, event_id__in=event_ids)
            .values_list('event_id', flat=True)
        )

    serializer = EventSerializer(
        event_list,
        many=True,
        context={
            'request': request,
            'liked_ids': liked_ids,
            'saved_ids': saved_ids,
        }
    )

    cache.set(cache_key, serializer.data, RADAR_CACHE_TTL_SECONDS)

    return Response(serializer.data, status=status.HTTP_200_OK)
