from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from main.models import Label, Calendar, Event
from main.serializers import LabelSerializer, CalendarSummarySerializer, EventSerializer
import re

def get_or_create_label_from_request(request):
    # Try to get an existing label by id
    label_id = request.data.get('label_id')
    label_name = request.data.get('name')

    if label_id:
        label = get_object_or_404(Label, id=label_id)
        return label, None

    if label_name is not None:
        # Normalize the label name before validating it
        normalized_name = normalize_label_name(label_name)

        # Reject empty names
        if not normalized_name:
            return None, Response(
                {'error': 'Name cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Enforce the maximum length defined in the model
        if len(normalized_name) > 50:
            return None, Response(
                {'error': 'Name cannot exceed 50 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Reuse an existing label ignoring case
        existing_label = Label.objects.filter(name__iexact=normalized_name).first()
        if existing_label:
            return existing_label, None

        # Read optional custom values or use defaults
        color = request.data.get('color', '#9CA3AF')
        icon = request.data.get('icon', 'tag')

        # Validate color format
        if not is_valid_hex_color(color):
            return None, Response(
                {'error': 'Color must be a valid hex value like #22C55E'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate icon length
        if len(icon) > 50:
            return None, Response(
                {'error': 'Icon cannot exceed 50 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create a new custom label if no equivalent label exists
        label = Label.objects.create(
            name=normalized_name,
            color=color,
            icon=icon,
            is_default=False,
        )

        return label, None

    # Reject the request if neither label_id nor name was provided
    return None, Response(
        {'error': 'You must provide label_id or name'},
        status=status.HTTP_400_BAD_REQUEST
    )

def normalize_label_name(label_name):
    # Remove extra spaces and normalize capitalization
    normalized_name = " ".join(label_name.strip().split())
    normalized_name = normalized_name[:1].upper() + normalized_name[1:].lower()
    return normalized_name


def is_valid_hex_color(color):
    # Validate hex color format such as #22C55E
    return bool(re.fullmatch(r'^#[0-9A-Fa-f]{6}$', color))

def delete_label_if_orphan(label):
    # Never delete default labels
    if label.is_default:
        return

    # Check whether the label is still attached to any calendar or event
    has_calendars = label.calendars.exists()
    has_events = label.events.exists()

    # Delete the label if it is no longer used anywhere
    if not has_calendars and not has_events:
        label.delete()

# ── Global Labels Endpoints ──

@api_view(['GET'])
def list_labels(request):
    """GET /api/v1/labels/ - Listar todas las labels."""
    labels = Label.objects.all().order_by('name')
    serializer = LabelSerializer(labels, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
def list_default_labels(request):
    """GET /api/v1/labels/default/ - Listar solo labels predeterminadas."""
    labels = Label.objects.filter(is_default=True).order_by('name')
    serializer = LabelSerializer(labels, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


# ── Calendar Labels Endpoints ──

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_label_to_calendar(request, calendar_id):
    # Load the target calendar
    calendar = get_object_or_404(Calendar, id=calendar_id)

    # Only the calendar creator can assign labels
    if calendar.creator != request.user:
        return Response(
            {'error': 'Only the creator can assign labels'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get an existing label or create a new custom one
    label, error_response = get_or_create_label_from_request(request)
    if error_response:
        return error_response

    # Attach the label to the calendar
    calendar.labels.add(label)

    return Response(
        {
            'status': 'Label added',
            'label_id': label.id,
            'label_name': label.name,
            'is_default': label.is_default,
        },
        status=status.HTTP_200_OK
    )

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_label_from_calendar(request, calendar_id, label_id):
    # Load the target calendar
    calendar = get_object_or_404(Calendar, id=calendar_id)

    # Only the calendar creator can remove labels
    if calendar.creator != request.user:
        return Response(
            {'error': 'Only the creator can remove labels'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Load the label to be removed
    label = get_object_or_404(Label, id=label_id)

    # Remove the label from the calendar
    calendar.labels.remove(label)

    # Delete the label if it is a custom orphan
    delete_label_if_orphan(label)

    return Response(
        {'status': 'Label removed from calendar'},
        status=status.HTTP_200_OK
    )

# ── Event Labels Endpoints ──

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_label_to_event(request, event_id):
    # Load the target event
    event = get_object_or_404(Event, id=event_id)

    # Only the event creator can assign labels
    if event.creator != request.user:
        return Response(
            {'error': 'Only the creator can assign labels'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get an existing label or create a new custom one
    label, error_response = get_or_create_label_from_request(request)
    if error_response:
        return error_response

    # Attach the label to the event
    event.labels.add(label)

    return Response(
        {
            'status': 'Label added',
            'label_id': label.id,
            'label_name': label.name,
            'is_default': label.is_default,
        },
        status=status.HTTP_200_OK
    )

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_label_from_event(request, event_id, label_id):
    # Load the target event
    event = get_object_or_404(Event, id=event_id)

    # Only the event creator can remove labels
    if event.creator != request.user:
        return Response(
            {'error': 'Only the creator can remove labels'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Load the label to be removed
    label = get_object_or_404(Label, id=label_id)

    # Remove the label from the event
    event.labels.remove(label)

    # Delete the label if it is a custom orphan
    delete_label_if_orphan(label)

    return Response(
        {'status': 'Label removed from event'},
        status=status.HTTP_200_OK
    )

# ── Filter by Labels Endpoints ──

@api_view(['GET'])
def filter_events_by_label(request):
    """GET /api/v1/events/filter-by-label/?label=name - Filter events by label name."""

    # Get and normalize the label name from query params
    raw_label_name = request.GET.get('label', '')
    label_name = normalize_label_name(raw_label_name)

    if not label_name:
        return Response(
            {'error': 'label query param is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Filter events by label name
    events = Event.objects.filter(labels__name__iexact=label_name).distinct()

    serializer = EventSerializer(events, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET'])
def filter_calendars_by_label(request):
    """GET /api/v1/calendars/filter-by-label/?label=name - Filter calendars by label name."""

    # Get and normalize the label name from query params
    raw_label_name = request.GET.get('label', '')
    label_name = normalize_label_name(raw_label_name)

    if not label_name:
        return Response(
            {'error': 'label query param is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Filter calendars by label name
    calendars = Calendar.objects.filter(labels__name__iexact=label_name).distinct()

    serializer = CalendarSummarySerializer(calendars, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)