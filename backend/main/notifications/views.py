from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from ..models import Notification, EventAttendance, Calendar, CalendarInvitation
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..serializers import NotificationSerializer
from django.shortcuts import get_object_or_404
from ..permissions import CanAcceptCalendarInvites
import math
from ..entitlements import get_user_features


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    notifications = request.user.notifications.select_related('sender', 'related_calendar', 'related_event').order_by('-created_at')
    serializer = NotificationSerializer(notifications, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_notification_as_read(request, id):
    try:
        notification = request.user.notifications.get(pk=id)
    except Notification.DoesNotExist:
        return Response({"error": "Notification not found"}, status=status.HTTP_404_NOT_FOUND)

    notification.is_read = True
    notification.save()

    return Response({"message": "Notification marked as read"})

@api_view(["POST"])
@permission_classes([IsAuthenticated, CanAcceptCalendarInvites])
def handle_invite(request: Request, id: int) -> Response:
    notification: Notification = get_object_or_404(request.user.notifications, pk=id)

    if notification.type not in ("EVENT_INVITE", "CALENDAR_INVITE"):
        return Response(
            {"error": f"Cannot accept notification if type {notification.type}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    user_status = request.data.get("status", "ACCEPT")
    if user_status not in ("ACCEPT", "DECLINE"):
        return Response(
            {"error": f"Invalid status {user_status}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if notification.type == "EVENT_INVITE":
        user_status = "ASSISTING" if user_status == "ACCEPT" else "NOT_ASSISTING"

        defaults = {
            "status": user_status,
        }
        EventAttendance.objects.update_or_create(
            user=notification.recipient,
            event=notification.related_event,
            defaults=defaults,
            create_defaults=defaults,
        )

        notification.delete()

        return Response({"message": "Handled event invitation"})

    calendar = notification.related_calendar
    invitation = CalendarInvitation.objects.filter(
        calendar=calendar,
        invitee=notification.recipient,
        sender=notification.sender,
        accepted=None
    ).order_by('-created_at').first()

    if not invitation:
        return Response(
            {"error": "Invitation not found or already handled."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if user_status == "ACCEPT":
        if invitation.permission == "EDIT":
            calendar.co_owners.add(notification.recipient)

        elif invitation.permission == "VIEW":
            user_features = get_user_features(notification.recipient)
            favorite_limit = user_features['max_favorite_calendars']

            if favorite_limit != math.inf and notification.recipient.subscribed_calendars.count() >= favorite_limit:
                return Response(
                    {
                        "error": "You cannot accept this invitation because you have already reached the maximum number of favorite calendars allowed by your plan."
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            calendar.viewers.add(notification.recipient)
            notification.recipient.subscribed_calendars.add(calendar)

        invitation.accepted = True
        invitation.save()

    else:
        invitation.accepted = False
        invitation.save()

    notification.delete()

    return Response({"message": "Handled calendar invitation"})

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_as_read(request):
    request.user.notifications.filter(is_read=False).update(is_read=True)
    return Response({"message": "All notifications marked as read"})
