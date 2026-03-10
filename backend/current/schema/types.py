import graphene
from graphene_django import DjangoObjectType
from django.contrib.gis.db.models import PointField
from graphene_django.converter import convert_django_field

from main.models import Event, User, Calendar


class CoordinatesType(graphene.ObjectType):
    longitude = graphene.Float()
    latitude = graphene.Float()


@convert_django_field.register(PointField)
def convert_point_field_to_coordinates(field, registry=None):
    return graphene.Field(CoordinatesType)


class UserType(DjangoObjectType):
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
        ]


class EventType(DjangoObjectType):
    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "description",
            "place_name",
            "location",
            "date",
            "time",
            "photo",
            "recurrence",
            "creator",
        ]

    def resolve_location(self, info):
        if self.location:
            return CoordinatesType(self.location.x, self.location.y)


class Query(graphene.ObjectType):
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

    def resolve_all_events(
        self,
        info,
        week: int | None = None,
        month: int | None = None,
        year: int | None = None,
    ):
        q = Event.objects.select_related("creator").all()

        if week and 1 <= week <= 53:
            q = q.filter(date__week=week)
        if month and 1 <= month <= 12:
            q = q.filter(date__month=month)
        if year:
            q = q.filter(date__year=year)

        return q

    def resolve_event_by_id(self, info, id):
        try:
            return Event.objects.select_related("creator").get(pk=id)
        except Event.DoesNotExist:
            return None

    def resolve_events_of_user(
        self,
        info,
        id,
        week: int | None = None,
        month: int | None = None,
        year: int | None = None,
    ):
        q = Event.objects.filter(creator_id=id)

        if week and 1 <= week <= 53:
            q = q.filter(date__week=week)
        if month and 1 <= month <= 12:
            q = q.filter(date__month=month)
        if year:
            q = q.filter(date__year=year)

        return q
