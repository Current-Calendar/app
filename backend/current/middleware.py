from django.utils.deprecation import MiddlewareMixin

class CorsMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        origin = request.headers.get('Origin')

        allowed_origins = [
            "http://localhost:8081"
        ]

        if origin in allowed_origins:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Credentials"] = "true"

        else:
            response["Access-Control-Allow-Origin"] = "*"
        
        response.setdefault("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        response.setdefault("Access-Control-Allow-Headers", "Content-Type, Authorization")
        return response
