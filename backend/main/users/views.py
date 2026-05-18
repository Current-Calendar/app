from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from ..models import Notification, User, Subscription
from ..serializers import UserSerializer, PublicUserSerializer, OwnProfileSerializer, EditProfileSerializer
from rest_framework import status
from django.db.models import Q
from rest_framework.permissions import AllowAny, IsAuthenticated
from ..models import Calendar
from utils.storage import get_signed_url
from django.db import transaction
from django.utils import timezone


@api_view(['GET'])
@permission_classes([AllowAny])
def search_users(request):
    """
    Endpoint to search users.
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
        Q(pronouns__icontains=query)
    ).exclude(is_superuser=True).distinct()

    users = PublicUserSerializer(users, many=True, context={'request': request})

    return Response(users.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def follow_or_unfollow_user(request, pk):
    """
    Endpoint to follow or unfollow another user
    POST /api/v1/users/<pk>/follow/
    """
    if request.user.pk == pk:
        return Response({"error": "You cannot follow yourself"}, status=status.HTTP_400_BAD_REQUEST)

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

    if followed:
        Notification.objects.create(
            recipient=user_to_follow,
            sender=user,
            type='NEW_FOLLOWER',
            message=f"{user.username} has started following you."
        )

    return Response({
        "user_id": user_to_follow.pk,
        "followed": followed
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_followers(request, pk):
    """
    Returns the list of users who follow the user with the given pk.
    GET /api/v1/users/<pk>/followers/
    """
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    followers = user.followers_set.all()
    context = {'request': request}
    if request.user.is_authenticated:
        req_user: User = request.user  # type: ignore
        context['following_ids'] = set(req_user.following.values_list('id', flat=True))
    serializer = PublicUserSerializer(followers, many=True, context=context)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_following(request, pk):
    """
    Returns the list of users that the user with the given pk is following.
    GET /api/v1/users/<pk>/following/
    """
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    following = user.following.all()
    context = {'request': request}
    if request.user.is_authenticated:
        req_user: User = request.user  # type: ignore
        context['following_ids'] = set(req_user.following.values_list('id', flat=True))
    serializer = PublicUserSerializer(following, many=True, context=context)
    return Response(serializer.data, status=status.HTTP_200_OK)


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
            "cover": get_signed_url(request, cal.cover),
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

    public_calendars = [
        {
            "id": cal.id,
            "name": cal.name,
            "description": cal.description,
            "cover": get_signed_url(request, cal.cover),
            "created_at": cal.created_at
        }
        for cal in user.created_calendars.filter(privacy="PUBLIC")
    ]
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

    calendars_queryset = user.subscribed_calendars.filter(privacy="PUBLIC")
    calendars = [
        {
            "id": cal.id,
            "name": cal.name,
            "description": cal.description,
            "cover": get_signed_url(request, cal.cover),
            "created_at": cal.created_at
        }
        for cal in calendars_queryset
    ]
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
    
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_plan(request):
    """
    Endpoint to update the authenticated user's subscription plan.

    POST /api/v1/users/me/plan/

    Body for paid plans:
    {
        "plan": "STANDARD" | "BUSINESS",
        "billing_cycle": "MONTHLY" | "ANNUAL"
    }

    Body for free plan:
    {
        "plan": "FREE"
    }
    """

    VALID_PLANS = (
        Subscription.PLAN_FREE,
        Subscription.PLAN_STANDARD,
        Subscription.PLAN_BUSINESS,
    )

    VALID_BILLING_CYCLES = (
        Subscription.BILLING_MONTHLY,
        Subscription.BILLING_ANNUAL,
    )

    plan = request.data.get('plan')
    billing_cycle = request.data.get('billing_cycle', Subscription.BILLING_MONTHLY)

    if plan not in VALID_PLANS:
        return Response(
            {"error": f"Invalid plan. Must be one of: {', '.join(VALID_PLANS)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if plan != Subscription.PLAN_FREE and billing_cycle not in VALID_BILLING_CYCLES:
        return Response(
            {"error": f"Invalid billing_cycle. Must be one of: {', '.join(VALID_BILLING_CYCLES)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        subscription, _ = Subscription.objects.select_for_update().get_or_create(
            user=request.user,
            defaults={
                "current_plan": request.user.plan,
                "billing_cycle": (
                    Subscription.BILLING_MONTHLY
                    if request.user.plan != Subscription.PLAN_FREE
                    else None
                ),
                "current_period_start": (
                    timezone.now()
                    if request.user.plan != Subscription.PLAN_FREE
                    else None
                ),
                "status": Subscription.STATUS_ACTIVE,
            }
        )

        if subscription.current_plan != Subscription.PLAN_FREE and not subscription.current_period_end:
            subscription.ensure_current_period_for_paid_plan()

        subscription.apply_pending_plan_if_needed()

        if plan == Subscription.PLAN_FREE:
            if subscription.current_plan != Subscription.PLAN_FREE:
                if not subscription.current_period_end:
                    return Response(
                        {
                            "error": "Current paid subscription does not have an end date.",
                            "detail": "The downgrade to Free cannot be scheduled because current_period_end is missing.",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                subscription.schedule_downgrade_to_free()

                return Response(
                    {
                        "message": "The Free Plan will be applied at the end of the current billing period.",
                        "plan": subscription.current_plan,
                        "current_plan": subscription.current_plan,
                        "pending_plan": subscription.pending_plan,
                        "billing_cycle": subscription.billing_cycle,
                        "current_period_start": subscription.current_period_start,
                        "current_period_end": subscription.current_period_end,
                        "cancel_at_period_end": subscription.cancel_at_period_end,
                    },
                    status=status.HTTP_200_OK,
                )

            subscription.activate_free_plan()

            return Response(
                {
                    "message": "Free Plan activated.",
                    "plan": subscription.current_plan,
                    "current_plan": subscription.current_plan,
                    "pending_plan": subscription.pending_plan,
                    "billing_cycle": subscription.billing_cycle,
                    "current_period_start": subscription.current_period_start,
                    "current_period_end": subscription.current_period_end,
                    "cancel_at_period_end": subscription.cancel_at_period_end,
                },
                status=status.HTTP_200_OK,
            )

        subscription.activate_paid_plan(plan, billing_cycle)

        return Response(
            {
                "message": "Paid plan activated.",
                "plan": subscription.current_plan,
                "current_plan": subscription.current_plan,
                "pending_plan": subscription.pending_plan,
                "billing_cycle": subscription.billing_cycle,
                "current_period_start": subscription.current_period_start,
                "current_period_end": subscription.current_period_end,
                "cancel_at_period_end": subscription.cancel_at_period_end,
            },
            status=status.HTTP_200_OK,
        )

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
