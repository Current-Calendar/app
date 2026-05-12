import datetime
import os
import uuid
from django.conf import settings
from icalendar import Event as ICalEvent
from django.contrib.gis.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.db.models import Q
from dateutil.relativedelta import relativedelta
from django.db import transaction

def calendar_cover_path(instance, filename):
    ext = os.path.splitext(filename)[1] or '.jpg'
    return f'calendar_covers/{uuid.uuid4()}{ext}'

class User(AbstractUser):
    PLAN_CHOICES = [
        ('FREE', 'Free'),
        ('STANDARD', 'Standard'),
        ('BUSINESS', 'Business'),
    ]
    email = models.EmailField(unique=True)
    pronouns = models.CharField(max_length=150, blank=True)
    bio = models.TextField(blank=True)
    link = models.URLField(blank=True)
    plan = models.CharField(max_length=20, default='FREE', choices=PLAN_CHOICES)
    photo = models.ImageField(upload_to='profiles/', null=True, blank=True)
    following = models.ManyToManyField('self', symmetrical=False, related_name='followers_set', blank=True)
    subscribed_calendars = models.ManyToManyField('Calendar', related_name='subscribers', blank=True)

    @property
    def total_followers(self):
        return self.followers_set.count()

    @property
    def total_following(self):
        return self.following.count()

    @property
    def total_subscribed_calendars(self):
        return self.subscribed_calendars.count()
    @property
    def unread_count_for_user(self):
        return Notification.objects.filter(recipient=self, is_read=False).count()

    def __str__(self):
        return self.username

