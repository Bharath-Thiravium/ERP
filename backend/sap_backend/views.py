from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.conf import settings
from django.http import HttpResponse
import html

def home(request):
    """Root URL handler"""
    return HttpResponse(f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>ᗩTᕼᙓᑎᗩ'𝔖 - Modern Enterprise System</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }}
            .container {{ max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            h1 {{ color: #2c3e50; text-align: center; }}
            .status {{ background: #27ae60; color: white; padding: 10px; border-radius: 5px; text-align: center; margin: 20px 0; }}
            .endpoints {{ background: #ecf0f1; padding: 20px; border-radius: 5px; }}
            .endpoint {{ margin: 10px 0; }}
            a {{ color: #3498db; text-decoration: none; }}
            a:hover {{ text-decoration: underline; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>ᗩTᕼᙓᑎᗩ'𝔖 - Modern Enterprise System</h1>
            <div class="status">✅ Backend API is running successfully!</div>
            
            <h3>Available Endpoints:</h3>
            <div class="endpoints">
                <div class="endpoint">🔐 <a href="/api/auth/">Authentication API</a></div>
                <div class="endpoint">💰 <a href="/api/finance/">Finance API</a></div>
                <div class="endpoint">👥 <a href="/api/hr/">HR Management API</a></div>
                <div class="endpoint">📦 <a href="/api/inventory/">Inventory API</a></div>
                <div class="endpoint">🛒 <a href="/api/orders/">Orders API</a></div>
                <div class="endpoint">📊 <a href="/api/analytics/">Analytics API</a></div>
                <div class="endpoint">📋 <a href="/api/reports/">Reports API</a></div>
                <div class="endpoint">🔔 <a href="/api/notifications/">Notifications API</a></div>
                <div class="endpoint">📚 <a href="/api/docs/">API Documentation</a></div>
                <div class="endpoint">⚙️ <a href="/admin/">Admin Panel</a></div>
            </div>
            
            <p><strong>Server:</strong> {html.escape(request.get_host())}</p>
            <p><strong>Debug Mode:</strong> {html.escape("Enabled" if settings.DEBUG else "Disabled")}</p>
        </div>
    </body>
    </html>
    """)

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """API health check endpoint"""
    return Response({
        'status': 'healthy',
        'message': 'ᗩTᕼᙓᑎᗩ\'𝔖 Backend API is running',
        'debug': settings.DEBUG,
        'version': '1.0.0'
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def api_info(request):
    """API information endpoint"""
    return Response({
        'name': 'ᗩTᕼᙓᑎᗩ\'𝔖 Backend API',
        'version': '1.0.0',
        'description': 'Modern ᗩTᕼᙓᑎᗩ\'𝔖 System Backend API',
        'endpoints': {
            'auth': '/api/auth/',
            'finance': '/api/finance/',
            'hr': '/api/hr/',
            'inventory': '/api/inventory/',
            'orders': '/api/orders/',
            'analytics': '/api/analytics/',
            'reports': '/api/reports/',
            'notifications': '/api/notifications/',
        },
        'websockets': {
            'notifications': '/ws/notifications/',
            'chat': '/ws/chat/',
        }
    })
