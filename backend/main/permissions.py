from rest_framework.request import Request
from rest_framework.permissions import BasePermission

from .models import Event


class IsCreator(BasePermission):
    def has_object_permission(self, request: Request, view, obj: Event):
        return obj.creator == request.user
