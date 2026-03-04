import os
from typing import Optional

from django.conf import settings
from django.http import HttpResponse
from django.utils.deprecation import MiddlewareMixin


LOCAL_NETWORK_PREFIXES = (
    "http://localhost",
    "http://127.0.0.1",
    "http://10.",
    "http://192.168.",
    "http://172."
)


def _extra_origins_from_env():
    raw_origins = os.getenv('ADDITIONAL_CORS_ORIGINS', '')
    return [origin.strip() for origin in raw_origins.split(',') if origin.strip()]

class CorsMiddleware(MiddlewareMixin):
    def process_request(self, request):
        origin = request.headers.get('Origin')

        if request.method == 'OPTIONS' and self._is_allowed_origin(origin):
            response = HttpResponse(status=204)
            self._add_cors_headers(response, origin)
            return response

        return None

    def process_response(self, request, response):
        return self._add_cors_headers(request, response)

        if self._is_allowed_origin(origin):
            self._add_cors_headers(response, origin)

        return response

    def _add_cors_headers(self, response, origin):
        if origin:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Credentials"] = "true"
            response["Vary"] = "Origin"
        else:
            response["Access-Control-Allow-Origin"] = "*"

        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"

    def _is_allowed_origin(self, origin: Optional[str]) -> bool:
        if not origin:
            return False

        allowed_origins = [
            "http://localhost:8081",
            "https://current-web-pre.onrender.com",
            "https://staging.currentcalendar.es",
            *_extra_origins_from_env()
        ]

        return origin in allowed_origins or self._is_local_debug_origin(origin)

    @staticmethod
    def _is_local_debug_origin(origin: str) -> bool:
        if not (settings.DEBUG and origin):
            return False
        return origin.startswith(LOCAL_NETWORK_PREFIXES)
