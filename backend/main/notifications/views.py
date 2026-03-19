from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from ..models import Notification
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from ..serializers import NotificationSerializer


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

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_as_read(request):
    request.user.notifications.filter(is_read=False).update(is_read=True)
    return Response({"message": "All notifications marked as read"})
