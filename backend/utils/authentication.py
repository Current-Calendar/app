from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    SessionAuthentication without CSRF enforcement.

    DRF's default SessionAuthentication calls enforce_csrf() on every unsafe
    HTTP method (POST, PUT, PATCH, DELETE).  That check fails for API clients
    that legitimately use session cookies but cannot obtain a CSRF token (e.g.
    a cross-origin Expo / React-Native frontend).

    @api_view already marks views csrf_exempt at the Django middleware level, so
    skipping the DRF-level check here does not open any additional CSRF surface.
    Cross-origin abuse is blocked by the CORS policy instead.
    """

    def enforce_csrf(self, request):
        return  # no-op: CSRF enforcement is handled at the CORS layer
