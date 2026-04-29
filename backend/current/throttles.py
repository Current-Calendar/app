from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """
    Endpoints de autenticación: login, register, recover-password...
    Siempre por IP, aunque el usuario esté autenticado, para evitar
    fuerza bruta contra otras cuentas.
    """
    scope = 'auth'

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


class HeavyEndpointThrottle(UserRateThrottle):
    """
    Endpoints computacionalmente caros: radar, recommendations.
    Aplica solo a autenticados (los anónimos ya los coge AnonRateThrottle).
    """
    scope = 'heavy'