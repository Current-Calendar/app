import os
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from google_auth_oauthlib import flow as google_auth_oauthlib_flow
from django.conf import settings
from django.shortcuts import redirect
from ..serializers import UserSerializer, UserRegistrationSerializer
import jwt
import resend
from django.core.cache import cache
from datetime import datetime, timedelta
from django.contrib.auth.password_validation import validate_password, ValidationError
from main.models import User, LegalAcceptance
from main.calendars.views import _do_google_calendar_import
from utils.login_log import get_client_ip


GOOGLE_REDIRECT_URIS = settings.GOOGLE_REDIRECT_URIS

LEGAL_VERSIONS = {
    LegalAcceptance.DOCUMENT_PRIVACY: "2026-04-11",
    LegalAcceptance.DOCUMENT_COOKIES: "2026-04-11",
    LegalAcceptance.DOCUMENT_TERMS: "2026-04-12",
}


def _record_legal_acceptance(user, request, accepted_documents=None):
    ip_address = get_client_ip(request)
    user_agent = request.META.get("HTTP_USER_AGENT", "")[:512]

    docs_to_record = accepted_documents or LEGAL_VERSIONS.keys()

    for document in docs_to_record:
        version = LEGAL_VERSIONS.get(document)
        if not version:
            continue
        LegalAcceptance.objects.get_or_create(
            user=user,
            document=document,
            version=version,
            defaults={
                "ip_address": ip_address,
                "user_agent": user_agent,
            },
        )


