import datetime
from asyncio import events
from icalendar import Calendar as ICalCalendar
import os
import ipaddress
import socket
from urllib.parse import urlparse
from django.conf import settings
from django.contrib.auth import login
from django.contrib.gis.geos import Point
from main.models import MockElement
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.shortcuts import redirect, get_object_or_404
from django.utils import timezone
from django.db import IntegrityError, transaction
from django.db.models import Q
from google_auth_oauthlib import flow as google_auth_oauthlib_flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status, viewsets, mixins
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authentication import SessionAuthentication
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.contrib.gis.geos import Point
from django.http import HttpResponse

from main.serializers import (
    UserRegistrationSerializer,
    UserDetailSerializer,
    UserSerializer,
    PublicUserSerializer,
    OwnProfileSerializer,
    EventSerializer
)
import requests
from rest_framework.views import APIView
from utils.security import get_safe_ip

from main.models import MockElement, Calendar, Event, User
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D
from .permissions import IsCreator
from django.db.models import Q

from rest_framework.decorators import api_view, permission_classes

GOOGLE_REDIRECT_URIS = settings.GOOGLE_REDIRECT_URIS
ALLOWED_WEBCAL_HOSTS = getattr(settings, "ALLOWED_WEBCAL_HOSTS")
REQUEST_TIMEOUT_SECONDS = 5

if "localhost" in GOOGLE_REDIRECT_URIS:
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'


def _is_safe_calendar_url(raw_url: str):
    """Basic SSRF guard for external calendar downloads."""
    parsed = urlparse(raw_url)

    if parsed.scheme != "https":
        return False, "Only https URLs are allowed"

    host = parsed.hostname
    if not host:
        return False, "URL has no host"

    # Host allowlist check (suffix based to allow subdomains)
    if ALLOWED_WEBCAL_HOSTS and not any(host == allowed or host.endswith(f".{allowed}") for allowed in ALLOWED_WEBCAL_HOSTS):
        return False, "Host not allowed"

    try:
        addr_info = socket.getaddrinfo(host, None)
        for _, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            ip_obj = ipaddress.ip_address(ip_str)
            if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_reserved or ip_obj.is_link_local or ip_obj.is_multicast:
                return False, "Host resolves to a non-public IP"
    except Exception:
        return False, "Could not resolve host"

    return True, None


class UserViewSet(viewsets.GenericViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["post"])
    def follow(self, request: Request, pk: int) -> Response:
        user: User = request.user
        user_to_follow: User = self.get_object()

        if user.following.filter(pk=user_to_follow.pk).exists():
            user.following.remove(user_to_follow)
            followed = False
        else:
            user.following.add(user_to_follow)
            followed = True

        user.save()

        return Response(
            {
                "user": user_to_follow.pk,
                "followed": followed,
            }
        )

    def retrieve(self, request, pk) -> Response:
        user = self.get_object()
        user_data = PublicUserSerializer(user, context={'request': request}).data
        public_calendars = list(user.created_calendars.filter(privacy="PUBLIC").values(
            "id", "name", "description", "cover", "created_at"
        ))
        user_data["public_calendars"] = public_calendars
        return Response(user_data)

class EventViewSet(mixins.DestroyModelMixin, viewsets.GenericViewSet):
    queryset = Event.objects.all()
    permission_classes = [IsAuthenticated & IsCreator]


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




def google_authorization(request):
    """Google authorization to obtain access to the Google Calendar API."""
    flow = google_auth_oauthlib_flow.Flow.from_client_config(
        settings.GOOGLE_OAUTH2_CLIENT_CONFIG,
        scopes=['https://www.googleapis.com/auth/calendar.readonly'])
    flow.redirect_uri = GOOGLE_REDIRECT_URIS
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true')
    request.session['oauth_state'] = state
    return redirect(authorization_url)

def credentials_to_dict(credentials):
    """Converts the Credentials object to a serializable dictionary."""
    return {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }

