from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from ..models import User
from ..serializers import UserSerializer, PublicUserSerializer, OwnProfileSerializer, EditProfileSerializer
from rest_framework import status
from django.db.models import Q
from rest_framework.permissions import AllowAny, IsAuthenticated
from ..models import Calendar


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

    users = User.objects.filter(
        Q(username__icontains=query) |
        Q(email__icontains=query) |
        Q(pronouns__icontains=query)
    ).distinct()
    
    users = PublicUserSerializer(users, many=True, context={'request': request})

    return Response(users.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def follow_or_unfollow_user(request, pk):
    """
    Endpoint to follow or unfollow another user
    POST /api/v1/users/<pk>/follow/
    """
    
    try:
        user_to_follow = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    
    if user.following.filter(pk=user_to_follow.pk).exists():
        user.following.remove(user_to_follow)
        followed = False
    else:
        user.following.add(user_to_follow)
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
    GET /api/v1/users/<pk>/
    """
    
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"error": "User no encontrado"}, status=status.HTTP_404_NOT_FOUND)
    
    user_data = PublicUserSerializer(user, context={'request': request}).data
    public_calendars = [
        {
            "id": cal.id,
            "name": cal.name,
            "description": cal.description,
            "privacy": cal.privacy,
            "cover": request.build_absolute_uri(cal.cover.url) if cal.cover else None,
            "created_at": cal.created_at,
        }
        for cal in user.created_calendars.filter(privacy="PUBLIC")
    ]
    user_data["public_calendars"] = public_calendars
    
    return Response(user_data)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_by_username(request, username):
    """
    Endpoint to obtain the public profile of a user by their username.
    GET /api/v1/users/by-username/<username>/
    """
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({"error": "User no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    user_data = PublicUserSerializer(user, context={'request': request}).data
    public_calendars = list(user.created_calendars.filter(privacy="PUBLIC").values(
        "id", "name", "description", "cover", "created_at"
    ))
    user_data["public_calendars"] = public_calendars

    return Response(user_data)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_followed_calendars(request, pk):
    """
    Returns the public calendars that a user is subscribed to.
    GET /api/v1/users/<pk>/followed_calendars/
    """
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    calendars = list(
        user.subscribed_calendars.filter(privacy="PUBLIC").values(
            "id", "name", "description", "cover", "created_at"
        )
    )
    return Response(calendars)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_own_user(request):
    """
    Endpoint retrieve your own profile
    GET /api/v1/users/me/
    """
    
    liked_calendar_ids = set(
        request.user.calendar_likes.values_list("calendar_id", flat=True)
    )
    serializer = OwnProfileSerializer(
        request.user,
        context={"request": request, "liked_calendar_ids": liked_calendar_ids},
    )
    return Response(serializer.data)


@api_view(['PATCH','POST','PUT'])
@permission_classes([IsAuthenticated])
def edit_profile(request):
    """
    Endpoint to allow users edit their profile
    PATCH /api/v1/users/me/edit/
    """

    serializer = EditProfileSerializer(
        request.user,
        data=request.data,
        partial=True,
        context={'request': request},
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    serializer.save()

    return Response({
        'message': 'Profile updated correctly',
        'user': serializer.data
    }, status=status.HTTP_200_OK)
    
    
@api_view(['DELETE'])
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
