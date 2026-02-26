import logging

import graphene
from django.contrib.auth import authenticate, login


logger = logging.getLogger(__name__)


class LoginMutation(graphene.Mutation):
    class Arguments:
        username = graphene.String(required=True)
        password = graphene.String(required=True)

    success = graphene.Boolean(required=True)
    message = graphene.String(required=True)

    @classmethod
    def mutate(cls, root, info, username, password):
        user = authenticate(username=username, password=password)

        if user is None:
            return cls(success=False, message="Credenciales invalidas.")
        
        login(info.context, user)
        
        return cls(success=True, message="Login exitoso.")


class Mutation(graphene.ObjectType):
    login = LoginMutation.Field()


__all__ = ["LoginMutation", "Mutation"]
