from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.apps import apps
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from main.models import Event, EventAttendance, EventLike, EventSave
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from utils.login_log import get_client_ip
from main.models import LoginLog
from .models import Calendar, Notification, Report, ChatMessage
from utils.storage import get_signed_url

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for new user registration.
    Includes password validation and secure creation with hashing.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="User password (minimum 8 characters)"
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="Password confirmation"
    )
    email = serializers.EmailField(
        required=True,
        help_text='Unique user email'
    )

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'password2', 'pronouns', 'bio')
        extra_kwargs = {
            'pronouns': {'required': False},
            'bio': {'required': False}
        }

    def validate_email(self, value):
        """Verifies the email is not already registered."""
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value.lower()

    def validate_username(self, value):
        """Verifies the username is not already registered and is valid."""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username already exists.")

        if not value.replace('_', '').replace('-', '').isalnum():
            raise serializers.ValidationError(
                "Username can only contain letters, numbers, hyphens and underscores."
            )

        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")

        if len(value) > 150:
            raise serializers.ValidationError("Username cannot exceed 150 characters.")

        return value

    def validate(self, attrs):
        """
        Object-level validation:
        - Verifies passwords match
        - Validates password with user context (username, email)
        """
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({
                "password": "Passwords do not match."
            })

        # Create a temporary user object to validate the password with context
        # This allows UserAttributeSimilarityValidator to work correctly
        temp_user = User(
            username=attrs.get('username'),
            email=attrs.get('email')
        )

        # Validate the password with Django validators (including similarity check)
        try:
            validate_password(attrs['password'], user=temp_user)
        except ValidationError as e:
            raise serializers.ValidationError({
                "password": list(e.messages)
            })

        return attrs

    def create(self, validated_data):
        """
        Creates a new user using create_user() to hash the password with Argon2.
        """
        # Remove password2 as it is not stored
        validated_data.pop('password2')

        # Use create_user to automatically hash the password
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            pronouns=validated_data.get('pronouns', ''),
            bio=validated_data.get('bio', '')
        )

        return user

class PublicUserSerializer(serializers.ModelSerializer):
    """
    Serializer for displaying public user information.
    Does not include email or password for security.
    """
    is_following = serializers.SerializerMethodField()
    followed = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'pronouns',
            'bio',
            'photo',
            'link',
            'plan',
            'total_followers',
            'total_following',
            'is_following',
            'followed',
        )
        read_only_fields = ('id',)

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.followers_set.filter(id=request.user.id).exists()
        return False

    def get_followed(self, obj):
        return self.get_is_following(obj)

class UserDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for displaying user information (without password).
    """

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'email',
            'pronouns',
            'bio',
            'photo',
            'plan',
            'total_followers',
            'total_following',
            'subscribed_calendars',
            'plan',
        )
        read_only_fields = ('id', 'date_joined')

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model=User
        fields=['photo','email','username','pronouns','link','bio','total_followers','total_following','subscribed_calendars','plan']


class EditProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'photo', 'pronouns', 'link', 'bio']


class CalendarSummarySerializer(serializers.ModelSerializer):
    creator = serializers.CharField(source="creator.username")
    liked_by_me = serializers.SerializerMethodField()

    likes_count = serializers.IntegerField(source='likes.count', read_only=True)
    class Meta:
        model = Calendar
        fields = (
            "id",
            "name",
            "description",
            "cover",
            "privacy",
            "origin",
            "creator",
            "created_at",
            "likes_count",
            "liked_by_me",
            "co_owners",
        )
        read_only_fields = ("id", "created_at")

    def get_liked_by_me(self, obj):
        request = self.context.get('request')
        liked_calendar_ids = self.context.get('liked_calendar_ids')
        if liked_calendar_ids is not None:
            return obj.id in liked_calendar_ids
        if request and request.user.is_authenticated:
            return obj.likes.filter(user_id=request.user.id).exists()
        return False


class OwnProfileSerializer(serializers.ModelSerializer):
    calendars = CalendarSummarySerializer(source="created_calendars", many=True)
    following_calendars = CalendarSummarySerializer(source="subscribed_calendars", many=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "pronouns",
            "bio",
            "link",
            "photo",
            "plan",
            "total_followers",
            "total_following",
            "calendars",
            "following_calendars",
            "co_owned_calendars",
        )
        read_only_fields = (
            "id",
            "username",
            "email",
            "total_followers",
            "total_following",
            "calendars",
            "following_calendars",
            "co_owned_calendars",
        )


class EventSerializer(serializers.ModelSerializer):
    photo = serializers.SerializerMethodField()
    distance_km = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    creator_username = serializers.CharField(source='creator.username', read_only=True)
    creator_photo = serializers.SerializerMethodField()
    calendars = serializers.SerializerMethodField()
    attendees = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()
    saved_by_me = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'place_name',
            'date', 'time', 'recurrence', 'external_id',
            'calendars', 'created_at',
            'distance_km', 'latitude', 'longitude',
            'photo', 'creator_username', 'creator_photo', 'attendees',
            'likes_count', 'liked_by_me', 'saved_by_me',
        ]

    def get_creator_photo(self, obj):
        return get_signed_url(self.context.get('request'), obj.creator.photo)

    def get_photo(self, obj):
        return get_signed_url(self.context.get('request'), obj.photo)

    def get_distance_km(self, obj):
        if hasattr(obj, 'distance') and obj.distance:
            return round(obj.distance.km, 2)
        return None

    def get_latitude(self, obj):
        return obj.location.y if obj.location else None

    def get_longitude(self, obj):
        return obj.location.x if obj.location else None

    def get_calendars(self, obj):
        return list(obj.calendars.values_list('id', flat=True))
    
    def get_attendees(self, obj):
        """Devuelve solo asistentes (status=ASSISTING)."""
        attendances = obj.attendances.filter(status='ASSISTING')
        return EventAttendeeSerializer(
            attendances,
            many=True,
            context=self.context
        ).data

    def get_liked_by_me(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return EventLike.objects.filter(user=request.user, event=obj).exists()

    def get_saved_by_me(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return EventSave.objects.filter(user=request.user, event=obj).exists()

class NotificationSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True, default=None)
    sender_photo = serializers.SerializerMethodField()
    related_calendar_name = serializers.SerializerMethodField()
    related_event_title = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'sender', 'sender_username', 'sender_photo', 'type',
            'message', 'is_read', 'created_at',
            'related_calendar', 'related_calendar_name',
            'related_event', 'related_event_title',
        ]
        read_only_fields = [
            'id', 'recipient', 'sender', 'type', 'message',
            'created_at', 'related_calendar', 'related_event',
        ]

    def get_sender_photo(self, obj):
        if not obj.sender:
            return None
        request = self.context.get('request')
        return get_signed_url(request, obj.sender.photo)

    def get_related_calendar_name(self, obj):
        return obj.related_calendar.name if obj.related_calendar_id else None

    def get_related_event_title(self, obj):
        return obj.related_event.title if obj.related_event_id else None

    def validate(self, attrs):
        if self.instance and len(attrs) > 1:
            for field in attrs.keys():
                if field != 'is_read':
                    raise serializers.ValidationError(f"Modification of the '{field}' field is strictly prohibited.")
        return attrs

    
class ReportSerializer(serializers.ModelSerializer):
    reporter_username = serializers.CharField(source='reporter.username', read_only=True)

    class Meta:
        model = Report
        fields = [
            'id', 'reporter', 'reporter_username', 'reported_type', 
            'reported_calendar', 'reported_event', 'reported_user', 'reason', 
            'status', 'created_at'
        ]
        read_only_fields = ['id', 'reporter', 'status', 'created_at']

    def validate(self, attrs):
        reported_type = attrs.get('reported_type', getattr(self.instance, 'reported_type', None))
        reported_user = attrs.get('reported_user', getattr(self.instance, 'reported_user', None))
        reported_event = attrs.get('reported_event', getattr(self.instance, 'reported_event', None))
        reported_calendar = attrs.get('reported_calendar', getattr(self.instance, 'reported_calendar', None))

        request = self.context.get('request')
        user = request.user if request else None

        if not reported_type:
            raise serializers.ValidationError({"reported_type": "This field is required."})
        
        expected_fields = {
            'USER': 'reported_user',
            'EVENT': 'reported_event',
            'CALENDAR': 'reported_calendar'
        }

        expected_reasons = ['SPAM', 'INAPPROPRIATE_CONTENT', 'HARASSMENT', 'OTHER']
        reason = attrs.get('reason', getattr(self.instance, 'reason', None))
        if reason not in expected_reasons:
            raise serializers.ValidationError({"reason": "Invalid reason for reporting."})

        if reported_type not in expected_fields:
            raise serializers.ValidationError({"reported_type": "Invalid reported type."})
        
        if reported_calendar and reported_calendar.privacy == 'PRIVATE':
            raise serializers.ValidationError({"reported_calendar": "Cannot report a private calendar."})
        
        if reported_event and reported_event.calendars.filter(privacy='PRIVATE').exists():
            raise serializers.ValidationError({"reported_event": "Cannot report an event that belongs to a private calendar."})

        expected_field = expected_fields[reported_type]
        
        if not attrs.get(expected_field):
             raise serializers.ValidationError({expected_field: f"This field is required when reporting a {reported_type.lower()}."})

        for key in expected_fields.values():
            if key != expected_field and attrs.get(key) is not None:
                raise serializers.ValidationError({key: f"Cannot set {key.replace('reported_', '')} when reporting a {reported_type.lower()}."})

        if reported_type == 'USER' and user and reported_user == user:
            raise serializers.ValidationError({"reported_user": "You cannot report yourself."})
        
        return attrs
    
class ChatMessageSerializer(serializers.ModelSerializer):
    
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_photo = serializers.ImageField(source='sender.photo', read_only=True)

    class Meta:
        model = ChatMessage
        
        fields = ['id', 'event', 'sender', 'sender_username', 'sender_photo', 'text', 'timestamp']
        read_only_fields = ['sender', 'event', 'timestamp']
class EventAttendeeSerializer(serializers.ModelSerializer):
    """Serializa asistentes de un evento (solo ASSISTING)."""
    id = serializers.IntegerField(source='user.id')
    name = serializers.CharField(source='user.username')
    avatar = serializers.SerializerMethodField()
    respondedAt = serializers.SerializerMethodField()
    
    class Meta:
        model = EventAttendance
        fields = ['id', 'name', 'avatar', 'respondedAt']
    
    def get_avatar(self, obj):
        return get_signed_url(self.context.get('request'), obj.user.photo)

    def get_respondedAt(self, obj):
        """Devuelve updated_at en ISO 8601 con Z (UTC)."""
        iso_str = obj.updated_at.isoformat()
        if '+00:00' in iso_str:
            iso_str = iso_str.replace('+00:00', 'Z')
        return iso_str
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        request = self.context.get("request")
        LoginLog.objects.create(
            user=self.user,
            ip_address=get_client_ip(request),
        )

        return data