class Subscription(models.Model):
    PLAN_FREE = 'FREE'
    PLAN_STANDARD = 'STANDARD'
    PLAN_BUSINESS = 'BUSINESS'

    PLAN_CHOICES = [
        (PLAN_FREE, 'Free'),
        (PLAN_STANDARD, 'Standard'),
        (PLAN_BUSINESS, 'Business'),
    ]

    STATUS_ACTIVE = 'ACTIVE'
    STATUS_CANCELLED = 'CANCELLED'
    STATUS_EXPIRED = 'EXPIRED'

    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_CANCELLED, 'Cancelled'),
        (STATUS_EXPIRED, 'Expired'),
    ]

    BILLING_MONTHLY = 'MONTHLY'
    BILLING_ANNUAL = 'ANNUAL'

    BILLING_CYCLE_CHOICES = [
        (BILLING_MONTHLY, 'Monthly'),
        (BILLING_ANNUAL, 'Annual'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscription'
    )

    current_plan = models.CharField(
        max_length=20,
        choices=PLAN_CHOICES,
        default=PLAN_FREE
    )

    pending_plan = models.CharField(
        max_length=20,
        choices=PLAN_CHOICES,
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE
    )

    billing_cycle = models.CharField(
        max_length=20,
        choices=BILLING_CYCLE_CHOICES,
        null=True,
        blank=True
    )

    current_period_start = models.DateTimeField(
        null=True,
        blank=True
    )

    current_period_end = models.DateTimeField(
        null=True,
        blank=True
    )

    cancel_at_period_end = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def calculate_period_end(self, start_date):
        if self.billing_cycle == self.BILLING_MONTHLY:
            return start_date + relativedelta(months=1)

        if self.billing_cycle == self.BILLING_ANNUAL:
            return start_date + relativedelta(years=1)

        return None

    @transaction.atomic
    def activate_free_plan(self):
        self.current_plan = self.PLAN_FREE
        self.billing_cycle = None
        self.status = self.STATUS_ACTIVE
        self.current_period_start = None
        self.current_period_end = None
        self.pending_plan = None
        self.cancel_at_period_end = False

        self.user.plan = self.PLAN_FREE
        self.user.save(update_fields=['plan'])

        self.save(update_fields=[
            'current_plan',
            'billing_cycle',
            'status',
            'current_period_start',
            'current_period_end',
            'pending_plan',
            'cancel_at_period_end',
            'updated_at',
        ])

    @transaction.atomic
    def activate_paid_plan(self, plan, billing_cycle):
        if plan == self.PLAN_FREE:
            self.activate_free_plan()
            return

        if plan not in [self.PLAN_STANDARD, self.PLAN_BUSINESS]:
            raise ValueError('Invalid paid plan')

        if billing_cycle not in [self.BILLING_MONTHLY, self.BILLING_ANNUAL]:
            raise ValueError('Invalid billing cycle')

        now = timezone.now()

        self.current_plan = plan
        self.billing_cycle = billing_cycle
        self.status = self.STATUS_ACTIVE
        self.current_period_start = now
        self.current_period_end = self.calculate_period_end(now)
        self.pending_plan = None
        self.cancel_at_period_end = False

        self.user.plan = plan
        self.user.save(update_fields=['plan'])

        self.save(update_fields=[
            'current_plan',
            'billing_cycle',
            'status',
            'current_period_start',
            'current_period_end',
            'pending_plan',
            'cancel_at_period_end',
            'updated_at',
        ])

    @transaction.atomic
    def schedule_downgrade_to_free(self):
        if self.current_plan == self.PLAN_FREE:
            self.activate_free_plan()
            return

        self.pending_plan = self.PLAN_FREE
        self.cancel_at_period_end = True

        self.save(update_fields=[
            'pending_plan',
            'cancel_at_period_end',
            'updated_at',
        ])

    @transaction.atomic
    def apply_pending_plan_if_needed(self):
        if (
            self.pending_plan
            and self.cancel_at_period_end
            and self.current_period_end
            and timezone.now() >= self.current_period_end
        ):
            self.current_plan = self.pending_plan
            self.user.plan = self.pending_plan

            self.pending_plan = None
            self.cancel_at_period_end = False
            self.status = self.STATUS_ACTIVE

            if self.current_plan == self.PLAN_FREE:
                self.billing_cycle = None
                self.current_period_start = None
                self.current_period_end = None

            self.user.save(update_fields=['plan'])

            self.save(update_fields=[
                'current_plan',
                'pending_plan',
                'cancel_at_period_end',
                'status',
                'billing_cycle',
                'current_period_start',
                'current_period_end',
                'updated_at',
            ])

    @transaction.atomic
    def ensure_current_period_for_paid_plan(self):
        if self.current_plan == self.PLAN_FREE:
            return

        if self.current_period_end:
            return

        now = timezone.now()

        self.billing_cycle = self.billing_cycle or self.BILLING_MONTHLY
        self.current_period_start = self.current_period_start or now
        self.current_period_end = self.calculate_period_end(self.current_period_start)
        self.status = self.STATUS_ACTIVE

        self.save(update_fields=[
            'billing_cycle',
            'current_period_start',
            'current_period_end',
            'status',
            'updated_at',
        ])

    def __str__(self):
        return f'{self.user.username} - {self.current_plan}'

class Category(models.Model):
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name


class EventTag(models.Model):
    name = models.CharField(max_length=50)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='tags')

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['name', 'category'], name='unique_tag_per_category')
        ]

    def __str__(self):
        return f"{self.name} ({self.category.name})"


class Calendar(models.Model):
    PRIVACY_CHOICES = [
        ('PRIVATE', 'Private'),
        ('PUBLIC', 'Public'),
    ]

    ORIGIN_CHOICES = [
        ('CURRENT', 'Native Current'),
        ('GOOGLE', 'Google Calendar'),
        ('APPLE', 'Apple Calendar'),
    ]

    origin = models.CharField(max_length=20, choices=ORIGIN_CHOICES, default='CURRENT')
    external_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    cover = models.ImageField(upload_to=calendar_cover_path, null=True, blank=True)
    privacy = models.CharField(max_length=10, choices=PRIVACY_CHOICES, default='PRIVATE')
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_calendars')
    created_at = models.DateTimeField(default=timezone.now)
    categories = models.ManyToManyField(Category, related_name='calendars', blank=True)

    class Meta:
        pass
    
    likes_count = models.PositiveIntegerField(default=0)
    co_owners = models.ManyToManyField('User', related_name='co_owned_calendars', blank=True)
    viewers = models.ManyToManyField('User', related_name='viewable_calendars', blank=True)

    @property
    def num_subscribers(self):
        return self.subscribers.count()

    @property
    def num_likes(self):
        return self.likes_count

    def __str__(self):
        return f"{self.name} ({self.get_origin_display()})"


