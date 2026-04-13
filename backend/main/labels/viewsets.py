"""
Labels Management Module
Proporciona ViewSets para gestionar categorías y tags de calendarios y eventos.

Arquitectura:
- Category: Categorías predeterminadas a nivel global (creadas por admin)
- EventTag: Tags de eventos asociados a una categoría específica (creados por admin)
- Los usuarios owner/coowner pueden asignar/desasignar categorías a calendarios
- Los usuarios owner/coowner pueden asignar/desasignar tags a eventos
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.shortcuts import get_object_or_404
from django.db.models import Q

from main.models import Category, EventTag, Calendar, Event
from main.serializers import CategorySerializer, EventTagSerializer
from main.permissions import CanAssignCategoryToCalendar, CanManageCategoriesAndTags, CanManageEventTagsForEvent


class CategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar categorías de calendarios.
    
    Endpoints:
    - GET /api/v1/categories/: Lista todas las categorías
    - GET /api/v1/categories/{id}/: Detalle de una categoría
    - POST /api/v1/categories/: Crear nueva categoría (solo admin)
    - PUT /api/v1/categories/{id}/: Actualizar categoría (solo admin)
    - PATCH /api/v1/categories/{id}/: Actualizar parcialmente (solo admin)
    - DELETE /api/v1/categories/{id}/: Eliminar categoría (solo admin)
    - POST /api/v1/categories/{id}/assign_to_calendar/: Asignar a calendario
    - POST /api/v1/categories/{id}/remove_from_calendar/: Desasignar de calendario
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, CanManageCategoriesAndTags]

    def get_permissions(self):
        """
        Permisos dinámicos según la acción:
        - create, destroy, update: Solo admin
        - list, retrieve: Autenticado
        - assign, remove: Owner/coowner del calendario
        """
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            permission_classes = [IsAuthenticated, IsAdminUser]
        elif self.action in ['assign_to_calendar', 'remove_from_calendar']:
            permission_classes = [IsAuthenticated, CanAssignCategoryToCalendar]
        else:
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]

    @action(detail=True, methods=['post'])
    def assign_to_calendar(self, request, pk=None):
        """
        Asigna una categoría a un calendario.
        
        Body:
        {
            "calendar_id": <int>
        }
        
        Solo el owner o coowner del calendario puede hacer esto.
        """
        category = self.get_object()
        calendar_id = request.data.get('calendar_id')

        if not calendar_id:
            return Response(
                {'error': 'calendar_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        calendar = get_object_or_404(Calendar, id=calendar_id)

        # Asigna la categoría si no está ya asignada
        if not calendar.categories.filter(id=category.id).exists():
            calendar.categories.add(category)
            return Response(
                {'message': f'Category "{category.name}" assigned to calendar "{calendar.name}"'},
                status=status.HTTP_200_OK
            )
        
        return Response(
            {'message': 'This category is already assigned to this calendar'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], url_path=r'for-calendar/(?P<calendar_id>[^/.]+)')
    def for_calendar(self, request, calendar_id=None):
        """
        Lista categorías asignadas a un calendario concreto.

        GET /api/v1/categories/for-calendar/{calendar_id}/
        """
        calendar = get_object_or_404(Calendar, id=calendar_id)

        can_access = (
            calendar.privacy == 'PUBLIC'
            or request.user == calendar.creator
            or request.user in calendar.co_owners.all()
            or request.user in calendar.viewers.all()
            or request.user in calendar.subscribers.all()
        )
        if not can_access:
            return Response(
                {'error': 'You do not have permission to access this calendar.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CategorySerializer(calendar.categories.all(), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def remove_from_calendar(self, request, pk=None):
        """
        Desasigna una categoría de un calendario.
        
        Body:
        {
            "calendar_id": <int>
        }
        
        Solo el owner o coowner del calendario puede hacer esto.
        """
        category = self.get_object()
        calendar_id = request.data.get('calendar_id')

        if not calendar_id:
            return Response(
                {'error': 'calendar_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        calendar = get_object_or_404(Calendar, id=calendar_id)

        # Desasigna la categoría si estaba asignada
        if calendar.categories.filter(id=category.id).exists():
            calendar.categories.remove(category)
            return Response(
                {'message': f'Category "{category.name}" removed from calendar "{calendar.name}"'},
                status=status.HTTP_200_OK
            )
        
        return Response(
            {'message': 'This category is not assigned to this calendar'},
            status=status.HTTP_200_OK
        )


class EventTagViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar tags de eventos.
    
    Endpoints:
    - GET /api/v1/event-tags/: Lista todos los tags
    - GET /api/v1/event-tags/{id}/: Detalle de un tag
    - POST /api/v1/event-tags/: Crear nuevo tag (solo admin)
    - PUT /api/v1/event-tags/{id}/: Actualizar tag (solo admin)
    - PATCH /api/v1/event-tags/{id}/: Actualizar parcialmente (solo admin)
    - DELETE /api/v1/event-tags/{id}/: Eliminar tag (solo admin)
    - POST /api/v1/event-tags/{id}/add_to_event/: Añadir tag a evento
    - POST /api/v1/event-tags/{id}/remove_from_event/: Remover tag de evento
    """
    queryset = EventTag.objects.all()
    serializer_class = EventTagSerializer
    permission_classes = [IsAuthenticated, CanManageCategoriesAndTags]

    def get_permissions(self):
        """
        Permisos dinámicos según la acción:
        - create, destroy, update: Solo admin
        - list, retrieve: Autenticado
        - add, remove: Owner/coowner del calendario del evento
        """
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            permission_classes = [IsAuthenticated, IsAdminUser]
        elif self.action in ['add_to_event', 'remove_from_event']:
            permission_classes = [IsAuthenticated, CanManageEventTagsForEvent]
        else:
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]

    @action(detail=True, methods=['post'])
    def add_to_event(self, request, pk=None):
        """
        Añade un tag a un evento.
        
        Body:
        {
            "event_id": <int>
        }
        
        Solo el owner/coowner del calendario que contiene el evento puede hacer esto.
        """
        tag = self.get_object()
        event_id = request.data.get('event_id')

        if not event_id:
            return Response(
                {'error': 'event_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        event = get_object_or_404(Event, id=event_id)

        # Verifica que el tag pertenece a una categoría del calendario
        calendar = event.calendars.first()
        if not calendar.categories.filter(id=tag.category_id).exists():
            return Response(
                {'error': f'The tag "{tag.name}" does not belong to any category assigned to this calendar'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Añade el tag si no está ya asignado
        if not event.tags.filter(id=tag.id).exists():
            event.tags.add(tag)
            return Response(
                {'message': f'Tag "{tag.name}" added to event "{event.title}"'},
                status=status.HTTP_200_OK
            )
        
        return Response(
            {'message': 'This tag is already assigned to this event'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    def remove_from_event(self, request, pk=None):
        """
        Remueve un tag de un evento.
        
        Body:
        {
            "event_id": <int>
        }
        
        Solo el owner/coowner del calendario que contiene el evento puede hacer esto.
        """
        tag = self.get_object()
        event_id = request.data.get('event_id')

        if not event_id:
            return Response(
                {'error': 'event_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        event = get_object_or_404(Event, id=event_id)

        # Remueve el tag si estaba asignado
        if event.tags.filter(id=tag.id).exists():
            event.tags.remove(tag)
            return Response(
                {'message': f'Tag "{tag.name}" removed from event "{event.title}"'},
                status=status.HTTP_200_OK
            )
        
        return Response(
            {'message': 'This tag is not assigned to this event'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], url_path=r'for-calendar/(?P<calendar_id>[^/.]+)')
    def for_calendar(self, request, calendar_id=None):
        """
        Lista tags válidos para un calendario según sus categorías asignadas.

        GET /api/v1/event-tags/for-calendar/{calendar_id}/
        """
        calendar = get_object_or_404(Calendar, id=calendar_id)

        can_access = (
            calendar.privacy == 'PUBLIC'
            or request.user == calendar.creator
            or request.user in calendar.co_owners.all()
            or request.user in calendar.viewers.all()
            or request.user in calendar.subscribers.all()
        )
        if not can_access:
            return Response(
                {'error': 'You do not have permission to access this calendar.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        tags = EventTag.objects.filter(category__in=calendar.categories.all()).distinct()
        serializer = EventTagSerializer(tags, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path=r'for-event/(?P<event_id>[^/.]+)')
    def for_event(self, request, event_id=None):
        """
        Lista tags asignados a un evento concreto.

        GET /api/v1/event-tags/for-event/{event_id}/
        """
        event = get_object_or_404(Event, id=event_id)

        can_access = False
        for calendar in event.calendars.all():
            if (
                calendar.privacy == 'PUBLIC'
                or request.user == calendar.creator
                or request.user in calendar.co_owners.all()
                or request.user in calendar.viewers.all()
                or request.user in calendar.subscribers.all()
            ):
                can_access = True
                break

        if not can_access:
            return Response(
                {'error': 'You do not have permission to access this event.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = EventTagSerializer(event.tags.all(), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# Funciones utilitarias para recomendaciones y búsquedas

def get_user_calendar_categories(user):
    """
    Retorna todas las categorías de los calendarios que posee o coadministra el usuario.
    """
    categories = Category.objects.filter(
        Q(calendars__creator=user) | Q(calendars__co_owners=user)
    ).distinct()
    return categories


def get_user_event_tags(user):
    """
    Retorna todos los tags de eventos en calendarios que posee o coadministra el usuario.
    """
    tags = EventTag.objects.filter(
        Q(events__calendars__creator=user) | Q(events__calendars__co_owners=user)
    ).distinct()
    return tags


def get_calendar_categories_for_user(user):
    """
    Retorna diccionario con categorías disponibles por calendario.
    Útil para la UI de filtrado.
    """
    calendars = Calendar.objects.filter(
        Q(creator=user) | Q(co_owners=user)
    ).distinct()
    
    result = {}
    for calendar in calendars:
        result[calendar.id] = CategorySerializer(
            calendar.categories.all(),
            many=True
        ).data
    
    return result


def get_event_tags_for_user(user):
    """
    Retorna diccionario con tags disponibles por categoría.
    Útil para la UI de filtrado.
    """
    categories = get_user_calendar_categories(user)
    
    result = {}
    for category in categories:
        result[category.id] = EventTagSerializer(
            category.tags.all(),
            many=True
        ).data
    
    return result
