import graphene
from graphene_django import DjangoObjectType
from django.contrib.gis.db.models import PointField
from graphene_django.converter import convert_django_field

from main.models import Evento, Usuario, Calendario


class CoordinatesType(graphene.ObjectType):
    longitude = graphene.Float()
    latitude = graphene.Float()


@convert_django_field.register(PointField)
def convert_point_field_to_coordinates(field, registry=None):
    return graphene.Field(CoordinatesType)


class UserType(DjangoObjectType):
    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "pronombres",
            "biografia",
            "link",
            "foto",
        ]


class EventType(DjangoObjectType):
    class Meta:
        model = Evento
        fields = [
            "id",
            "titulo",
            "descripcion",
            "nombre_lugar",
            "ubicacion",
            "fecha",
            "hora",
            "foto",
            "recurrencia",
            "creador",
        ]

    def resolve_ubicacion(self, info):
        if self.ubicacion:
            return CoordinatesType(self.ubicacion.x, self.ubicacion.y)


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
        q = Evento.objects.select_related("creador").all()

        if week and 1 <= week <= 53:
            q = q.filter(fecha__week=week)
        if month and 1 <= month <= 12:
            q = q.filter(fecha__month=month)
        if year:
            q = q.filter(fecha__year=year)

        return q

    def resolve_event_by_id(self, info, id):
        try:
            return Evento.objects.select_related("creador").get(pk=id)
        except Evento.DoesNotExist:
            return None

    def resolve_events_of_user(
        self,
        info,
        id,
        week: int | None = None,
        month: int | None = None,
        year: int | None = None,
    ):
        q = Evento.objects.filter(creador_id=id)

        if week and 1 <= week <= 53:
            q = q.filter(fecha__week=week)
        if month and 1 <= month <= 12:
            q = q.filter(fecha__month=month)
        if year:
            q = q.filter(fecha__year=year)

        return q
