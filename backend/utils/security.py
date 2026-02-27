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