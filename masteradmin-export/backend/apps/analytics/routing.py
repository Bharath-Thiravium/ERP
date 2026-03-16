from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/system-monitor/', consumers.SystemMonitorConsumer.as_asgi()),
    path('ws/alerts/', consumers.AlertsConsumer.as_asgi()),
]