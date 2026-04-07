from django.db.models import F
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver
from utils.login_log import log_user_login
from main.models import Calendar, CalendarLike, Event, EventLike, EventSave, Notification
from django.contrib.auth.signals import user_logged_in




@receiver(post_save, sender=CalendarLike)
def increment_calendar_likes_count(sender, instance, created, **kwargs):
    if not created:
        return
    Calendar.objects.filter(pk=instance.calendar_id).update(
        likes_count=F("likes_count") + 1
    )


@receiver(post_delete, sender=CalendarLike)
def decrement_calendar_likes_count(sender, instance, **kwargs):
    Calendar.objects.filter(pk=instance.calendar_id, likes_count__gt=0).update(
        likes_count=F("likes_count") - 1
    )


@receiver(post_save, sender=EventLike)
def increment_event_likes_count(sender, instance, created, **kwargs):
    if not created:
        return
    Event.objects.filter(pk=instance.event_id).update(
        likes_count=F("likes_count") + 1
    )


@receiver(post_delete, sender=EventLike)
def decrement_event_likes_count(sender, instance, **kwargs):
    Event.objects.filter(pk=instance.event_id, likes_count__gt=0).update(
        likes_count=F("likes_count") - 1
    )


@receiver(post_save, sender=EventSave)
def notify_event_saved(sender, instance, created, **kwargs):
    if not created:
        return
    if instance.user == instance.event.creator:
        return
    Notification.objects.create(
        recipient=instance.event.creator,
        sender=instance.user,
        type='EVENT_SAVED',
        message=f"{instance.user.username} saved your event '{instance.event.title}'.",
        related_event=instance.event,
    )


@receiver(pre_save, sender=Calendar)
def capture_previous_privacy(sender, instance, update_fields=None, **kwargs):
    if not instance.pk:
        instance._previous_privacy = None
        return

    if update_fields is not None and "privacy" not in update_fields:
        instance._previous_privacy = instance.privacy
        return

    instance._previous_privacy = (
        Calendar.objects.filter(pk=instance.pk).values_list("privacy", flat=True).first()
    )


@receiver(post_save, sender=Calendar)
def cleanup_likes_on_privacy_change(sender, instance, created, **kwargs):
    if created:
        return

    previous_privacy = getattr(instance, "_previous_privacy", None)
    if previous_privacy == instance.privacy:
        return

    likes_qs = CalendarLike.objects.filter(calendar=instance).exclude(user=instance.creator)

    if instance.privacy == "PRIVATE":
        likes_qs.delete()
        return

    if instance.privacy == "FRIENDS":
        likes_qs.exclude(
            user__following=instance.creator,
            user__followers_set=instance.creator,
        ).distinct().delete()



@receiver(user_logged_in)
def log_admin_login(sender, request, user, **kwargs):
    log_user_login(request, user)