#if GOOGLE_REDIRECT_URIS and "localhost" in GOOGLE_REDIRECT_URIS:
if GOOGLE_REDIRECT_URIS and "localhost" in GOOGLE_REDIRECT_URIS:
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    Endpoint to register a new user.
    POST /api/v1/auth/register/
    """
    
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        accepted_documents = []
        if request.data.get('accepted_privacy'):
            accepted_documents.append(LegalAcceptance.DOCUMENT_PRIVACY)
        if request.data.get('accepted_terms'):
            accepted_documents.append(LegalAcceptance.DOCUMENT_TERMS)
        if request.data.get('accepted_cookies'):
            accepted_documents.append(LegalAcceptance.DOCUMENT_COOKIES)

        _record_legal_acceptance(user, request, accepted_documents=accepted_documents)
        
        user_serializer = UserSerializer(user)
        
        return Response({
            'message': 'User registered succesfully',
            'user': user_serializer.data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_legal_documents(request):
    required_flags = ['accepted_privacy', 'accepted_terms']
    missing_or_false = [flag for flag in required_flags if not request.data.get(flag)]

    if missing_or_false:
        return Response(
            {
                "error": "All legal documents must be accepted.",
                "missing": missing_or_false,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    accepted_documents = []
    if request.data.get('accepted_privacy'):
        accepted_documents.append(LegalAcceptance.DOCUMENT_PRIVACY)
    if request.data.get('accepted_terms'):
        accepted_documents.append(LegalAcceptance.DOCUMENT_TERMS)
    if request.data.get('accepted_cookies'):
        accepted_documents.append(LegalAcceptance.DOCUMENT_COOKIES)

    _record_legal_acceptance(request.user, request, accepted_documents=accepted_documents)

    return Response(
        {
            "message": "Legal acceptance recorded successfully.",
            "versions": LEGAL_VERSIONS,
        },
        status=status.HTTP_200_OK,
    )


def google_authorization(request):
    """Autorización de Google para obtener acceso a la API de Google Calendar."""
    token = request.GET.get('token')
    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            request.session['importing_user_id'] = payload.get('user_id')
        except jwt.InvalidTokenError:
            pass

    flow = google_auth_oauthlib_flow.Flow.from_client_config(
        settings.GOOGLE_OAUTH2_CLIENT_CONFIG,
        scopes=['https://www.googleapis.com/auth/calendar.readonly'])
    flow.redirect_uri = GOOGLE_REDIRECT_URIS
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='select_account')
    request.session['oauth_state'] = state
    return redirect(authorization_url)


def credentials_to_dict(credentials):
    """Convierte el objeto Credentials a un diccionario serializable."""
    return {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': list(credentials.scopes) if credentials.scopes else [],
    }


def google_oauth2callback(request):
    """Callback de Google después de la autorización."""
    state = request.session.get('oauth_state')
    flow = google_auth_oauthlib_flow.Flow.from_client_config(
        settings.GOOGLE_OAUTH2_CLIENT_CONFIG,
        scopes=['https://www.googleapis.com/auth/calendar.readonly'],
        state=state)
    
    flow.redirect_uri = GOOGLE_REDIRECT_URIS
    
    authorization_response = request.build_absolute_uri()
    flow.fetch_token(authorization_response=authorization_response)

    credentials = flow.credentials
    raw_credentials = credentials_to_dict(credentials)
    request.session['google_credentials'] = raw_credentials

    user_id = request.session.get('importing_user_id')
    if user_id:
        try:
            user = User.objects.get(id=user_id)
            _do_google_calendar_import(user, raw_credentials)
        except Exception as e:
            print(f"Error importando Google Calendar: {e}")

    frontend_url = settings.FRONTEND_URL.rstrip('/')
    return redirect(f"{frontend_url}/calendars")

def send_password_reset_email(user, reset_url):
    """Send password reset email to user"""
    
    hourly_cache_key = "password_reset_hourly_count"
    hourly_attempts = cache.get(hourly_cache_key, 0)
    if hourly_attempts >= 10:
        raise Exception("HOURLY_LIMIT_REACHED")
    
    daily_cache_key = "password_reset_daily_count"
    daily_attempts = cache.get(daily_cache_key, 0)
    if daily_attempts >= 100:
        raise Exception("DAILY_LIMIT_REACHED")
    
    resend.api_key = settings.RESEND_API_KEY
    
    params = {
        "from": settings.RESEND_EMAIL_FROM, 
        "to": [user.email],
        "subject": "Password Reset Request",
        "html": f"""
            <p>Hi {user.username},</p>
            <p>Click the link below to reset your password:</p>
            <a href="{reset_url}">{reset_url}</a>
            <p>This link expires in 1 hour.</p>
            <p>If you didn't request this, ignore this email.</p>
        """
    }
    
    try:
        resend.Emails.send(params)
        cache.set(hourly_cache_key, hourly_attempts + 1, 3600)  # 1 hour = 3600 seconds
        cache.set(daily_cache_key, daily_attempts + 1, 86400)   # 1 day = 86400 seconds
    except Exception as e:
        # Check if it's a Resend API limit error
        error_message = str(e).lower()
        if "rate limit" in error_message or "quota" in error_message or "limit exceeded" in error_message:
            raise Exception("RESEND_LIMIT_REACHED")
        print(f"Error sending email: {e}")
        raise


@api_view(['POST'])
@permission_classes([AllowAny])
def recover_password(request):
    email = request.data.get('email')
    source = request.data.get('source') 
    
    if not email:
        return Response(
            {"error": "Email address is required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        user = User.objects.get(email=email)
        payload = {
            'email': email,
            'exp': datetime.now() + timedelta(hours=1),
            'iat': datetime.now()
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        reset_url = f"{source}/new-password?token={token}"
        
        try:
            send_password_reset_email(user, reset_url)
        except Exception as e:
            error_str = str(e)
            if "HOURLY_LIMIT_REACHED" in error_str or "DAILY_LIMIT_REACHED" in error_str or "RESEND_LIMIT_REACHED" in error_str:
                return Response(
                    {"error": "We're experiencing high volume of password reset requests. Please contact us directly at support@currentcalendar.es for assistance."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            # For other errors, still raise
            raise
        
    except User.DoesNotExist:
        pass # don't reveal user doesn't exist
    
    return Response(
        {"message": "If an account exists with this email, a password reset link has been sent."},
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def set_new_password(request):
    token = request.data.get('token')
    new_password = request.data.get('new_password')
    
    if not token or not new_password:
        return Response(
            {"error": "token and new_password are required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        email = payload.get('email')
        
        if not email:
            return Response(
                {"error": "Invalid token"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = User.objects.get(email=email)
        try:
            validate_password(new_password, user=user)
        except ValidationError:
            return Response(
                {"error": "New password does not meet complexity requirements."},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.set_password(new_password)
        user.save()
        
        return Response(
            {"message": "Password has been reset successfully"},
            status=status.HTTP_200_OK
        )
        
    except jwt.ExpiredSignatureError:
        return Response(
            {"error": "Reset token has expired"},
            status=status.HTTP_400_BAD_REQUEST
        )
    except jwt.InvalidTokenError:
        return Response(
            {"error": "Invalid reset token"},
            status=status.HTTP_400_BAD_REQUEST
        )
    except User.DoesNotExist:
        return Response(
            {"error": "User not found"},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def validate_reset_token(request):
    token = request.query_params.get('token')
    if not token:
        return Response(
            {"error": "token is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        email = payload.get('email')
        
        if not email:
            return Response(
                {"valid": False, "error": "Invalid token"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        User.objects.get(email=email)
        
        return Response(
            {"valid": True, "message": "Token is valid"},
            status=status.HTTP_200_OK
        )
            
    except jwt.ExpiredSignatureError:
        return Response(
            {"valid": False, "error": "Token has expired"},
            status=status.HTTP_400_BAD_REQUEST
        )
    except jwt.InvalidTokenError:
        return Response(
            {"valid": False, "error": "Invalid token"},
            status=status.HTTP_400_BAD_REQUEST
        )
    except User.DoesNotExist:
        return Response(
            {"valid": False, "error": "User not found"},
            status=status.HTTP_400_BAD_REQUEST
        )
