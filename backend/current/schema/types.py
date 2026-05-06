import graphene
import logging
from graphene_django import DjangoObjectType
from django.contrib.gis.db.models import PointField
from django.db.models import Q
from graphene_django.converter import convert_django_field
from django.contrib.auth import get_user

from main.models import Event, User, Calendar, Category

logger = logging.getLogger(__name__)


class CoordinatesType(graphene.ObjectType):
    longitude = graphene.Float()
    latitude = graphene.Float()


@convert_django_field.register(PointField)
def convert_point_field_to_coordinates(field, registry=None):
    return graphene.Field(CoordinatesType)


class UserType(DjangoObjectType):
    photo = graphene.String()
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "pronouns",
            "bio",
            "link",
            "photo",
            "plan",
        ]

    def resolve_photo(self, info):
        if not self.photo:
            return None
        try:
            url = self.photo.url
            if url.startswith('http'):
                return url
            return info.context.build_absolute_uri(url)
        except Exception:
            return None

class CategoryType(DjangoObjectType):
    class Meta:
        model = Category
        fields = ["id", "name"]


class CalendarType(DjangoObjectType):
    liked_by_me = graphene.Boolean()
    co_owners = graphene.List(lambda: UserType)
    viewers = graphene.List(lambda: UserType)
    categories = graphene.List(lambda: CategoryType)
    creator_username = graphene.String()
    creator_id = graphene.Int()
    cover = graphene.String()
    events = graphene.List(lambda: EventType)

    class Meta:
        model = Calendar
        fields = [
            "id",
            "origin",
            "name",
            "description",
            "cover",
            "privacy",
            "creator",
            "created_at",
            "likes_count",
        ]

    def resolve_liked_by_me(self, info):
        user = info.context.user
        if not user.is_authenticated:
            return False
        liked_calendar_ids = getattr(info.context, "_liked_calendar_ids", None)
        if liked_calendar_ids is None:
            liked_calendar_ids = set(
                user.calendar_likes.values_list("calendar_id", flat=True)
            )
            info.context._liked_calendar_ids = liked_calendar_ids
        return self.id in liked_calendar_ids

    def resolve_co_owners(self, info):
        return self.co_owners.all()

    def resolve_viewers(self, info):
        return self.viewers.all()

    def resolve_categories(self, info):
        return self.categories.all()

    def resolve_creator_username(self, info):
        return self.creator.username

    def resolve_creator_id(self, info):
        return self.creator_id

    def resolve_cover(self, info):
            if not self.cover:
                return None
            if str(self.cover).startswith('http'):
                return str(self.cover)
            
            request = info.context
            return request.build_absolute_uri(f'/media/{self.cover}')

    def resolve_events(self, info):
        return self.events.all()

class AttendanceType(graphene.ObjectType):
    id = graphene.ID()
    username = graphene.String()
    name = graphene.String()
    responded_at = graphene.String()
    avatar = graphene.String()


class EventType(DjangoObjectType):
    calendar_ids = graphene.List(graphene.Int)
    calendar = graphene.Field(CalendarType)
    attendees = graphene.List(AttendanceType)
    photo = graphene.String()

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "description",
            "place_name",
            "location",
            "date",
            "end_date",
            "time",
            "end_time",
            "photo",
            "recurrence",
            "creator",
            "calendars",
        ]

    def resolve_location(self, info):
        if self.location:
            return CoordinatesType(self.location.x, self.location.y)

    def resolve_calendar_ids(self, info):
        return list(self.calendars.values_list("id", flat=True))

    def resolve_calendar(self, info):
        selected_ids = info.variable_values.get('calendarIds')
        
        if selected_ids:
            return self.calendars.filter(id__in=selected_ids).first()
        return self.calendars.first()

    def resolve_attendees(self, info):
        return [
            AttendanceType(
                id=str(a.id),
                username=a.user.username,
                name=f"{a.user.first_name} {a.user.last_name}".strip() or a.user.username,
                responded_at=str(a.updated_at),
                avatar=(
                    str(a.user.photo) if str(a.user.photo).startswith('http')
                    else info.context.build_absolute_uri(f'/media/{a.user.photo}')
                ) if a.user.photo else None,
            )
            for a in self.attendances.select_related("user").all()
        ]
    
    def resolve_photo(self, info):
        if not self.photo:
            return None
        if str(self.photo).startswith('http'):
            return str(self.photo)
        request = info.context
        return request.build_absolute_uri(f'/media/{self.photo}')

def filter_events(q, week: int | None, month: int | None, year: int | None):
    if week and 1 <= week <= 53:
        q = q.filter(date__week=week)
    if month and 1 <= month <= 12:
        q = q.filter(date__month=month)
    if year:
        q = q.filter(date__year=year)
    return q

class PublicUserProfileType(graphene.ObjectType):
    user = graphene.Field(UserType)
    public_calendars = graphene.List(CalendarType)
    following_calendars = graphene.List(CalendarType)
    total_followers = graphene.Int()
    total_following = graphene.Int()
    is_following = graphene.Boolean()