def google_oauth2callback(request):
    """Google callback after authorization."""
    state = request.session.get('oauth_state')
    flow = google_auth_oauthlib_flow.Flow.from_client_config(
        settings.GOOGLE_OAUTH2_CLIENT_CONFIG,
        scopes=['https://www.googleapis.com/auth/calendar.readonly'],
        state=state)

    flow.redirect_uri = GOOGLE_REDIRECT_URIS

    authorization_response = request.build_absolute_uri()
    flow.fetch_token(authorization_response=authorization_response)

    credentials = flow.credentials
    request.session['google_credentials'] = credentials_to_dict(credentials)

    return redirect('import_google_calendar')

@api_view(['GET', 'POST'])
def import_google_calendar(request):
    """Endpoint to import events from Google Calendar."""
    current_time = timezone.now().isoformat()
    events = []
    creator_user = User.objects.filter().first()
    requested_privacy = 'FRIENDS'
    raw_credentials = request.session.get('google_credentials')
    if not raw_credentials:
        return Response({"error": "No Google credentials found in session"}, status=400)

    # Rebuild Credentials object from stored dict
    if isinstance(raw_credentials, dict):
        google_credentials = Credentials(**raw_credentials)
    else:
        google_credentials = raw_credentials

    try:
        service = build('calendar', 'v3', credentials=google_credentials)

        events_result = service.events().list(calendarId='primary', singleEvents=True, maxResults=2500, timeMin=current_time, orderBy='startTime').execute()
        events = events_result.get('items', [])

        calendar = Calendar.objects.create(
            name="Google Calendar",
            description="Calendar imported from Google Calendar",
            privacy=requested_privacy,
            creator=creator_user,
            origin='GOOGLE',
            external_id=service.calendarList().get(calendarId='primary').execute().get('id'),
        )

        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))

            imported_event = Event.objects.create(
                title=event.get('summary', 'No title'),
                description=event.get('description', ''),
                date=start[:10],
                time=start[11:19] if 'T' in start else '00:00:00',
                external_id=event['id'],
                creator=creator_user,
            )
            imported_event.calendars.add(calendar)

    except Exception as e:
        print(f"Error importing events: {e}")

    return Response({"message": "Events imported successfully", "count": len(events)}, headers={"Access-Control-Allow-Origin": "*"})

@api_view(['POST'])
def iOS_calendar_import(request):
    """Endpoint to import events from iOS Calendar."""

    webcal_url = request.data.get('webcal_url')  # nosemgrep: python.django.security.injection.ssrf.ssrf-injection-requests.ssrf-injection-requests (validated with _is_safe_calendar_url)
    user_id = request.data.get('user')
    requested_privacy = request.data.get('privacy', 'PRIVATE')
    creator_user = User.objects.filter(id=user_id).first()

    if not webcal_url:
        return Response({"error": "webcal_url is required"}, status=400, headers={"Access-Control-Allow-Origin": "*"})

    if webcal_url.startswith("webcal://"):
        http_url = webcal_url.replace("webcal://", "https://", 1)
    else:
        http_url = webcal_url

    is_safe, reason = _is_safe_calendar_url(http_url)
    if not is_safe:
        return Response({"error": f"URL not allowed: {reason}"}, status=400, headers={"Access-Control-Allow-Origin": "*"})

    safe_ip = get_safe_ip(http_url)
    if not safe_ip:
        return Response({"error": "The URL points to a destination not allowed for security reasons"}, status=403, headers={"Access-Control-Allow-Origin": "*"})

    try:
        response = requests.get(http_url, timeout=REQUEST_TIMEOUT_SECONDS, allow_redirects=False)  # nosemgrep: python.django.security.injection.ssrf.ssrf-injection-requests.ssrf-injection-requests
        response.raise_for_status()

        cal = ICalCalendar.from_ical(response.content)
        current_time = timezone.now()
        saved_events = 0

        calendar = Calendar.objects.create(
            name="iOS Calendar",
            description="Calendar imported from iOS Calendar",
            privacy=requested_privacy,
            creator=creator_user,
            origin='APPLE',
            external_id=http_url,
        )

        for component in cal.walk():
            if component.name != "VEVENT":
                continue

            start_dt = component.get('dtstart').dt

            if isinstance(start_dt, datetime.date) and not isinstance(start_dt, datetime.datetime):
                start_dt = datetime.datetime.combine(start_dt, datetime.time.min)

            if start_dt.tzinfo is None:
                start_dt = timezone.make_aware(start_dt)

            if start_dt < current_time:
                continue

            title = str(component.get('summary', 'No title'))
            description = str(component.get('description', ''))
            uid = str(component.get('uid'))

            date_str = start_dt.strftime('%Y-%m-%d')
            time_str = start_dt.strftime('%H:%M:%S')

            event = Event.objects.create(
                title=title,
                description=description,
                date=date_str,
                time=time_str,
                creator=creator_user,
                external_id=uid,
            )
            event.calendars.add(calendar)
            saved_events += 1

        return Response({
            "message": "iOS calendar imported successfully",
            "count": saved_events
        })

    except requests.exceptions.RequestException as e:
        return Response({"error": f"Error downloading calendar: {str(e)}"}, status=400)
    except Exception as e:
        return Response({"error": f"Error processing file: {str(e)}"}, status=400)

