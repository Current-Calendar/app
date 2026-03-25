import datetime
import os
import uuid

from icalendar import Event as ICalEvent
from django.contrib.gis.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.db.models import Q


def calendar_cover_path(instance, filename):
    ext = os.path.splitext(filename)[1] or '.jpg'
    return f'calendar_covers/{uuid.uuid4()}{ext}'

class User(AbstractUser):
    email = models.EmailField(unique=True)
    pronouns = models.CharField(max_length=150, blank=True)
    bio = models.TextField(blank=True)
    link = models.URLField(blank=True)
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

    def is_friend_with(self, other: "User"):
        return self.following.filter(pk=other.pk).exists() and other.following.filter(pk=self.pk).exists()
    
    @property
    def unread_count_for_user(self):
        return Notification.objects.filter(recipient=self, is_read=False).count()

    def __str__(self):
        return self.username

class CalendarLabel(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name

class Calendar(models.Model):
    PRIVACY_CHOICES = [
        ('PRIVATE', 'Private'),
        ('FRIENDS', 'Friends'),
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
    labels = models.ManyToManyField(CalendarLabel, related_name='calendars', blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['creator'],
                condition=Q(privacy='PRIVATE'),
                name='unique_private_calendar_per_user'
            )
        ]
    likes_count = models.PositiveIntegerField(default=0)
    co_owners = models.ManyToManyField('User', related_name='co_owned_calendars', blank=True)

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
    photo = models.ImageField(upload_to='event_photos/', null=True, blank=True)
    recurrence = models.IntegerField(null=True, blank=True)
    external_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    calendars = models.ManyToManyField(Calendar, related_name='events')
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_events')
    created_at = models.DateTimeField(default=timezone.now)
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