class Query(graphene.ObjectType):
    all_public_calendars = graphene.List(CalendarType)
    my_calendars = graphene.List(CalendarType)
    followed_calendars = graphene.List(CalendarType)
    dashboard_calendars = graphene.List(CalendarType)
    
    calendar = graphene.Field(CalendarType, id=graphene.Int(required=True))

    events_for_calendars = graphene.List(
        EventType,
        calendar_ids=graphene.List(graphene.Int, required=True),
    )
    events_for_public_calendar = graphene.List(
        EventType,
        calendar_ids=graphene.List(graphene.Int, required=True),
    )

    all_events = graphene.List(
        EventType,
        week=graphene.Int(),
        month=graphene.Int(),
        year=graphene.Int(),
    )

    event_by_id = graphene.Field(EventType, id=graphene.ID(required=True))

    events_of_user = graphene.List(
        EventType,
        id=graphene.ID(required=True),
        week=graphene.Int(),
        month=graphene.Int(),
        year=graphene.Int(),
    )

    holidays = graphene.List(
        EventType,
        week=graphene.Int(),
        month=graphene.Int(),
        year=graphene.Int(),
    )

    user_profile = graphene.Field(
        PublicUserProfileType,
        username=graphene.String(required=True),
    )

    def resolve_calendar(self, info, id):
        user = info.context.user
        q = Q(privacy="PUBLIC")
        if user.is_authenticated:
            q |= Q(creator=user) | Q(co_owners=user) | Q(viewers=user) | Q(subscribers=user)
        
        return Calendar.objects.filter(q, pk=id).distinct().first()

    def resolve_all_public_calendars(self, info):
        return Calendar.objects.filter(privacy="PUBLIC")

    def resolve_my_calendars(self, info):
        user = info.context.user
        if not user.is_authenticated:
            return Calendar.objects.none()
        return Calendar.objects.filter(creator_id=user.pk).order_by("id")

    def resolve_followed_calendars(self, info):
        user = info.context.user
        if not user.is_authenticated:
            return Calendar.objects.none()
        return Calendar.objects.filter(
            Q(creator_id=user.pk) | Q(subscribers__in=[user])
        ).distinct().order_by("-created_at", "-id")

    def resolve_all_events(self, info, week=None, month=None, year=None):
        q = Event.objects.select_related("creator").all()
        return filter_events(q, week, month, year)

    def resolve_event_by_id(self, info, id):
        try:
            return Event.objects.select_related("creator").get(pk=id)
        except Event.DoesNotExist:
            return None

    def resolve_events_of_user(self, info, id, week=None, month=None, year=None):
        q = Event.objects.filter(creator_id=id)
        return filter_events(q, week, month, year)

    def resolve_holidays(self, info, week=None, month=None, year=None):
        try:
            current_user = User.objects.get(username="current")
        except User.DoesNotExist:
            logger.warning("No 'current' user found")
            return Event.objects.none()
        try:
            calendar = Calendar.objects.get(creator=current_user, name="Holidays")
        except Calendar.DoesNotExist:
            logger.warning("Holidays calendar not found")
            return Event.objects.none()
        events = calendar.events.all()
        return filter_events(events, week, month, year)

    def resolve_dashboard_calendars(self, info):
        user = info.context.user
        
        if not user.is_authenticated:
            return Calendar.objects.none()

        following_ids = user.following.values_list('id', flat=True)
        
        return (
            Calendar.objects
            .filter(
                Q(creator=user) |
                Q(co_owners=user) |
                Q(subscribers=user) |
                Q(viewers=user) |
                Q(creator_id__in=following_ids, privacy="PUBLIC")
            )
            .select_related("creator")
            .prefetch_related("co_owners", "viewers", "categories", "events")
            .distinct()
            .order_by("-created_at")
        )

    def resolve_events_for_calendars(self, info, calendar_ids):
        user = info.context.user
        if not user.is_authenticated:
            return Event.objects.none()

        return (
            Event.objects
            .filter(calendars__id__in=calendar_ids)
            .select_related("creator")
            .prefetch_related("calendars")
            .distinct()
        )

    def resolve_events_for_public_calendar(self, info, calendar_ids):
        return (
            Event.objects
            .filter(
                calendars__id__in=calendar_ids,
                calendars__privacy="PUBLIC"
            )
            .select_related("creator")
            .prefetch_related("calendars")
            .distinct()
        )

    def resolve_user_profile(self, info, username):
        try:
            target = User.objects.get(username=username)
        except User.DoesNotExist:
            return None

        current_user = info.context.user

        public_calendars = Calendar.objects.filter(
            creator=target, privacy="PUBLIC"
        ).select_related("creator").prefetch_related("co_owners", "viewers", "categories")

        following_calendars = Calendar.objects.filter(
            subscribers=target
        ).select_related("creator").prefetch_related("co_owners", "viewers", "categories")

        is_following = (
            current_user.is_authenticated and
            target.followers_set.filter(pk=current_user.pk).exists()
        )

        return PublicUserProfileType(
            user=target,
            public_calendars=list(public_calendars),
            following_calendars=list(following_calendars),
            total_followers=target.followers_set.count(),
            total_following=target.following.count(),
            is_following=is_following,
        )
