from celery import shared_task
from django.db import transaction
from django.utils import timezone

from .models import Subscription


@shared_task
def apply_pending_subscription_downgrades():
    subscriptions = Subscription.objects.filter(
        pending_plan=Subscription.PLAN_FREE,
        cancel_at_period_end=True,
        current_period_end__lte=timezone.now(),
    ).select_related("user")

    applied_count = 0

    for subscription in subscriptions.iterator():
        with transaction.atomic():
            subscription = (
                Subscription.objects
                .select_for_update()
                .select_related("user")
                .get(pk=subscription.pk)
            )

            previous_plan = subscription.current_plan
            subscription.apply_pending_plan_if_needed()

            if previous_plan != subscription.current_plan:
                applied_count += 1

    return {
        "applied_downgrades": applied_count
    }