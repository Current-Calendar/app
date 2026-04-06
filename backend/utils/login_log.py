from main.models import LoginLog


def get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        # Si hay proxy, suele venir una lista: cliente, proxy1, proxy2...
        return x_forwarded_for.split(",")[0].strip()

    return request.META.get("REMOTE_ADDR")

def log_user_login(request,user):
    ip_address = get_client_ip(request)

    LoginLog.objects.create(
        user=user,
        ip_address=ip_address or "0.0.0.0",
    )