class CalendarLike(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calendar_likes')
    calendar = models.ForeignKey(Calendar, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'calendar'], name='unique_calendar_like_per_user')
        ]

    def __str__(self):
        return f"{self.user_id} -> {self.calendar_id}"

class Event(models.Model):
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    place_name = models.CharField(max_length=255, blank=True)
    location = models.PointField(geography=True, spatial_index=True, null=True, blank=True)
    date = models.DateField()
    time = models.TimeField()
    end_date = models.DateField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    photo = models.ImageField(upload_to='event_photos/', null=True, blank=True)
    recurrence = models.IntegerField(null=True, blank=True)
    external_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    calendars = models.ManyToManyField(Calendar, related_name='events')
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_events')
    created_at = models.DateTimeField(default=timezone.now)
    tags = models.ManyToManyField(EventTag, related_name='events', blank=True)
    likes_count = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.title} - {self.date}"

    def to_ical_event(self):
        """Build an iCalendar VEVENT component for this event."""
        event = ICalEvent()
        event.add('summary', self.title)
        if self.description:
            event.add('description', self.description)
        if self.place_name:
            event.add('location', self.place_name)

        start_dt = datetime.datetime.combine(self.date, self.time)
        if timezone.is_naive(start_dt):
            start_dt = timezone.make_aware(start_dt, timezone.get_current_timezone())
        event.add('dtstart', start_dt)
        event.add('dtend', start_dt + datetime.timedelta(hours=1))

        uid = self.external_id or f"event-{self.pk}@current"
        event.add('uid', uid)
        return event


class EventLike(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='event_likes')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'event'], name='unique_event_like_per_user')
        ]

    def __str__(self):
        return f"{self.user_id} -> {self.event_id}"


class EventSave(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='event_saves')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='saves')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'event'], name='unique_event_save_per_user')
        ]

    def __str__(self):
        return f"{self.user_id} -> {self.event_id}"


class Comment(models.Model):
    TARGET_EVENT = "EVENT"
    TARGET_CALENDAR = "CALENDAR"
    TARGET_TYPE_CHOICES = [
        (TARGET_EVENT, "Event"),
        (TARGET_CALENDAR, "Calendar"),
    ]

    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="comments")
    body = models.TextField(max_length=500)
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="comments",
        null=True,
        blank=True,
    )
    calendar = models.ForeignKey(
        Calendar,
        on_delete=models.CASCADE,
        related_name="comments",
        null=True,
        blank=True,
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="children",
        null=True,
        blank=True,
    )
    root = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        related_name="thread_comments",
        null=True,
        blank=True,
    )
    replies_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    (Q(event__isnull=False) & Q(calendar__isnull=True))
                    | (Q(event__isnull=True) & Q(calendar__isnull=False))
                ),
                name="comment_exactly_one_target",
            ),
            models.CheckConstraint(
                check=~Q(parent=models.F("id")),
                name="comment_parent_not_self",
            ),
            models.CheckConstraint(
                check=~Q(root=models.F("id")) | Q(parent__isnull=True),
                name="comment_root_self_only_for_roots",
            ),
        ]
        indexes = [
            models.Index(fields=["event", "-created_at", "-id"], name="comment_event_feed_idx"),
            models.Index(fields=["calendar", "-created_at", "-id"], name="comment_calendar_feed_idx"),
            models.Index(fields=["root", "created_at", "id"], name="comment_root_thread_idx"),
            models.Index(fields=["parent", "created_at", "id"], name="comment_parent_thread_idx"),
            models.Index(fields=["author", "-created_at", "-id"], name="comment_author_idx"),
        ]

    @property
    def target_type(self):
        return self.TARGET_EVENT if self.event_id else self.TARGET_CALENDAR

    @property
    def target_id(self):
        return self.event_id or self.calendar_id

    def __str__(self):
        return f"Comment {self.pk} by {self.author_id}"
