from rest_framework import permissions

class IsCreator(permissions.BasePermission):
    """
    Permiso personalizado de seguridad: 
    Solo el creador original del objeto puede modificarlo o borrarlo.
    """
    def has_object_permission(self, request, view, obj):
        
        if hasattr(obj, 'creador'):
            return obj.creador == request.user
        return False