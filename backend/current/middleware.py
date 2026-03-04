from django.http import HttpResponse
from django.utils.deprecation import MiddlewareMixin

class CorsMiddleware(MiddlewareMixin):
    allowed_origins = {
        "http://localhost:8081",
        "https://current-web-pre.onrender.com",
        "https://staging.currentcalendar.es"
    }

    def process_request(self, request):
        # ✅ Responder preflight antes de que GraphQLView devuelva 405
        if request.method == "OPTIONS":
            response = HttpResponse(status=200)
            return self._add_cors_headers(request, response)

    def process_response(self, request, response):
        return self._add_cors_headers(request, response)

    def _add_cors_headers(self, request, response):
        origin = request.headers.get("Origin")

        if origin in self.allowed_origins:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Credentials"] = "true"
            response["Vary"] = "Origin"
        else:
            response["Access-Control-Allow-Origin"] = "*"

        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, X-CSRFToken"
        response["Access-Control-Max-Age"] = "86400"
        
        return response