"""
Rate limiting for CRM API endpoints
"""
import time
from django.core.cache import cache
from django.http import JsonResponse
from rest_framework import status
from rest_framework.response import Response
import logging

logger = logging.getLogger('crm_rate_limit')

class RateLimiter:
    """Rate limiter for CRM API endpoints"""
    
    # Rate limits per endpoint type (requests per minute)
    RATE_LIMITS = {
        'default': 60,  # 60 requests per minute
        'create': 30,   # 30 creates per minute
        'update': 40,   # 40 updates per minute
        'delete': 20,   # 20 deletes per minute
        'bulk': 10,     # 10 bulk operations per minute
        'export': 5,    # 5 exports per minute
        'search': 100,  # 100 searches per minute
    }
    
    @classmethod
    def get_rate_limit_key(cls, request, endpoint_type='default'):
        """Generate rate limit key"""
        # Use session key if available, otherwise IP address
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.META.get('REMOTE_ADDR', 'unknown')
        
        return f"crm_rate_limit:{endpoint_type}:{session_key}"
    
    @classmethod
    def is_rate_limited(cls, request, endpoint_type='default'):
        """Check if request is rate limited"""
        key = cls.get_rate_limit_key(request, endpoint_type)
        limit = cls.RATE_LIMITS.get(endpoint_type, cls.RATE_LIMITS['default'])
        
        # Get current count
        current_count = cache.get(key, 0)
        
        if current_count >= limit:
            logger.warning(f"Rate limit exceeded for {key}: {current_count}/{limit}")
            return True
        
        # Increment counter
        cache.set(key, current_count + 1, 60)  # 60 seconds TTL
        return False
    
    @classmethod
    def get_rate_limit_info(cls, request, endpoint_type='default'):
        """Get rate limit information"""
        key = cls.get_rate_limit_key(request, endpoint_type)
        limit = cls.RATE_LIMITS.get(endpoint_type, cls.RATE_LIMITS['default'])
        current_count = cache.get(key, 0)
        
        return {
            'limit': limit,
            'remaining': max(0, limit - current_count),
            'reset_time': int(time.time()) + 60
        }

def rate_limit_decorator(endpoint_type='default'):
    """Decorator for rate limiting"""
    def decorator(func):
        def wrapper(self, request, *args, **kwargs):
            if RateLimiter.is_rate_limited(request, endpoint_type):
                rate_info = RateLimiter.get_rate_limit_info(request, endpoint_type)
                return Response({
                    'error': 'Rate limit exceeded',
                    'limit': rate_info['limit'],
                    'reset_time': rate_info['reset_time']
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            return func(self, request, *args, **kwargs)
        return wrapper
    return decorator

class RateLimitMiddleware:
    """Middleware for rate limiting"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Check if this is a CRM API request
        if request.path.startswith('/api/crm/'):
            # Determine endpoint type based on method and path
            endpoint_type = self.get_endpoint_type(request)
            
            if RateLimiter.is_rate_limited(request, endpoint_type):
                rate_info = RateLimiter.get_rate_limit_info(request, endpoint_type)
                return JsonResponse({
                    'error': 'Rate limit exceeded',
                    'limit': rate_info['limit'],
                    'reset_time': rate_info['reset_time']
                }, status=429)
        
        response = self.get_response(request)
        
        # Add rate limit headers to response
        if request.path.startswith('/api/crm/'):
            endpoint_type = self.get_endpoint_type(request)
            rate_info = RateLimiter.get_rate_limit_info(request, endpoint_type)
            
            response['X-RateLimit-Limit'] = str(rate_info['limit'])
            response['X-RateLimit-Remaining'] = str(rate_info['remaining'])
            response['X-RateLimit-Reset'] = str(rate_info['reset_time'])
        
        return response
    
    def get_endpoint_type(self, request):
        """Determine endpoint type from request"""
        method = request.method.upper()
        path = request.path.lower()
        
        if method == 'POST':
            if 'bulk' in path or 'batch' in path:
                return 'bulk'
            return 'create'
        elif method in ['PUT', 'PATCH']:
            return 'update'
        elif method == 'DELETE':
            return 'delete'
        elif 'export' in path or 'download' in path:
            return 'export'
        elif 'search' in path or request.GET.get('search'):
            return 'search'
        else:
            return 'default'

# Rate limiting mixins for viewsets
class RateLimitMixin:
    """Mixin to add rate limiting to viewsets"""
    
    def dispatch(self, request, *args, **kwargs):
        """Override dispatch to add rate limiting"""
        endpoint_type = self.get_rate_limit_type(request)
        
        if RateLimiter.is_rate_limited(request, endpoint_type):
            rate_info = RateLimiter.get_rate_limit_info(request, endpoint_type)
            return Response({
                'error': 'Rate limit exceeded',
                'limit': rate_info['limit'],
                'reset_time': rate_info['reset_time']
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        return super().dispatch(request, *args, **kwargs)
    
    def get_rate_limit_type(self, request):
        """Get rate limit type for this request"""
        action = getattr(self, 'action', None)
        
        if action == 'create':
            return 'create'
        elif action in ['update', 'partial_update']:
            return 'update'
        elif action == 'destroy':
            return 'delete'
        elif action == 'list' and request.GET.get('search'):
            return 'search'
        else:
            return 'default'

# Specific rate limiters for different operations
class BulkOperationRateLimiter:
    """Rate limiter for bulk operations"""
    
    @classmethod
    def check_bulk_limit(cls, request, operation_count):
        """Check if bulk operation is within limits"""
        # Limit bulk operations to 1000 items per request
        if operation_count > 1000:
            return False, "Bulk operation limited to 1000 items per request"
        
        # Check rate limit
        if RateLimiter.is_rate_limited(request, 'bulk'):
            return False, "Bulk operation rate limit exceeded"
        
        return True, None

class ExportRateLimiter:
    """Rate limiter for data exports"""
    
    @classmethod
    def check_export_limit(cls, request):
        """Check if export operation is within limits"""
        if RateLimiter.is_rate_limited(request, 'export'):
            return False, "Export rate limit exceeded"
        
        return True, None