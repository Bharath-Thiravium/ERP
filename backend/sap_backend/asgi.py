"""
ASGI config for sap_backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
import django
from django.core.asgi import get_asgi_application

# Set Django settings before importing channels
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator

# Import WebSocket URL patterns after Django setup
from notifications.routing import websocket_urlpatterns as notifications_ws
from analytics.routing import websocket_urlpatterns as analytics_ws

# Combine all WebSocket URL patterns
websocket_urlpatterns = notifications_ws + analytics_ws

# ASGI application optimized for Uvicorn
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(
                websocket_urlpatterns
            )
        )
    ),
})
