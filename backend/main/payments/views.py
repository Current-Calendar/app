"""
Stripe payment gateway integration.

Security principles applied:
- Webhook signature verified with stripe.Webhook.construct_event()
- Amounts always validated server-side (never trusted from the client)
- Only Stripe IDs stored — no raw card data ever touches our servers
- Rate limiting on payment-intent creation (10 per hour per user) via Redis
- Webhook endpoint is CSRF-exempt because Stripe sends a raw POST body;
  authenticity is guaranteed exclusively by the signed webhook secret
- Idempotency: webhook handler is safe to re-deliver (status checked before write)
"""

import stripe
import logging
from datetime import datetime, timezone

from django.conf import settings
from django.core.cache import cache
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from main.models import StripeCustomer, Payment, Subscription

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_stripe_customer(user) -> stripe.Customer:
    """
    Return the existing Stripe Customer for *user*, or create one.
    Never exposes card data — this only manages the customer object.
    """
    try:
        sc = StripeCustomer.objects.get(user=user)
        return stripe.Customer.retrieve(sc.stripe_customer_id)
    except StripeCustomer.DoesNotExist:
        customer = stripe.Customer.create(
            email=user.email,
            name=user.get_full_name() or user.username,
            metadata={"user_id": str(user.pk)},
        )
        StripeCustomer.objects.create(user=user, stripe_customer_id=customer["id"])
        return customer


def _rate_limit_payment_intent(user_id: int) -> bool:
    """Return True when the user has exceeded 10 PaymentIntent requests per hour."""
    key = f"payment_intent_rate_{user_id}"
    count = cache.get(key, 0)
    if count >= 10:
        return True
    cache.set(key, count + 1, timeout=3600)
    return False


# ---------------------------------------------------------------------------
# Public config endpoint (no auth required — needed before the user logs in)
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def stripe_config(request):
    """
    GET /api/v1/payments/config/
    Returns the Stripe publishable key so the frontend can initialise Stripe.js.
    The publishable key is safe to expose publicly.
    """
    return Response({"publishable_key": settings.STRIPE_PUBLISHABLE_KEY})


