import datetime

from icalendar import Event as ICalEvent
from django.contrib.gis.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models import Q
from django.utils import timezone

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

    def __str__(self):
        return self.username

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
    cover = models.FileField(upload_to='calendar_covers/', null=True, blank=True)
    privacy = models.CharField(max_length=10, choices=PRIVACY_CHOICES, default='PRIVATE')
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_calendars')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['creator'],
                condition=Q(privacy='PRIVATE'),
                name='unique_private_calendar_per_user'
            )
        ]

    @property
    def num_subscribers(self):
        return self.subscribers.count()

    def __str__(self):
        return f"{self.name} ({self.get_origin_display()})"

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

class MockElement(models.Model):
    name = models.CharField(max_length=100)
    geo_point = models.PointField()
    created_at = models.DateTimeField(auto_now_add=True)
