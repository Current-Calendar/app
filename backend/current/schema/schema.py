import graphene
from .types import Query
from .auth import Mutation


schema = graphene.Schema(query=Query, mutation=Mutation)