@api_view(['POST'])
def ics_import(request):
    """Endpoint to import events from an ICS file uploaded by the user."""
    if 'file' not in request.FILES:
        return Response({"error": "ICS file required"}, status=400, headers={"Access-Control-Allow-Origin": "*"})

    upload = request.FILES['file']

    try:
        cal = ICalCalendar.from_ical(upload.read())
    except Exception as exc:  # malformed ICS
        return Response({"error": f"Invalid ICS file: {exc}"}, status=400, headers={"Access-Control-Allow-Origin": "*"})

    current_time = timezone.now()
    requested_privacy = request.data.get('privacy', 'PRIVATE')
    creator_user = User.objects.filter(id=request.data.get('user')).first()
    if not creator_user:
        return Response({"error": "User not found"}, status=400, headers={"Access-Control-Allow-Origin": "*"})

    calendar = Calendar.objects.create(
        name="ICS Calendar",
        description="Calendar imported from ICS file",
        privacy=requested_privacy,
        creator=creator_user,
        origin='CURRENT',
        external_id=upload.name,
    )
    for component in cal.walk():
        if component.name != "VEVENT":
            continue

        start_dt = component.get('dtstart').dt

        if isinstance(start_dt, datetime.date) and not isinstance(start_dt, datetime.datetime):
            start_dt = datetime.datetime.combine(start_dt, datetime.time.min)

        if start_dt.tzinfo is None:
            start_dt = timezone.make_aware(start_dt)

        if start_dt < current_time:
            continue

        # Extract data
        title = str(component.get('summary', 'No title'))
        description = str(component.get('description', ''))
        uid = str(component.get('uid'))

        date_str = start_dt.strftime('%Y-%m-%d')
        time_str = start_dt.strftime('%H:%M:%S')

        event = Event.objects.create(
            title=title,
            description=description,
            date=date_str,
            time=time_str,
            creator=creator_user,
            external_id=uid,
        )
        event.calendars.add(calendar)

    return Response({"message": "ICS file imported successfully"}, headers={"Access-Control-Allow-Origin": "*"})

