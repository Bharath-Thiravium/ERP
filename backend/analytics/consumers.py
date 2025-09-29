import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .views import check_service_health
import psutil
import time
from datetime import datetime

class SystemMonitorConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Accept connection without authentication for now
        self.room_group_name = 'system_monitor'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Start sending real-time updates
        self.monitoring_task = asyncio.create_task(self.send_system_updates())
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # Cancel monitoring task
        if hasattr(self, 'monitoring_task'):
            self.monitoring_task.cancel()
    
    async def send_system_updates(self):
        """Send real-time system updates every 10 seconds"""
        while True:
            try:
                # Get system metrics
                system_data = await self.get_system_metrics()
                
                # Send to WebSocket
                await self.send(text_data=json.dumps({
                    'type': 'system_update',
                    'data': system_data,
                    'timestamp': datetime.now().isoformat()
                }))
                
                # Wait 10 seconds before next update
                await asyncio.sleep(10)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in system monitoring: {e}")
                await asyncio.sleep(10)
    
    @database_sync_to_async
    def get_system_metrics(self):
        """Get current system metrics"""
        try:
            # CPU and Memory
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Active users (last 24 hours)
            from django.utils import timezone
            from datetime import timedelta
            active_users = User.objects.filter(
                last_login__gte=timezone.now() - timedelta(hours=24)
            ).count()
            
            # Check service health
            check_service_health()
            
            # Get service status
            from .models import ServiceHealth
            services = list(ServiceHealth.objects.values(
                'service_name', 'status', 'response_time', 'uptime_percentage'
            ))
            
            return {
                'system_metrics': {
                    'cpu_usage': cpu_percent,
                    'memory_usage': memory.percent,
                    'disk_usage': (disk.used / disk.total) * 100,
                    'active_users': active_users,
                    'uptime': time.time() - psutil.boot_time()
                },
                'services': services,
                'timestamp': timezone.now().isoformat()
            }
        except Exception as e:
            print(f"Error getting system metrics: {e}")
            return {
                'system_metrics': {
                    'cpu_usage': 0,
                    'memory_usage': 0,
                    'disk_usage': 0,
                    'active_users': 0,
                    'uptime': 0
                },
                'services': [],
                'error': str(e)
            }

class AlertConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Accept connection without authentication for now
        self.room_group_name = 'system_alerts'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    # Receive message from room group
    async def alert_message(self, event):
        message = event['message']
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'alert',
            'message': message
        }))