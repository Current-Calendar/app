import socket
import ipaddress
from urllib.parse import urlparse

def get_safe_ip(url):
    """
    Resuelve la URL y verifica que la IP no sea privada, 
    de loopback o de enlace local (SSRF protection).
    """
    hostname = urlparse(url).hostname
    if not hostname:
        return None

    try:

        ip_address = socket.gethostbyname(hostname)
        ip_obj = ipaddress.ip_address(ip_address)

        
        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local:
            return None
            
        return ip_address
    except (socket.gaierror, ValueError):
        return None
    

def mask_email(email):
    if not email or '@' not in email:
        return None
    local, domain = email.split('@')
    return f"{local[0]}***@{domain}"

def sanitize_user_for_list(user):
    return {
        'id': user.id,
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name
    }
    
def sanitize_user_for_websocket(user):
    return {
        'id': user.id,
        'username': user.username
    }