@api_view(['GET'])
def export_to_ics(request, calendar_id):
    """Endpoint to export a calendar to ICS format."""
    try:
        calendar = Calendar.objects.get(id=calendar_id)
    except Calendar.DoesNotExist:
        return Response({"error": "Calendar not found"}, status=404, headers={"Access-Control-Allow-Origin": "*"})

    cal = ICalCalendar()
    cal.add('prodid', '-//Current Calendar//')
    cal.add('version', '2.0')

    for event in calendar.events.all():
        ical_event = event.to_ical_event()
        cal.add_component(ical_event)

    ics_content = cal.to_ical()
    response = HttpResponse(ics_content, status=200, content_type='text/calendar; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="calendar_{calendar_id}.ics"'
    response["Access-Control-Allow-Origin"] = "*"
    return response

@api_view(['GET'])
def search_users(request):
    query = request.GET.get("search")

    if not query:
        return Response(
            {"errors": ["The 'search' parameter is required."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    users = User.objects.filter(
        Q(username__icontains=query) |
        Q(email__icontains=query) |
        Q(pronouns__icontains=query)
    ).distinct()

    results = [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "pronouns": user.pronouns,
            "bio": user.bio,
            "photo": request.build_absolute_uri(user.photo.url) if user.photo else None,
            "total_followers": user.total_followers,
            "total_following": user.total_following,
            "total_subscribed_calendars": user.total_subscribed_calendars,
        }
        for user in users
    ]

    return Response(results, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    Endpoint to register a new user.

    POST /api/v1/auth/register/
    Body: {
        "username": "string",
        "email": "string",
        "password": "string",
        "password2": "string"
    }
    """
    serializer = UserRegistrationSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()

        # Return data of the created user
        user_serializer = UserDetailSerializer(user)

        return Response({
            'message': 'User registered successfully',
            'user': user_serializer.data
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_calendar(request):
    data = request.data
    print("DATA:", request.data)
    print("FILES:", request.FILES)

    name = data.get('name')

    if not name:
        return Response(
            {"errors": ["The 'name' field is required."]},
            status=status.HTTP_400_BAD_REQUEST
        )
    creator = request.user

    calendar = Calendar(
        creator=creator,
        name=name,
        description=data.get('description', ''),
        privacy=data.get('privacy', 'PRIVATE'),
        origin=data.get('origin', 'CURRENT'),
        external_id=data.get('external_id'),
        cover=request.FILES.get('cover')
    )

    PRIVATE_CALENDAR_CONSTRAINT = "unique_private_calendar_per_user"

    try:
        calendar.full_clean()
        with transaction.atomic():
            calendar.save()
    except ValidationError as exc:
        # full_clean() / validate_constraints() can raise ValidationError
        # when the conditional UniqueConstraint (privacy=PRIVATE) is violated.
        raw_messages = []
        if hasattr(exc, "message_dict"):
            for field_errors in exc.message_dict.values():
                raw_messages.extend(field_errors)
        if not raw_messages and getattr(exc, "messages", None):
            raw_messages.extend(exc.messages)

        if any(PRIVATE_CALENDAR_CONSTRAINT in str(m) for m in raw_messages):
            return Response(
                {"errors": ["The user already has a private calendar."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"errors": raw_messages or ["Invalid data."]},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except IntegrityError:
        return Response(
            {"errors": ["The user already has a private calendar."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "id": calendar.id,
            "origin": calendar.origin,
            "external_id": calendar.external_id,
            "name": calendar.name,
            "description": calendar.description,
            "privacy": calendar.privacy,
            "creator_id": calendar.creator_id,
            "created_at": calendar.created_at,
            "cover": request.build_absolute_uri(calendar.cover.url) if calendar.cover else None,
        },
        status=status.HTTP_201_CREATED,
    )

@api_view(['GET'])
def list_calendars(request):
    """
    List and search calendars.

    GET /api/v1/calendars/list

    Query parameters:
        q        (str)  -- case-insensitive substring match on calendar name
        privacy  (str)  -- filter by privacy status (PRIVATE | FRIENDS | PUBLIC)
    """
    queryset = Calendar.objects.select_related('creator').all()

    q = request.GET.get('q', '').strip()
    if q:
        queryset = queryset.filter(name__icontains=q)

    privacy = request.GET.get('privacy', '').strip().upper()
    valid_privacy_values = {choice[0] for choice in Calendar.PRIVACY_CHOICES}
    if privacy:
        if privacy not in valid_privacy_values:
            return Response(
                {"errors": [f"Invalid 'privacy' value. Allowed values: {', '.join(sorted(valid_privacy_values))}."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        queryset = queryset.filter(privacy=privacy)

    queryset = queryset.order_by('-created_at')

    results = [
        {
            "id": cal.id,
            "name": cal.name,
            "description": cal.description,
            "privacy": cal.privacy,
            "origin": cal.origin,
            "creator_id": cal.creator_id,
            "creator_username": cal.creator.username,
            "created_at": cal.created_at,
            "cover": request.build_absolute_uri(cal.cover.url) if cal.cover else None,
        }
        for cal in queryset
    ]

    return Response(results, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_my_calendars(request):
    """
    List calendars created by the authenticated user.

    GET /api/v1/calendars/my-calendars

    Query parameters:
        q        (str)  -- case-insensitive substring match on calendar name
        privacy  (str)  -- filter by privacy status (PRIVATE | FRIENDS | PUBLIC)
    """
    queryset = Calendar.objects.select_related('creator').filter(creator=request.user)

    q = request.GET.get('q', '').strip()
    if q:
        queryset = queryset.filter(name__icontains=q)

    privacy = request.GET.get('privacy', '').strip().upper()
    valid_privacy_values = {choice[0] for choice in Calendar.PRIVACY_CHOICES}
    if privacy:
        if privacy not in valid_privacy_values:
            return Response(
                {"errors": [f"Invalid 'privacy' value. Allowed values: {', '.join(sorted(valid_privacy_values))}."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        queryset = queryset.filter(privacy=privacy)

    queryset = queryset.order_by('-created_at')

    results = [
        {
            "id": cal.id,
            "name": cal.name,
            "description": cal.description,
            "privacy": cal.privacy,
            "origin": cal.origin,
            "creator_id": cal.creator_id,
            "creator_username": cal.creator.username,
            "created_at": cal.created_at,
            "cover": request.build_absolute_uri(cal.cover.url) if cal.cover else None,
        }
        for cal in queryset
    ]

    return Response(results, status=status.HTTP_200_OK)

@api_view(['GET'])
def list_events_from_calendar(request):
    """
    List and search events.

    GET /api/v1/events/list

    Query parameters:
        calendarId (int) -- filter by calendar ID
    """
    queryset = Event.objects.all()
    calendar_id = request.GET.get('calendarId')

    if calendar_id:
        queryset = queryset.filter(calendars__id=calendar_id)

    results = [
        {
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "place_name": event.place_name,
            "date": event.date,
            "time": event.time,
            "recurrence": event.recurrence,
            "external_id": event.external_id,
            "calendars": list(event.calendars.values_list("id", flat=True)),
            "created_at": event.created_at,
        }
        for event in queryset
    ]
    return Response(results, status=status.HTTP_200_OK)


@api_view(['GET'])
def list_events(request):
    queryset = Event.objects.all()

    q = request.GET.get('q', '').strip()
    if q:
        queryset = queryset.filter(
            Q(title__icontains=q) | Q(description__icontains=q)
        )

    calendar_id = request.GET.get('calendarId')
    if calendar_id:
        queryset = queryset.filter(calendars__id=calendar_id)

    queryset = queryset.order_by('-created_at')

    serializer = EventSerializer(queryset, many=True, context={'request': request})

    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_event_to_calendar(request):
    event_id = request.data.get('event_id')
    calendar_id = request.data.get('calendar_id')

    if not event_id or not calendar_id:
        return Response(
            {"error": "event_id and calendar_id are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        event = Event.objects.get(pk=event_id)
    except Event.DoesNotExist:
        return Response({"error": "Event not found"}, status=status.HTTP_404_NOT_FOUND)

    try:
        calendar = Calendar.objects.get(pk=calendar_id)
    except Calendar.DoesNotExist:
        return Response({"error": "Calendar not found"}, status=status.HTTP_404_NOT_FOUND)

    if calendar.creator != request.user:
        return Response(
            {"errors": ["You do not have permission to modify this calendar."]},
            status=status.HTTP_403_FORBIDDEN
        )
    if event.creator != request.user:
        return Response(
            {"errors": ["You do not have permission to use this event."]},
            status=status.HTTP_403_FORBIDDEN
        )
    if event.calendars.filter(pk=calendar.pk).exists():
        return Response(
            {"error": "The event is already assigned to this calendar"},
            status=status.HTTP_400_BAD_REQUEST
        )

    event.calendars.add(calendar)
    return Response(
        {"message": f"Event '{event.title}' assigned to calendar '{calendar.name}'"},
        status=status.HTTP_200_OK
    )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def unassign_event_from_calendar(request):
    event_id = request.data.get('event_id')
    calendar_id = request.data.get('calendar_id')

    if not event_id or not calendar_id:
        return Response(
            {"error": "event_id and calendar_id are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        event = Event.objects.get(pk=event_id)
    except Event.DoesNotExist:
        return Response({"error": "Event not found"}, status=status.HTTP_404_NOT_FOUND)

    try:
        calendar = Calendar.objects.get(pk=calendar_id)
    except Calendar.DoesNotExist:
        return Response({"error": "Calendar not found"}, status=status.HTTP_404_NOT_FOUND)

    if calendar.creator != request.user:
        return Response(
            {"error": "You do not have permission to modify this calendar"},
            status=status.HTTP_403_FORBIDDEN
        )
    if event.creator != request.user:
        return Response(
            {"error": "You do not have permission over this event"},
            status=status.HTTP_403_FORBIDDEN
        )

    if not event.calendars.filter(pk=calendar.pk).exists():
        return Response(
            {"error": "The event is not assigned to this calendar"},
            status=status.HTTP_400_BAD_REQUEST
        )

    event.calendars.remove(calendar)
    return Response(
        {"message": f"Event '{event.title}' unassigned from calendar '{calendar.name}'"},
        status=status.HTTP_200_OK
    )

@api_view(['DELETE'])
def delete_event(request, event_id):
    # TODO: Validate that the user has permission to delete the event (e.g. is the creator of the event or calendar)

    if not event_id:
        return Response(
            {"error": "event_id is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        event = Event.objects.get(pk=event_id)
    except Event.DoesNotExist:
        return Response({"error": "Event not found"}, status=status.HTTP_404_NOT_FOUND)

    event.delete()
    return Response(
        {"message": f"Event '{event.title}' deleted"},
        status=status.HTTP_200_OK
    )


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def delete_calendar(request, calendar_id):
    calendar = get_object_or_404(Calendar, id=calendar_id)

    # Only the creator can delete the calendar
    if calendar.creator != request.user:
        return Response({'error': 'You do not have permission to delete this calendar.'}, status=status.HTTP_403_FORBIDDEN)

    calendar.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['PUT', 'PATCH', 'GET'])
@permission_classes([IsAuthenticated])
def edit_calendar(request, calendar_id):
    calendar = get_object_or_404(Calendar, id=calendar_id)

    if calendar.creator != request.user:
        return Response({'error': 'You do not have permission to edit this calendar.'}, status=status.HTTP_403_FORBIDDEN)

    VALID_PRIVACY_VALUES = {'PRIVATE', 'FRIENDS', 'PUBLIC'}
    editable_fields = ['name', 'privacy', 'description']

    for field in editable_fields:
        if field in request.data:
            value = request.data[field]
            if isinstance(value, str) and value.strip() == '':
                return Response(
                    {'error': f"The field '{field}' cannot be an empty string."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if field == 'privacy' and value not in VALID_PRIVACY_VALUES:
                return Response(
                    {'error': f"The privacy value '{value}' is not valid. Allowed values are: {', '.join(sorted(VALID_PRIVACY_VALUES))}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            setattr(calendar, field, value)

    calendar.save()
    return Response({
        'id': calendar.id,
        'name': calendar.name,
        'description': calendar.description,
        'privacy': calendar.privacy,
    }, status=status.HTTP_200_OK)

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = OwnProfileSerializer(request.user, context={"request": request})
        return Response(serializer.data)

    def put(self, request):
        serializer = UserSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=200)
        return Response(serializer.errors, status=400)

    def delete(self, request):
        request.user.delete()
        return Response(
            {"message": "User deleted successfully"},
            status=202
        )

@api_view(['GET', 'PUT'])
def edit_event(request, event_id):
    event = get_object_or_404(Event, id=event_id)

    # Handle GET: Return event data
    if request.method == 'GET':
        return Response(
            {
                "id": event.id,
                "title": event.title,
                "description": event.description,
                "place_name": event.place_name,
                "date": event.date,
                "time": event.time,
                "recurrence": event.recurrence,
                "external_id": event.external_id,
                "calendars": list(event.calendars.values_list("id", flat=True)),
                "created_at": event.created_at,
            },
            status=status.HTTP_200_OK,
        )

    # Handle PUT: Update event
    data = request.data

    # Validate required fields are not empty if provided
    if "title" in data and not data["title"]:
        return Response(
            {"errors": ["The 'title' field cannot be empty."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if "date" in data and not data["date"]:
        return Response(
            {"errors": ["The 'date' field cannot be empty."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if "time" in data and not data["time"]:
        return Response(
            {"errors": ["The 'time' field cannot be empty."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Update scalar fields if present
    editable_fields = [
        "title", "description", "place_name",
        "date", "time", "recurrence", "external_id",
    ]
    for field in editable_fields:
        if field in data:
            setattr(event, field, data[field])

    # Location via lat/lon
    if "latitude" in data or "longitude" in data:
        lat = data.get("latitude")
        lon = data.get("longitude")
        try:
            event.location = Point(float(lon), float(lat))
        except Exception:
            return Response(
                {"errors": ["Invalid latitude or longitude."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # Calendars M2M
    calendars = None
    if "calendars" in data:
        calendar_ids = data["calendars"]
        if not calendar_ids or not isinstance(calendar_ids, list):
            return Response(
                {"errors": ["At least one valid calendar must be specified."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        calendars = Calendar.objects.filter(id__in=calendar_ids)
        if calendars.count() != len(calendar_ids):
            return Response(
                {"errors": ["One or more calendars do not exist."]},
                status=status.HTTP_404_NOT_FOUND,
            )

    try:
        event.full_clean()
        with transaction.atomic():
            event.save()
            if calendars is not None:
                event.calendars.set(calendars)

    except ValidationError as exc:
        raw_messages = []
        if hasattr(exc, "message_dict"):
            for field_errors in exc.message_dict.values():
                raw_messages.extend(field_errors)
        if not raw_messages and getattr(exc, "messages", None):
            raw_messages.extend(exc.messages)

        return Response(
            {"errors": raw_messages or ["Invalid data."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "place_name": event.place_name,
            "date": event.date,
            "time": event.time,
            "recurrence": event.recurrence,
            "external_id": event.external_id,
            "calendars": list(event.calendars.values_list("id", flat=True)),
            "created_at": event.created_at,
        },
        status=status.HTTP_200_OK,
    )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_event(request):

    data = request.data

    title = data.get("title")
    date = data.get("date")
    time = data.get("time")
    calendar_ids = data.get("calendars")
    creator = request.user

    if not title:
        return Response(
            {"errors": ["The 'title' field is required."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not date:
        return Response(
            {"errors": ["The 'date' field is required."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not time:
        return Response(
            {"errors": ["The 'time' field is required."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not calendar_ids or not isinstance(calendar_ids, list):
        return Response(
            {"errors": ["At least one valid calendar must be specified."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    calendars = Calendar.objects.filter(id__in=calendar_ids)

    if calendars.count() != len(calendar_ids):
        return Response(
            {"errors": ["One or more calendars do not exist."]},
            status=status.HTTP_404_NOT_FOUND,
        )
    for calendar in calendars:
        if calendar.creator != creator:
            return Response({"errors": [f"You do not have permission to add events to calendar {calendar.id}."]},
                status=status.HTTP_403_FORBIDDEN
            )

    location = None
    lat = data.get("latitude")
    lon = data.get("longitude")

    if lat and lon:
        try:
            location = Point(float(lon), float(lat))
        except Exception:
            return Response(
                {"errors": ["Invalid latitude or longitude."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

    event = Event(
        title=title,
        description=data.get("description", ""),
        place_name=data.get("place_name", ""),
        date=date,
        time=time,
        recurrence=data.get("recurrence"),
        external_id=data.get("external_id"),
        location=location,
        creator=creator
    )

    try:
        event.full_clean()
        with transaction.atomic():
            event.save()
            event.calendars.set(calendars)

    except ValidationError as exc:
        raw_messages = []
        if hasattr(exc, "message_dict"):
            for field_errors in exc.message_dict.values():
                raw_messages.extend(field_errors)
        if not raw_messages and getattr(exc, "messages", None):
            raw_messages.extend(exc.messages)

        return Response(
            {"errors": raw_messages or ["Invalid data."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "id": event.id,
            "title": event.title,
            "creator": event.creator.id,
            "description": event.description,
            "place_name": event.place_name,
            "date": event.date,
            "time": event.time,
            "recurrence": event.recurrence,
            "external_id": event.external_id,
            "calendars": calendar_ids,
            "created_at": event.created_at,
        },
        status=status.HTTP_201_CREATED,
    )

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def publish_calendar(request, calendar_id):
    calendar = get_object_or_404(Calendar, id=calendar_id)

    if calendar.creator != request.user:
        return Response(
            {"errors": ["You do not have permission to publish this calendar."]},
            status=status.HTTP_403_FORBIDDEN
        )

    if calendar.privacy == 'PUBLIC':
        return Response(
            {"errors": ["The calendar is already public."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    calendar.privacy = 'PUBLIC'
    calendar.save()

    return Response(
        {
            "id": calendar.id,
            "name": calendar.name,
            "description": calendar.description,
            "privacy": calendar.privacy,
            "origin": calendar.origin,
            "creator": calendar.creator.id,
            "created_at": calendar.created_at,
        },
        status=status.HTTP_200_OK,
    )

@api_view(['GET'])
def radar_events(request):
    # /api/radar?lat=..&lon=..&radius=5
    lat = request.GET.get("lat")
    lon = request.GET.get("lon")
    radius = request.GET.get("radius", 5)

    if not lat or not lon:
        return Response(
            {"error": "lat and lon are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        lat = float(lat)
        lon = float(lon)
        radius = float(radius)
    except ValueError:
        return Response(
            {"error": "lat, lon and radius must be numeric"},
            status=status.HTTP_400_BAD_REQUEST
        )

    user_location = Point(lon, lat, srid=4326)

    user = request.user

    if user.is_authenticated:
        friends = user.following.all()

        privacy_filter = Q(calendars__privacy='PUBLIC') | \
                         Q(calendars__privacy='FRIENDS', calendars__creator__in=friends) | \
                         Q(creator=user)
    else:
        privacy_filter = Q(calendars__privacy='PUBLIC')

    events = (
        Event.objects
        .filter(
            privacy_filter,
            location__isnull=False,
            date__gte=timezone.now().date()
        )
        .annotate(distance=Distance("location", user_location))
        .filter(location__distance_lte=(user_location, D(km=radius)))
        .order_by("distance")
        .distinct()
    )

    serializer = EventSerializer(
        events,
        many=True,
        context={'request': request}
    )

    return Response(serializer.data, status=status.HTTP_200_OK)
