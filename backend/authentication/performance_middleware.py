"""
Login Performance Middleware
===========================
Middleware to optimize login performance
"""
import time
import logging
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse

logger = logging.getLogger(__name__)

class LoginPerformanceMiddleware(MiddlewareMixin):
    """Middleware to monitor and optimize login performance"""
    
    def process_request(self, request):
        # Start timing for login requests
        if self.is_login_request(request):
            request._login_start_time = time.time()
            logger.info(f"Login request started: {request.path}")
    
    def process_response(self, request, response):
        # Log login performance
        if hasattr(request, '_login_start_time'):
            duration = time.time() - request._login_start_time
            logger.info(f"Login completed in {duration:.2f}s for {request.path}")
            
            # Add performance header
            response['X-Login-Duration'] = f"{duration:.2f}s"
            
            # Warn if login is slow
            if duration > 2.0:
                logger.warning(f"Slow login detected: {duration:.2f}s for {request.path}")
        
        return response
    
    def is_login_request(self, request):
        """Check if this is a login request"""
        login_paths = [
            '/api/auth/master-admin/login/',
            '/api/auth/company/login/',
            '/api/auth/service-user/login/'
        ]
        return request.path in login_paths and request.method == 'POST'

class LoginRateLimitMiddleware(MiddlewareMixin):
    """Rate limiting middleware for login attempts"""
    
    def process_request(self, request):
        if self.is_login_request(request):
            from .login_cache import login_cache
            
            # Get client IP
            ip_address = self.get_client_ip(request)
            
            # Check rate limit
            if login_cache.is_rate_limited(f"ip:{ip_address}", max_attempts=10):
                return JsonResponse({
                    'error': 'Too many login attempts from this IP. Please try again later.',
                    'rate_limited': True
                }, status=429)
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
        return ip
    
    def is_login_request(self, request):
        """Check if this is a login request"""
        login_paths = [
            '/api/auth/master-admin/login/',
            '/api/auth/company/login/',
            '/api/auth/service-user/login/'
        ]
        return request.path in login_paths and request.method == 'POST'