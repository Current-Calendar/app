from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Q, Sum

from main.models import Calendar, Event, Comment, EventAttendance, EventSave
from main.permissions import CanAccessAnalytics


@api_view(['GET'])
@permission_classes([IsAuthenticated, CanAccessAnalytics])
def analytics_dashboard(request):
    user = request.user

    # Calendarios donde el usuario es creador o co-propietario
    owned_calendars = Calendar.objects.filter(
        Q(creator=user) | Q(co_owners=user)
    ).distinct()

    # Eventos creados por el usuario en esos calendarios
    owned_events = Event.objects.filter(
        creator=user
    ).prefetch_related('attendances', 'saves', 'comments')

    # --- Summary ---
    total_likes_calendars = sum(c.likes_count for c in owned_calendars)
    total_subscribers = sum(c.num_subscribers for c in owned_calendars)

    total_likes_events = owned_events.aggregate(total=Sum('likes_count'))['total'] or 0

    total_comments = Comment.objects.filter(
        Q(calendar__in=owned_calendars) | Q(event__in=owned_events)
    ).count()

    total_attendees = EventAttendance.objects.filter(
        event__in=owned_events,
        status='ASSISTING'
    ).count()

    summary = {
        'total_calendars': owned_calendars.count(),
        'total_events': owned_events.count(),
        'total_likes_calendars': total_likes_calendars,
        'total_likes_events': total_likes_events,
        'total_subscribers': total_subscribers,
        'total_comments': total_comments,
        'total_attendees': total_attendees,
    }

    # --- Por calendario ---
    calendars_data = []
    for calendar in owned_calendars:
        events_in_calendar = calendar.events.filter(creator=user)
        comments_count = Comment.objects.filter(calendar=calendar).count()
        calendars_data.append({
            'id': calendar.id,
            'name': calendar.name,
            'privacy': calendar.privacy,
            'subscribers': calendar.num_subscribers,
            'likes': calendar.likes_count,
            'comments': comments_count,
            'events_count': events_in_calendar.count(),
        })

    # --- Por evento ---
    attendance_by_event = EventAttendance.objects.filter(
        event__in=owned_events
    ).values('event_id', 'status').annotate(count=Count('id'))

    attendance_map = {}
    for row in attendance_by_event:
        eid = row['event_id']
        if eid not in attendance_map:
            attendance_map[eid] = {'ASSISTING': 0, 'NOT_ASSISTING': 0, 'PENDING': 0}
        attendance_map[eid][row['status']] = row['count']

    saves_by_event = EventSave.objects.filter(
        event__in=owned_events
    ).values('event_id').annotate(count=Count('id'))
    saves_map = {row['event_id']: row['count'] for row in saves_by_event}

    comments_by_event = Comment.objects.filter(
        event__in=owned_events
    ).values('event_id').annotate(count=Count('id'))
    event_comments_map = {row['event_id']: row['count'] for row in comments_by_event}

    events_data = []
    for event in owned_events.order_by('-created_at'):
        eid = event.id
        att = attendance_map.get(eid, {'ASSISTING': 0, 'NOT_ASSISTING': 0, 'PENDING': 0})
        calendar_names = list(event.calendars.filter(
            Q(creator=user) | Q(co_owners=user)
        ).values_list('name', flat=True))
        events_data.append({
            'id': eid,
            'title': event.title,
            'date': event.date,
            'calendars': calendar_names,
            'likes': event.likes_count,
            'saves': saves_map.get(eid, 0),
            'comments': event_comments_map.get(eid, 0),
            'attendees': {
                'assisting': att['ASSISTING'],
                'not_assisting': att['NOT_ASSISTING'],
                'pending': att['PENDING'],
            },
        })

    return Response({
        'summary': summary,
        'calendars': calendars_data,
        'events': events_data,
    }, status=status.HTTP_200_OK)
