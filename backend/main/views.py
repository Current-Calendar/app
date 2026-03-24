from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.cache import cache
from django.contrib.gis.geos import Point
from main.models import MockElement
from .models import Event, ChatMessage
from .serializers import ChatMessageSerializer


@api_view(["GET"])
def hello_world(request):
    cache_key = "sevilla_point_data"
    cached_data = cache.get(cache_key)
    if cached_data:
        return Response({
            "source": "Redis (Cache)",
            "data": cached_data
        }, headers={"Access-Control-Allow-Origin": "*"})

    pnt = Point(-5.9926, 37.3861)
    obj, created = MockElement.objects.get_or_create(
        name="La Giralda Mock",
        defaults={'geo_point': pnt}
    )

    result = {
        "id": obj.id,
        "name": obj.name,
        "coordinates": {
            "longitude": obj.geo_point.x,
            "latitude": obj.geo_point.y
        },
        "created_in_db": created,
        "timestamp": str(obj.created_at)
    }

    cache.set(cache_key, result, 60)

    return Response({
        "source": "PostgreSQL (Database)",
        "data": result
    }, headers={"Access-Control-Allow-Origin": "*"})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def event_chat_history(request, event_id):
    """
    Devuelve el historial de mensajes de un evento específico.
    Solo usuarios logueados pueden pedirlo.
    """
    try:
       
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        return Response({"error": "Evento no encontrado"}, status=404)

    
    messages = ChatMessage.objects.filter(event=event).order_by('timestamp')[:50]
    
   
    serializer = ChatMessageSerializer(messages, many=True)
    
    return Response(serializer.data)