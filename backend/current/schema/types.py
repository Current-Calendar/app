import graphene
from graphene_django import DjangoObjectType
from main.models import MockElement
from django.contrib.gis.db.models import PointField
from graphene_django.converter import convert_django_field

class CoordinatesType(graphene.ObjectType):
    longitude = graphene.Float()
    latitude = graphene.Float()

@convert_django_field.register(PointField)
def convert_point_field_to_coordinates(field, registry=None):
    return graphene.Field(CoordinatesType)

class MockElementType(DjangoObjectType):
    punto_geografico = graphene.Field(CoordinatesType)
    
    class Meta:
        model = MockElement
        fields = ['id', 'nombre', 'punto_geografico', 'created_at']
    
    def resolve_punto_geografico(self, info):
        """Convierte el Point de PostGIS a coordenadas"""
        if self.punto_geografico:
            return CoordinatesType(
                longitude=self.punto_geografico.x,
                latitude=self.punto_geografico.y
            )
        return None

class Query(graphene.ObjectType):
    all_mock_elements = graphene.List(MockElementType)
    mock_element = graphene.Field(MockElementType, id=graphene.Int(required=True))
    mock_elements_by_name = graphene.List(MockElementType, nombre=graphene.String())
    
    def resolve_all_mock_elements(self, info):
        return MockElement.objects.all()
    
    def resolve_mock_element(self, info, id):
        try:
            return MockElement.objects.get(pk=id)
        except MockElement.DoesNotExist:
            return None
    
    def resolve_mock_elements_by_name(self, info, nombre=None):
        if nombre:
            return MockElement.objects.filter(nombre__icontains=nombre)
        return MockElement.objects.all()
