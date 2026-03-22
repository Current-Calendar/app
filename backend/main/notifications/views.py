from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from ..models import Notification, EventAttendance, Calendar
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..serializers import NotificationSerializer
from django.shortcuts import get_object_or_404


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    notifications = request.user.notifications.order_by('-created_at')
    serializer = NotificationSerializer(notifications, many=True)
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
@permission_classes([IsAuthenticated])
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

        EventAttendance.objects.create(
            user=notification.recipient,
            event=notification.related_event,
            status=user_status,
        )

        return Response({"message": "Handled event invitation"})

    # otherwise it's a calendar invitation
    if user_status == "ACCEPT":
        calendar: Calendar = notification.related_calendar
        calendar.subscribers.add(notification.recipient)

    return Response({"message": "Handled calendar invitation"})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_as_read(request):
    request.user.notifications.filter(is_read=False).update(is_read=True)
    return Response({"message": "All notifications marked as read"})
