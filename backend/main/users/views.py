from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Usuario
from ..serializers import UserSerializer, UsuarioRegistroSerializer, UsuarioSerializer, PublicUserSerializer, OwnProfileSerializer
from rest_framework import status
from django.db.models import Q
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import permission_classes


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    Endpoint to register a new user.
    POST /api/v1/auth/register/
    """
    
    serializer = UsuarioRegistroSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        
        user_serializer = UsuarioSerializer(user)
        
        return Response({
            'message': 'Usuario registered succesfully',
            'usuario': user_serializer.data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def search_users(request):
    """
    Endpoint to register a new user.
    GET /api/v1/users/search/
    """
    query = request.GET.get("search")

    if not query:
        return Response(
            {"errors": ["El parámetro 'search' es obligatorio."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    users = Usuario.objects.filter(
        Q(username__icontains=query) |
        Q(email__icontains=query) |
        Q(pronombres__icontains=query)
    ).distinct()
    
    users = UsuarioSerializer(users, many=True, context={'request': request})

    return Response(users.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def follow_or_unfollow_user(request, pk):
    """
    Endpoint to follow or unfollow another user
    POST /api/v1/usuarios/<pk>/follow/
    """
    
    try:
        user_to_follow = Usuario.objects.get(pk=pk)
    except Usuario.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    
    if user.seguidos.filter(pk=user_to_follow.pk).exists():
        user.seguidos.remove(user_to_follow)
        followed = False
    else:
        user.seguidos.add(user_to_follow)
        followed = True
        
    return Response({
        "user_id": user_to_follow.pk,
        "followed": followed
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_by_id(request, pk):
    """
    Endpoint to obtain the profile of a user by their id.
    GET /api/v1/usuarios/<pk>/
    """
    
    try:
        user = Usuario.objects.get(pk=pk)
    except Usuario.DoesNotExist:
        return Response({"error": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
    
    user_data = PublicUserSerializer(user, context={'request': request}).data
    public_calendars = list(user.calendarios_creados.filter(estado="PUBLICO").values(
            "id", "nombre", "descripcion", "portada", "fecha_creacion"
        ))
    user_data["public_calendars"] = public_calendars
    
    return Response(user_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_own_user(request):
    """
    Endpoint retrieve your own profile
    GET /api/v1/users/me/
    """
    
    serializer = OwnProfileSerializer(request.user, context={"request": request})
    return Response(serializer.data)


@api_view(['PATCH','POST'])
@permission_classes([IsAuthenticated])
def edit_profile(request):
    """
    Endpoint to allow users edit their profile
    PATCH /api/v1/users/me/edit/
    """
    
    serializer = UserSerializer(
        request.user,
        data=request.data,
        partial=True
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    serializer.save()
    
    return Response({
        'message': 'Profile updated correctly',
        'usuario': serializer.data
    }, status=status.HTTP_200_OK)
    
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_own_user(request):
    """
    Endpoint to allow users delete their profile
    POST /api/v1/users/me/delete/
    """
    
    request.user.delete()
    return Response(
        {"message": "User deleted successfully"},
        status=202
    )
