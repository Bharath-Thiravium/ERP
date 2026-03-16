import json
from channels.generic.websocket import AsyncWebsocketConsumer

class SystemMonitorConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("system_monitor", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("system_monitor", self.channel_name)

    async def system_update(self, event):
        await self.send(text_data=json.dumps(event['data']))

class AlertsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("alerts", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("alerts", self.channel_name)

    async def alert_update(self, event):
        await self.send(text_data=json.dumps(event['data']))