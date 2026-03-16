"""
Rate limiting middleware for Django
"""
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from authentication.ultra_security import UltraSecurityManager, get_client_ip


class RateLimitMiddleware(MiddlewareMixin):
    """Rate limiting middleware using UltraSecurityManager"""
    
    def process_request(self, request):
        # Skip rate limiting for static files and admin
        if request.path.startswith('/static/') or request.path.startswith('/admin/'):
            return None
            
        ip_address = get_client_ip(request)
        
        # Different limits for different endpoints (more reasonable limits)
        if (request.path.startswith('/api/auth/login') or 
            request.path.startswith('/api/auth/master-admin/login/') or
            request.path.startswith('/api/auth/company/login/')):
            # More lenient for login attempts to prevent first-login issues
            if not UltraSecurityManager.check_rate_limit(ip_address, 'login', 50, 300):
                return JsonResponse({'error': 'Too many login attempts. Try again in 5 minutes.'}, status=429)
        
        elif request.path.startswith('/api/auth/master-admin/settings/'):
            # Higher limit for settings pages (polling + multiple calls)
            if not UltraSecurityManager.check_rate_limit(ip_address, 'settings', 500, 300):
                return JsonResponse({'error': 'Too many settings requests.'}, status=429)
        
        elif request.path.startswith('/api/auth/'):
            # Moderate for other auth endpoints
            if not UltraSecurityManager.check_rate_limit(ip_address, 'auth', 200, 300):
                return JsonResponse({'error': 'Too many authentication requests.'}, status=429)
        
        elif request.path.startswith('/api/'):
            # General API limit
            if not UltraSecurityManager.check_rate_limit(ip_address, 'api', 300, 300):
                return JsonResponse({'error': 'Rate limit exceeded.'}, status=429)
        
        return None