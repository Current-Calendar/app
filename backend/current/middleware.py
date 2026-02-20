from django.utils.deprecation import MiddlewareMixin

class CorsMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        response["Access-Control-Allow-Origin"] = "*"
        response.setdefault("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        response.setdefault("Access-Control-Allow-Headers", "Content-Type, Authorization")
        return response
