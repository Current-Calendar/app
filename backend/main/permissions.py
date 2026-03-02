from rest_framework.request import Request
from rest_framework.permissions import BasePermission

from .models import Evento


class IsCreator(BasePermission):
    def has_object_permission(self, request: Request, view, obj: Evento):
        return obj.creador == request.user
