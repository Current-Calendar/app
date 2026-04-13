from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_ads_config(request):
    user = request.user
    show_ads = getattr(user, 'plan', 'FREE') == 'FREE'
    return Response({
        "show_ads": show_ads,
        "frequency": 5,
        "placements": ["feed", "search", "events"]
    })