class Notification(models.Model):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    TYPE_CHOICES = [
        ('NEW_FOLLOWER', 'New Follower'),
        ('CALENDAR_FOLLOW', 'Calendar Follow'),
        ('EVENT_SAVED', 'Event Saved'),
        ('EVENT_LIKED', 'Event Liked'),
        ('EVENT_COMMENT', 'Event Comment'),
        ('CALENDAR_COMMENT', 'Calendar Comment'),
        ('EVENT_INVITE', 'Event Invite'),
        ('CALENDAR_INVITE', 'Calendar Invite'),
    ]
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    related_calendar = models.ForeignKey(Calendar, null=True, blank=True, on_delete=models.CASCADE)
    related_event = models.ForeignKey(Event, null=True, blank=True, on_delete=models.CASCADE)
    sender = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='sent_notifications')

    def __str__(self):
        return f"Notification for {self.recipient.username} - {self.type}"
    
class Report(models.Model):
    REPORTED_TYPE_CHOICES = [
        ('USER', 'User'),
        ('EVENT', 'Event'),
        ('CALENDAR', 'Calendar'),
    ]
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('IN_PROGRESS', 'In Progress'),
        ('RESOLVED', 'Resolved'),
    ]
    REASON_CHOICES = [
        ('INAPPROPRIATE_CONTENT', 'Inappropriate Content'),
        ('SPAM', 'Spam'),
        ('HARASSMENT', 'Harassment'),
        ('OTHER', 'Other'),
    ]
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_made')
    reported_type = models.CharField(max_length=20, choices=REPORTED_TYPE_CHOICES)
    reported_calendar = models.ForeignKey(Calendar, null=True, blank=True, on_delete=models.CASCADE, related_name='reports')
    reported_event = models.ForeignKey(Event, null=True, blank=True, on_delete=models.CASCADE, related_name='reports')
    reported_user = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE, related_name='reports')
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report {self.id} by {self.reporter.username} on {self.reported_type} (Status: {self.status})"


class Feedback(models.Model):
    TYPE_CHOICES = [
        ('INCIDENCIA', 'Incidencia'),
        ('BUG', 'Bug'),
        ('MEJORA', 'Mejora'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feedbacks')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Feedback {self.id} by {self.user.username} ({self.type})"


class MockElement(models.Model):
    name = models.CharField(max_length=100)
    geo_point = models.PointField()
    created_at = models.DateTimeField(auto_now_add=True)

class ChatMessage(models.Model):

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='chat_messages')
    
    
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    
    text = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.sender.username} en {self.event.title}: {self.text[:20]}"
    
class EventAttendance(models.Model):
    STATUS_CHOICES = [
        ('ASSISTING', 'Attending'),
        ('NOT_ASSISTING', 'Not Attending'),
        ('PENDING', 'Pending'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='event_attendances')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='attendances')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'event'], name='unique_user_event_attendance')
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.event.title} ({self.status})"

class LoginLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="login_logs",
        verbose_name="Usuario",
    )
    ip_address = models.GenericIPAddressField(verbose_name="Dirección IP")
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha/Hora",
    )

    class Meta:
        verbose_name = "Registro de inicio de sesión"
        verbose_name_plural = "Registros de inicio de sesión"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} - {self.ip_address} - {self.created_at}"


class LegalAcceptance(models.Model):
    DOCUMENT_PRIVACY = "PRIVACY"
    DOCUMENT_COOKIES = "COOKIES"
    DOCUMENT_TERMS = "TERMS"
    DOCUMENT_CHOICES = [
        (DOCUMENT_PRIVACY, "Privacy Policy"),
        (DOCUMENT_COOKIES, "Cookies Policy"),
        (DOCUMENT_TERMS, "Terms and Conditions"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="legal_acceptances",
    )
    document = models.CharField(max_length=20, choices=DOCUMENT_CHOICES)
    version = models.CharField(max_length=32)
    accepted_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "document", "version"],
                name="unique_legal_acceptance_per_version",
            )
        ]
        ordering = ["-accepted_at"]

    def __str__(self):
        return f"{self.user_id} - {self.document} v{self.version}"

class CalendarInvitation(models.Model):
    calendar = models.ForeignKey(Calendar, on_delete=models.CASCADE, related_name='invitations')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_calendar_invitations')
    invitee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_calendar_invitations')
    permission = models.CharField(max_length=20, choices=[('VIEW', 'View'), ('EDIT', 'Edit')], default='VIEW')
    created_at = models.DateTimeField(auto_now_add=True)
    accepted = models.BooleanField(default=None, null=True)

    def __str__(self):
        return f"Invitation to {self.invitee.username} for {self.calendar.name}"