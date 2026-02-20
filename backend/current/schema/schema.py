import graphene
from .types import Query


schema = graphene.Schema(query=Query)
