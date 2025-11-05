"""
Security middleware for HR compliance system
"""
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from .security_utils import SecurityValidator
import logging

logger = logging.getLogger(__name__)


class ComplianceSecurityMiddleware(MiddlewareMixin):
    """Security middleware for compliance endpoints"""
    
    def process_request(self, request):
        """Process incoming requests for security validation"""
        
        # Skip security checks for non-compliance endpoints
        if not request.path.startswith('/hr/'):
            return None
        
        # Skip for safe methods on public endpoints
        if request.method in ['GET', 'OPTIONS'] and 'public' in request.path:
            return None
        
        try:
            # Validate session for compliance endpoints
            if any(endpoint in request.path for endpoint in [
                'statutory', 'compliance', 'government', 'payroll'
            ]):
                session_key = self._extract_session_key(request)
                if session_key:
                    SecurityValidator.validate_session_key(session_key)
            
            # Log compliance access
            if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
                logger.info(f"Compliance access: {request.method} {request.path} from {request.META.get('REMOTE_ADDR')}")
            
        except Exception as e:
            logger.warning(f"Security validation failed: {str(e)} for {request.path}")
            return JsonResponse({
                'error': 'Security validation failed',
                'error_code': 'SECURITY_ERROR'
            }, status=400)
        
        return None
    
    def _extract_session_key(self, request):
        """Extract session key from request"""
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Bearer '):
            return auth_header[7:]
        
        if hasattr(request, 'GET'):
            return request.GET.get('session_key')
        
        return None
    
    def process_response(self, request, response):
        """Process responses to add security headers"""
        
        # Add security headers for compliance endpoints
        if request.path.startswith('/hr/'):
            response['X-Content-Type-Options'] = 'nosniff'
            response['X-Frame-Options'] = 'DENY'
            response['X-XSS-Protection'] = '1; mode=block'
            response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        return response


class ComplianceRateLimitMiddleware(MiddlewareMixin):
    """Rate limiting middleware for compliance endpoints"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.request_counts = {}
        super().__init__(get_response)
    
    def process_request(self, request):
        """Process request for rate limiting"""
        
        # Apply rate limiting to compliance endpoints
        if any(endpoint in request.path for endpoint in [
            'statutory/dashboard', 'government/submit', 'compliance/validate'
        ]):
            client_ip = request.META.get('REMOTE_ADDR')
            current_time = int(time.time())
            
            # Clean old entries (older than 1 minute)
            self.request_counts = {
                ip: [(timestamp, count) for timestamp, count in requests 
                     if current_time - timestamp < 60]
                for ip, requests in self.request_counts.items()
            }
            
            # Check rate limit (max 60 requests per minute)
            if client_ip in self.request_counts:
                recent_requests = len(self.request_counts[client_ip])
                if recent_requests >= 60:
                    logger.warning(f"Rate limit exceeded for IP: {client_ip}")
                    return JsonResponse({
                        'error': 'Rate limit exceeded',
                        'error_code': 'RATE_LIMIT_EXCEEDED'
                    }, status=429)
            
            # Record this request
            if client_ip not in self.request_counts:
                self.request_counts[client_ip] = []
            self.request_counts[client_ip].append((current_time, 1))
        
        return None


import time