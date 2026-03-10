import os
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from google_auth_oauthlib import flow as google_auth_oauthlib_flow
from django.conf import settings
from django.shortcuts import redirect
from ..serializers import UsuarioSerializer, UsuarioRegistroSerializer


GOOGLE_REDIRECT_URIS = settings.GOOGLE_REDIRECT_URIS


#if GOOGLE_REDIRECT_URIS and "localhost" in GOOGLE_REDIRECT_URIS:
if "localhost" in GOOGLE_REDIRECT_URIS:
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    Endpoint to register a new user.
    POST /api/v1/auth/register/
    """
    
    serializer = UsuarioRegistroSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        
        user_serializer = UsuarioSerializer(user)
        
        return Response({
            'message': 'Usuario registered succesfully',
            'usuario': user_serializer.data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def google_authorization(request):
    """Autorización de Google para obtener acceso a la API de Google Calendar."""
    flow = google_auth_oauthlib_flow.Flow.from_client_config(
        settings.GOOGLE_OAUTH2_CLIENT_CONFIG,
        scopes=['https://www.googleapis.com/auth/calendar.readonly'])
    flow.redirect_uri = GOOGLE_REDIRECT_URIS
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true')
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
        'scopes': credentials.scopes
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
    request.session['google_credentials'] = credentials_to_dict(credentials)

    return redirect('import_google_calendar')
