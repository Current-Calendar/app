from django.urls import re_path
from current import consumers

websocket_urlpatterns = [
    re_path(r'ws/test_websockets/$', consumers.TestConsumer.as_asgi()),
]