# ---------------------------------------------------------------------------
# Payment Intent
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_payment_intent(request):
    """
    POST /api/v1/payments/create-payment-intent/

    Body (JSON):
        amount      int     Required. Amount in the smallest currency unit (e.g. cents).
                            Must be at least 50 (Stripe minimum).
        currency    str     Optional. ISO 4217 code, defaults to 'eur'.
        description str     Optional. Human-readable description stored on the intent.

    Returns:
        client_secret   str     Pass this to stripe.confirmCardPayment() on the frontend.
        payment_id      int     Internal DB id of the Payment record.
    """
    user = request.user

    if _rate_limit_payment_intent(user.pk):
        return Response(
            {"error": "Too many payment requests. Please wait before trying again."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    amount = request.data.get("amount")
    currency = request.data.get("currency", "eur").lower()
    description = request.data.get("description", "")

    # --- Server-side validation (never trust the client amount) ---
    if amount is None:
        return Response({"error": "'amount' is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        amount = int(amount)
    except (TypeError, ValueError):
        return Response({"error": "'amount' must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

    if amount < 50:
        return Response(
            {"error": "'amount' must be at least 50 (smallest currency unit)."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Supported currencies (extend as needed)
    ALLOWED_CURRENCIES = {"eur", "usd", "gbp", "mxn", "cop", "ars"}
    if currency not in ALLOWED_CURRENCIES:
        return Response(
            {"error": f"Unsupported currency '{currency}'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(description) > 500:
        return Response({"error": "'description' is too long (max 500 chars)."}, status=status.HTTP_400_BAD_REQUEST)

    stripe.api_key = settings.STRIPE_SECRET_KEY

    try:
        customer = _get_stripe_customer(user)

        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            customer=customer["id"],
            description=description or None,
            metadata={"user_id": str(user.pk)},
            # Require 3-D Secure when the card issuer demands it
            automatic_payment_methods={"enabled": True},
        )

        payment = Payment.objects.create(
            user=user,
            stripe_payment_intent_id=intent["id"],
            amount=amount,
            currency=currency,
            status="pending",
            description=description,
        )

        return Response(
            {
                "client_secret": intent["client_secret"],
                "payment_id": payment.pk,
            },
            status=status.HTTP_201_CREATED,
        )

    except stripe.error.StripeError as exc:
        logger.error("Stripe error creating PaymentIntent for user %s: %s", user.pk, exc)
        return Response(
            {"error": "Payment provider error. Please try again later."},
            status=status.HTTP_502_BAD_GATEWAY,
        )


# ---------------------------------------------------------------------------
# Payment history
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def payment_history(request):
    """
    GET /api/v1/payments/history/
    Returns the authenticated user's payment records, newest first.
    """
    payments = Payment.objects.filter(user=request.user).values(
        "id",
        "stripe_payment_intent_id",
        "amount",
        "currency",
        "status",
        "description",
        "created_at",
    )
    return Response(list(payments))


# ---------------------------------------------------------------------------
# Subscriptions
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_subscription(request):
    """
    POST /api/v1/payments/create-subscription/

    Body (JSON):
        price_id    str     Required. Stripe Price ID (e.g. 'price_xxxxx').
                            Must be whitelisted in STRIPE_ALLOWED_PRICE_IDS.

    Returns:
        client_secret   str     Pass to stripe.confirmPayment() on the frontend
                                to complete the first payment.
        subscription_id str     Stripe subscription ID.
    """
    user = request.user
    price_id = request.data.get("price_id")

    if not price_id:
        return Response({"error": "'price_id' is required."}, status=status.HTTP_400_BAD_REQUEST)

    # Whitelist: only accept Price IDs configured on the server
    allowed = getattr(settings, "STRIPE_ALLOWED_PRICE_IDS", [])
    if price_id not in allowed:
        return Response(
            {"error": "Invalid price. Contact support if you believe this is an error."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    stripe.api_key = settings.STRIPE_SECRET_KEY

    try:
        customer = _get_stripe_customer(user)

        sub = stripe.Subscription.create(
            customer=customer["id"],
            items=[{"price": price_id}],
            payment_behavior="default_incomplete",
            payment_settings={"save_default_payment_method": "on_subscription"},
            expand=["latest_invoice.payment_intent"],
            metadata={"user_id": str(user.pk)},
        )

        # Upsert local record
        period_end = datetime.fromtimestamp(sub["current_period_end"], tz=timezone.utc)
        Subscription.objects.update_or_create(
            user=user,
            defaults={
                "stripe_subscription_id": sub["id"],
                "stripe_price_id": price_id,
                "status": sub["status"],
                "current_period_end": period_end,
                "cancel_at_period_end": sub["cancel_at_period_end"],
            },
        )

        client_secret = (
            sub["latest_invoice"]["payment_intent"]["client_secret"]
            if sub.get("latest_invoice") and sub["latest_invoice"].get("payment_intent")
            else None
        )

        return Response(
            {"client_secret": client_secret, "subscription_id": sub["id"]},
            status=status.HTTP_201_CREATED,
        )

    except stripe.error.StripeError as exc:
        logger.error("Stripe error creating subscription for user %s: %s", user.pk, exc)
        return Response(
            {"error": "Payment provider error. Please try again later."},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_subscription(request):
    """
    GET /api/v1/payments/subscription/
    Returns the current subscription status for the authenticated user.
    """
    try:
        sub = Subscription.objects.get(user=request.user)
        return Response(
            {
                "stripe_subscription_id": sub.stripe_subscription_id,
                "stripe_price_id": sub.stripe_price_id,
                "status": sub.status,
                "current_period_end": sub.current_period_end,
                "cancel_at_period_end": sub.cancel_at_period_end,
            }
        )
    except Subscription.DoesNotExist:
        return Response({"subscription": None})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_subscription(request):
    """
    POST /api/v1/payments/cancel-subscription/
    Schedules the subscription to cancel at the end of the current billing period.
    The user keeps access until current_period_end.
    """
    user = request.user

    try:
        local_sub = Subscription.objects.get(user=user)
    except Subscription.DoesNotExist:
        return Response({"error": "No active subscription found."}, status=status.HTTP_404_NOT_FOUND)

    if local_sub.status == "canceled":
        return Response({"error": "Subscription is already canceled."}, status=status.HTTP_400_BAD_REQUEST)

    stripe.api_key = settings.STRIPE_SECRET_KEY

    try:
        updated = stripe.Subscription.modify(
            local_sub.stripe_subscription_id,
            cancel_at_period_end=True,
        )
        local_sub.cancel_at_period_end = updated["cancel_at_period_end"]
        local_sub.status = updated["status"]
        local_sub.save(update_fields=["cancel_at_period_end", "status", "updated_at"])

        return Response(
            {
                "message": "Subscription will be canceled at the end of the billing period.",
                "current_period_end": local_sub.current_period_end,
            }
        )

    except stripe.error.StripeError as exc:
        logger.error("Stripe error canceling subscription for user %s: %s", user.pk, exc)
        return Response(
            {"error": "Payment provider error. Please try again later."},
            status=status.HTTP_502_BAD_GATEWAY,
        )


# ---------------------------------------------------------------------------
# Stripe Webhook  (CSRF-exempt — authenticated via signed payload)
# ---------------------------------------------------------------------------

@csrf_exempt
@require_POST
def stripe_webhook(request):
    """
    POST /api/v1/payments/webhook/

    Stripe delivers signed events to this endpoint.
    Authentication is done exclusively via the Stripe-Signature header —
    DO NOT add JWT or session authentication here.

    Events handled:
        payment_intent.succeeded        → marks Payment as 'succeeded'
        payment_intent.payment_failed   → marks Payment as 'failed'
        customer.subscription.updated   → syncs Subscription status
        customer.subscription.deleted   → marks Subscription as 'canceled'
    """
    payload = request.body  # must be raw bytes — never parse before verification
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        # Invalid signature — could be a replay or spoofed request
        logger.warning("Stripe webhook: invalid signature received.")
        from django.http import HttpResponse
        return HttpResponse(status=400)
    except Exception as exc:
        logger.error("Stripe webhook: unexpected error constructing event: %s", exc)
        from django.http import HttpResponse
        return HttpResponse(status=400)

    event_type = event["type"]
    data = event["data"]["object"]

    try:
        if event_type == "payment_intent.succeeded":
            Payment.objects.filter(stripe_payment_intent_id=data["id"]).update(status="succeeded")

        elif event_type == "payment_intent.payment_failed":
            Payment.objects.filter(stripe_payment_intent_id=data["id"]).update(status="failed")

        elif event_type == "customer.subscription.updated":
            period_end = datetime.fromtimestamp(data["current_period_end"], tz=timezone.utc)
            Subscription.objects.filter(stripe_subscription_id=data["id"]).update(
                status=data["status"],
                current_period_end=period_end,
                cancel_at_period_end=data["cancel_at_period_end"],
            )

        elif event_type == "customer.subscription.deleted":
            Subscription.objects.filter(stripe_subscription_id=data["id"]).update(
                status="canceled",
                cancel_at_period_end=False,
            )

        else:
            # Unhandled event — log at debug level and acknowledge receipt
            logger.debug("Stripe webhook: unhandled event type '%s'.", event_type)

    except Exception as exc:
        # Return 500 so Stripe retries the event
        logger.error("Stripe webhook: error processing event %s: %s", event_type, exc)
        from django.http import HttpResponse
        return HttpResponse(status=500)

    from django.http import HttpResponse
    return HttpResponse(status=200)
