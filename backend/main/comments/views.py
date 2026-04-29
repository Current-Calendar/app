from datetime import datetime

from django.db import transaction
from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from ..models import Calendar, Comment, Event, Notification

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 50
SORT_NEW = "new"
SORT_OLD = "old"


def _normalize_target_type(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().upper()
    if normalized not in (Comment.TARGET_EVENT, Comment.TARGET_CALENDAR):
        return None
    return normalized


def can_view_calendar(calendar: Calendar, user) -> bool:
    if calendar.privacy == "PUBLIC":
        return True
    if not user or not user.is_authenticated:
        return False
    if calendar.creator_id == user.id:
        return True
    if calendar.co_owners.filter(id=user.id).exists():
        return True
    return False


def can_view_event(event: Event, user) -> bool:
    if user and user.is_authenticated and event.creator_id == user.id:
        return True

    calendars = event.calendars.select_related("creator")
    if calendars.filter(privacy="PUBLIC").exists():
        return True

    if not user or not user.is_authenticated:
        return False

    if calendars.filter(privacy="PRIVATE", creator_id=user.id).exists():
        return True

    return False


def can_delete_comment(comment: Comment, user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if comment.author_id == user.id:
        return True
    if comment.event_id and comment.event and comment.event.creator_id == user.id:
        return True
    if comment.calendar_id and comment.calendar and comment.calendar.creator_id == user.id:
        return True
    if comment.calendar_id and comment.calendar and comment.calendar.co_owners.filter(id=user.id).exists():
        return True
    return False


def _resolve_target(target_type: str, target_id: int):
    if target_type == Comment.TARGET_EVENT:
        return get_object_or_404(Event.objects.prefetch_related("calendars"), pk=target_id), None
    return None, get_object_or_404(Calendar, pk=target_id)


def _parse_pagination(request):
    raw_limit = request.GET.get("limit")
    limit = DEFAULT_PAGE_SIZE
    if raw_limit:
        try:
            limit = max(1, min(int(raw_limit), MAX_PAGE_SIZE))
        except ValueError:
            limit = DEFAULT_PAGE_SIZE
    cursor = request.GET.get("cursor")
    return limit, cursor


def _decode_cursor(cursor: str | None):
    if not cursor:
        return None, None
    try:
        raw_ts, raw_id = cursor.rsplit("_", 1)
        return datetime.fromisoformat(raw_ts), int(raw_id)
    except (TypeError, ValueError):
        return None, None


def _build_cursor(comment: Comment) -> str:
    return f"{comment.created_at.isoformat()}_{comment.id}"


def _apply_keyset(queryset, sort: str, cursor: str | None):
    cursor_ts, cursor_id = _decode_cursor(cursor)
    if not cursor_ts or not cursor_id:
        return queryset

    if sort == SORT_OLD:
        return queryset.filter(
            Q(created_at__gt=cursor_ts) | (Q(created_at=cursor_ts) & Q(id__gt=cursor_id))
        )

    return queryset.filter(
        Q(created_at__lt=cursor_ts) | (Q(created_at=cursor_ts) & Q(id__lt=cursor_id))
    )


class ParentPreviewSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    author_username = serializers.CharField()
    body = serializers.CharField(allow_null=True)


class CommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)
    parent_preview = serializers.SerializerMethodField()
    author_avatar = serializers.SerializerMethodField()
    target_type = serializers.SerializerMethodField()
    target_id = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id",
            "target_type",
            "target_id",
            "author",
            "author_username",
            "author_avatar",
            "body",
            "parent",
            "root",
            "replies_count",
            "created_at",
            "updated_at",
            "parent_preview",
        ]

    def get_author_avatar(self, obj):
        request = self.context.get("request")
        if obj.author.photo:
            if request:
                return request.build_absolute_uri(obj.author.photo.url)
            return obj.author.photo.url
        return None

    def get_parent_preview(self, obj):
        if not obj.parent:
            return None
        return ParentPreviewSerializer(
            {
                "id": obj.parent.id,
                "author_username": obj.parent.author.username,
                "body": obj.parent.body[:220],
            }
        ).data

    @staticmethod
    def get_target_type(obj):
        return obj.target_type

    @staticmethod
    def get_target_id(obj):
        return obj.target_id


def get_comments(request):
    target_type = _normalize_target_type(request.GET.get("target_type"))
    target_id = request.GET.get("target_id")
    sort = request.GET.get("sort", SORT_NEW).strip().lower()

    if target_type is None:
        return Response({"errors": ["target_type inválido. Usa EVENT o CALENDAR."]}, status=status.HTTP_400_BAD_REQUEST)

    try:
        target_id = int(target_id)
    except (TypeError, ValueError):
        return Response({"errors": ["target_id inválido."]}, status=status.HTTP_400_BAD_REQUEST)

    event, calendar = _resolve_target(target_type, target_id)
    if event and not can_view_event(event, request.user):
        return Response({"errors": ["No tienes acceso a este event."]}, status=status.HTTP_403_FORBIDDEN)
    if calendar and not can_view_calendar(calendar, request.user):
        return Response({"errors": ["No tienes acceso a este calendar."]}, status=status.HTTP_403_FORBIDDEN)

    comments = Comment.objects.select_related("author").filter(parent__isnull=True, root_id=F("id"))
    if event:
        comments = comments.filter(event=event)
    else:
        comments = comments.filter(calendar=calendar)

    if sort == SORT_OLD:
        comments = comments.order_by("created_at", "id")
    else:
        sort = SORT_NEW
        comments = comments.order_by("-created_at", "-id")

    limit, cursor = _parse_pagination(request)
    comments = _apply_keyset(comments, sort, cursor)
    rows = list(comments[: limit + 1])
    has_more = len(rows) > limit
    rows = rows[:limit]
    next_cursor = _build_cursor(rows[-1]) if has_more and rows else None

    return Response(
    {
        "results": CommentSerializer(
            rows,
            many=True,
            context={"request": request}
        ).data,
        "next_cursor": next_cursor,
        "has_more": has_more,
    },
    status=status.HTTP_200_OK,
)


