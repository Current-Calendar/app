from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from main.models import Label, Calendar, Event
from main.serializers import LabelSerializer


# ── Global Labels Endpoints ──

@api_view(['GET'])
def list_labels(request):
    """GET /api/v1/labels/ - Listar todas las labels."""
    labels = Label.objects.all()
    serializer = LabelSerializer(labels, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
def list_default_labels(request):
    """GET /api/v1/labels/default/ - Listar solo labels predeterminadas."""
    labels = Label.objects.filter(is_default=True)
    serializer = LabelSerializer(labels, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


# ── Calendar Labels Endpoints ──

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_label_to_calendar(request, calendar_id):
    """POST /api/v1/calendars/{id}/labels/add/ - Asignar label a calendario."""
    calendar = get_object_or_404(Calendar, id=calendar_id)
    
    # Verificar permisos
    if calendar.creator != request.user:
        return Response(
            {'error': 'Solo el creador puede asignar labels'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    label_id = request.data.get('label_id')
    if not label_id:
        return Response(
            {'error': 'label_id es requerido'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    label = get_object_or_404(Label, id=label_id)
    calendar.labels.add(label)
    
    return Response({'status': 'Label añadida'}, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_label_from_calendar(request, calendar_id, label_id):
    """DELETE /api/v1/calendars/{id}/labels/remove/{label_id}/ - Remover label de calendario."""
    calendar = get_object_or_404(Calendar, id=calendar_id)
    
    # Verificar permisos
    if calendar.creator != request.user:
        return Response(
            {'error': 'Solo el creador puede remover labels'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    label = get_object_or_404(Label, id=label_id)
    calendar.labels.remove(label)
    
    return Response({'status': 'Label removida'}, status=status.HTTP_200_OK)


# ── Event Labels Endpoints ──

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_label_to_event(request, event_id):
    """POST /api/v1/events/{id}/labels/add/ - Asignar label a evento."""
    event = get_object_or_404(Event, id=event_id)
    
    # Verificar permisos
    if event.creator != request.user:
        return Response(
            {'error': 'Solo el creador puede asignar labels'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    label_id = request.data.get('label_id')
    if not label_id:
        return Response(
            {'error': 'label_id es requerido'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    label = get_object_or_404(Label, id=label_id)
    event.labels.add(label)
    
    return Response({'status': 'Label añadida'}, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_label_from_event(request, event_id, label_id):
    """DELETE /api/v1/events/{id}/labels/remove/{label_id}/ - Remover label de evento."""
    event = get_object_or_404(Event, id=event_id)
    
    # Verificar permisos
    if event.creator != request.user:
        return Response(
            {'error': 'Solo el creador puede remover labels'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    label = get_object_or_404(Label, id=label_id)
    event.labels.remove(label)
    
    return Response({'status': 'Label removida'}, status=status.HTTP_200_OK)


# ── Filter by Labels Endpoints ──

@api_view(['GET'])
def filter_events_by_label(request, label_id):
    """GET /api/v1/events/filter-by-label/{label_id}/ - Filtrar eventos por label."""
    label = get_object_or_404(Label, id=label_id)
    events = Event.objects.filter(labels=label)
    
    serializer = LabelSerializer(label)
    from main.serializers import EventSerializer
    events_serializer = EventSerializer(events, many=True, context={'request': request})
    
    return Response({
        'label': serializer.data,
        'events': events_serializer.data,
        'count': events.count()
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def filter_calendars_by_label(request, label_id):
    """GET /api/v1/calendars/filter-by-label/{label_id}/ - Filtrar calendarios por label."""
    label = get_object_or_404(Label, id=label_id)
    calendars = Calendar.objects.filter(labels=label)
    
    serializer = LabelSerializer(label)
    from main.serializers import CalendarSummarySerializer
    calendars_serializer = CalendarSummarySerializer(calendars, many=True, context={'request': request})
    
    return Response({
        'label': serializer.data,
        'calendars': calendars_serializer.data,
        'count': calendars.count()
    }, status=status.HTTP_200_OK)
