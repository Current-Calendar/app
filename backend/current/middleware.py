from django.utils.deprecation import MiddlewareMixin

class CorsMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        origin = request.headers.get('Origin')

        allowed_origins = {
            "http://localhost:8081",
            "http://127.0.0.1:8081",
            "http://localhost:19006",
            "http://127.0.0.1:19006",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        }

        is_localhost_origin = (
            isinstance(origin, str)
            and (
                origin.startswith("http://localhost:")
                or origin.startswith("http://127.0.0.1:")
            )
        )

        if origin in allowed_origins or is_localhost_origin:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Credentials"] = "true"
            response["Vary"] = "Origin"

        response.setdefault(
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        )
        response.setdefault(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization, X-CSRFToken, X-Requested-With",
        )
        return response