def create_comment(request):
    target_type = _normalize_target_type(request.data.get("target_type"))
    target_id = request.data.get("target_id")
    parent_id = request.data.get("parent_id")
    body = str(request.data.get("body", "")).strip()

    if target_type is None:
        return Response({"errors": ["target_type inválido. Usa EVENT o CALENDAR."]}, status=status.HTTP_400_BAD_REQUEST)
    if not body:
        return Response({"errors": ["El campo 'body' es obligatorio."]}, status=status.HTTP_400_BAD_REQUEST)

    try:
        target_id = int(target_id)
    except (TypeError, ValueError):
        return Response({"errors": ["target_id inválido."]}, status=status.HTTP_400_BAD_REQUEST)

    event, calendar = _resolve_target(target_type, target_id)
    if event and not can_view_event(event, request.user):
        return Response({"errors": ["No tienes permiso para comentar este event."]}, status=status.HTTP_403_FORBIDDEN)
    if calendar and not can_view_calendar(calendar, request.user):
        return Response({"errors": ["No tienes permiso para comentar este calendar."]}, status=status.HTTP_403_FORBIDDEN)

    parent = None
    if parent_id is not None:
        parent = get_object_or_404(Comment.objects.select_related("event", "calendar", "root"), pk=parent_id)
        if parent.event_id != (event.id if event else None) or parent.calendar_id != (calendar.id if calendar else None):
            return Response({"errors": ["El parent_id no pertenece al mismo target."]}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        comment = Comment.objects.create(
            author=request.user,
            body=body,
            event=event,
            calendar=calendar,
            parent=parent,
            root=parent.root if parent else None,
        )
        if parent is None:
            comment.root = comment
            comment.save(update_fields=["root", "updated_at"])
        else:
            Comment.objects.filter(id=parent.root_id).update(replies_count=F("replies_count") + 1)

    recipients = set()
    notif_type = 'CALENDAR_COMMENT'
    related_calendar = calendar
    related_event = event

    if calendar:
        recipients.add(calendar.creator)
        recipients.update(calendar.co_owners.all())
    elif event:
        recipients.add(event.creator)
        notif_type = 'EVENT_COMMENT'

    if parent:
        recipients.add(parent.author)

    for recipient in recipients:
        if recipient and recipient.id != request.user.id:
            try:
                Notification.objects.create(
                    recipient=recipient,
                    sender=request.user,
                    type=notif_type,
                    message=f"{request.user.username} commented: {comment.body}",
                    related_calendar=related_calendar,
                    related_event=related_event,
                )
            except Exception:
                pass

    comment = Comment.objects.select_related("author", "parent__author").get(pk=comment.id)
    return Response(
    CommentSerializer(comment, context={"request": request}).data,
    status=status.HTTP_201_CREATED
)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def comments_collection(request):
    if request.method == "GET":
        return get_comments(request)
    if not request.user.is_authenticated:
        return Response(status=status.HTTP_401_UNAUTHORIZED)
    return create_comment(request)


@api_view(["GET"])
@permission_classes([AllowAny])
def list_replies(request, comment_id):
    root = get_object_or_404(
        Comment.objects.select_related("event", "calendar", "author").prefetch_related("event__calendars"),
        pk=comment_id,
    )

    if root.parent_id is not None:
        return Response({"errors": ["El comentario indicado no es raíz."]}, status=status.HTTP_400_BAD_REQUEST)

    if root.event and not can_view_event(root.event, request.user):
        return Response({"errors": ["No tienes acceso a este event."]}, status=status.HTTP_403_FORBIDDEN)
    if root.calendar and not can_view_calendar(root.calendar, request.user):
        return Response({"errors": ["No tienes acceso a este calendar."]}, status=status.HTTP_403_FORBIDDEN)

    sort = request.GET.get("sort", SORT_OLD).strip().lower()
    replies = Comment.objects.select_related("author", "parent").filter(root_id=root.id).exclude(id=root.id)
    if sort == SORT_NEW:
        replies = replies.order_by("-created_at", "-id")
    else:
        sort = SORT_OLD
        replies = replies.order_by("created_at", "id")

    limit, cursor = _parse_pagination(request)
    replies = _apply_keyset(replies, sort, cursor)
    rows = list(replies[: limit + 1])
    has_more = len(rows) > limit
    rows = rows[:limit]
    next_cursor = _build_cursor(rows[-1]) if has_more and rows else None

    return Response(
    {
        "results": CommentSerializer(
            rows,
            many=True,
            context={"request": request}
        ).data,
        "next_cursor": next_cursor,
        "has_more": has_more,
    },
    status=status.HTTP_200_OK,
)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_comment(request, comment_id):
    comment = get_object_or_404(
        Comment.objects.select_related("event", "calendar", "author"),
        pk=comment_id,
    )

    if not can_delete_comment(comment, request.user):
        return Response({"errors": ["No tienes permiso para borrar este comentario."]}, status=status.HTTP_403_FORBIDDEN)

    root_id = comment.root_id
    is_root = comment.parent_id is None

    with transaction.atomic():
        comment.delete()
        if (not is_root) and root_id:
            remaining_replies = (
                Comment.objects.filter(root_id=root_id)
                .exclude(id=root_id)
                .count()
            )
            Comment.objects.filter(id=root_id).update(replies_count=remaining_replies)

    return Response(status=status.HTTP_204_NO_CONTENT)
