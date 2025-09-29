"""
Ultra Security Module for Master Admin Protection
================================================
Military-grade security implementations
"""
import hashlib
import hmac
import secrets
import time
import json
from datetime import datetime, timedelta
from django.core.cache import cache
from django.http import JsonResponse
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import SecurityLog, MasterAdmin

User = get_user_model()

class UltraSecurityManager:
    """Ultra security manager for master admin protection"""
    
    # Security constants
    MAX_LOGIN_ATTEMPTS = 3
    LOCKOUT_DURATION = 30  # minutes
    RATE_LIMIT_WINDOW = 60  # seconds
    MAX_REQUESTS_PER_WINDOW = 10
    
    @staticmethod
    def generate_secure_token():
        """Generate cryptographically secure token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def hash_with_salt(data, salt=None):
        """Hash data with salt using SHA-256"""
        if salt is None:
            salt = secrets.token_bytes(32)
        
        combined = data.encode() + salt
        hashed = hashlib.sha256(combined).hexdigest()
        return hashed, salt.hex()
    
    @staticmethod
    def verify_hash(data, hashed, salt_hex):
        """Verify hashed data"""
        salt = bytes.fromhex(salt_hex)
        test_hash, _ = UltraSecurityManager.hash_with_salt(data, salt)
        return hmac.compare_digest(test_hash, hashed)
    
    @staticmethod
    def check_rate_limit(ip_address, endpoint):
        """Check if IP is rate limited for specific endpoint"""
        cache_key = f"rate_limit:{ip_address}:{endpoint}"
        requests = cache.get(cache_key, [])
        
        # Clean old requests
        current_time = time.time()
        requests = [req_time for req_time in requests 
                   if current_time - req_time < UltraSecurityManager.RATE_LIMIT_WINDOW]
        
        if len(requests) >= UltraSecurityManager.MAX_REQUESTS_PER_WINDOW:
            return False
        
        # Add current request
        requests.append(current_time)
        cache.set(cache_key, requests, UltraSecurityManager.RATE_LIMIT_WINDOW)
        return True
    
    @staticmethod
    def log_security_event(user, event_type, ip_address, details="", user_agent=""):
        """Log security events"""
        SecurityLog.objects.create(
            user=user,
            event_type=event_type,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details
        )
    
    @staticmethod
    def check_suspicious_activity(ip_address, user_agent):
        """Check for suspicious activity patterns"""
        suspicious_patterns = [
            'bot', 'crawler', 'spider', 'scraper',
            'hack', 'exploit', 'injection', 'script'
        ]
        
        user_agent_lower = user_agent.lower()
        return any(pattern in user_agent_lower for pattern in suspicious_patterns)
    
    @staticmethod
    def validate_master_admin_access(user, ip_address, user_agent):
        """Validate master admin access with multiple security checks"""
        try:
            master_admin = MasterAdmin.objects.get(user=user)
        except MasterAdmin.DoesNotExist:
            return False, "Invalid master admin"
        
        # Check if account is locked
        if master_admin.is_locked:
            if master_admin.locked_until and timezone.now() < master_admin.locked_until:
                return False, "Account is locked"
            else:
                # Unlock if lock period expired
                master_admin.is_locked = False
                master_admin.locked_until = None
                master_admin.login_attempts = 0
                master_admin.save()
        
        # Check password expiry
        if master_admin.is_password_expired():
            return False, "Password has expired"
        
        # Check for suspicious activity
        if UltraSecurityManager.check_suspicious_activity(ip_address, user_agent):
            UltraSecurityManager.log_security_event(
                user, 'SUSPICIOUS_ACTIVITY', ip_address,
                f"Suspicious user agent: {user_agent}", user_agent
            )
            return False, "Suspicious activity detected"
        
        return True, "Access granted"
    
    @staticmethod
    def handle_failed_login(user, ip_address, user_agent):
        """Handle failed login attempts with progressive lockout"""
        try:
            master_admin = MasterAdmin.objects.get(user=user)
            master_admin.login_attempts += 1
            
            if master_admin.login_attempts >= UltraSecurityManager.MAX_LOGIN_ATTEMPTS:
                master_admin.is_locked = True
                master_admin.locked_until = timezone.now() + timedelta(
                    minutes=UltraSecurityManager.LOCKOUT_DURATION
                )
                
                UltraSecurityManager.log_security_event(
                    user, 'ACCOUNT_LOCKED', ip_address,
                    f"Account locked after {master_admin.login_attempts} failed attempts",
                    user_agent
                )
            
            master_admin.save()
            
            UltraSecurityManager.log_security_event(
                user, 'LOGIN_FAILED', ip_address,
                f"Failed login attempt {master_admin.login_attempts}",
                user_agent
            )
            
        except MasterAdmin.DoesNotExist:
            pass
    
    @staticmethod
    def handle_successful_login(user, ip_address, user_agent):
        """Handle successful login"""
        try:
            master_admin = MasterAdmin.objects.get(user=user)
            master_admin.login_attempts = 0
            master_admin.is_locked = False
            master_admin.locked_until = None
            master_admin.last_login_ip = ip_address
            master_admin.save()
            
            UltraSecurityManager.log_security_event(
                user, 'LOGIN_SUCCESS', ip_address,
                "Successful master admin login", user_agent
            )
            
        except MasterAdmin.DoesNotExist:
            pass


class UltraSecurityMiddleware:
    """Ultra security middleware for master admin protection"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Get client IP
        ip_address = self.get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Check for master admin endpoints
        if '/master-admin/' in request.path:
            # Rate limiting
            if not UltraSecurityManager.check_rate_limit(ip_address, 'master_admin'):
                return JsonResponse({
                    'error': 'Rate limit exceeded',
                    'message': 'Too many requests. Please try again later.'
                }, status=429)
            
            # Check for suspicious activity
            if UltraSecurityManager.check_suspicious_activity(ip_address, user_agent):
                UltraSecurityManager.log_security_event(
                    None, 'SUSPICIOUS_ACTIVITY', ip_address,
                    f"Suspicious access attempt to {request.path}", user_agent
                )
                return JsonResponse({
                    'error': 'Access denied',
                    'message': 'Suspicious activity detected'
                }, status=403)
        
        response = self.get_response(request)
        return response
    
    def get_client_ip(self, request):
        """Get real client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class SecureAPIKeyManager:
    """Secure API key management for master admin"""
    
    @staticmethod
    def generate_api_key_pair():
        """Generate API key pair (public/private)"""
        public_key = secrets.token_urlsafe(32)
        private_key = secrets.token_urlsafe(64)
        
        # Create signature
        timestamp = str(int(time.time()))
        message = f"{public_key}:{timestamp}"
        signature = hmac.new(
            private_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return {
            'public_key': public_key,
            'private_key': private_key,
            'signature': signature,
            'timestamp': timestamp
        }
    
    @staticmethod
    def validate_api_key(public_key, signature, timestamp, private_key):
        """Validate API key signature"""
        # Check timestamp (prevent replay attacks)
        current_time = int(time.time())
        key_time = int(timestamp)
        
        if current_time - key_time > 300:  # 5 minutes expiry
            return False
        
        # Verify signature
        message = f"{public_key}:{timestamp}"
        expected_signature = hmac.new(
            private_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)


class TwoFactorAuthManager:
    """Two-factor authentication manager"""
    
    @staticmethod
    def generate_2fa_secret():
        """Generate 2FA secret key"""
        import base64
        return base64.b32encode(secrets.token_bytes(20)).decode()
    
    @staticmethod
    def generate_backup_codes(count=10):
        """Generate backup codes for 2FA"""
        codes = []
        for _ in range(count):
            code = ''.join(secrets.choice('0123456789') for _ in range(8))
            codes.append(f"{code[:4]}-{code[4:]}")
        return codes
    
    @staticmethod
    def verify_totp_code(secret, code, window=1):
        """Verify TOTP code with time window"""
        try:
            import pyotp
            totp = pyotp.TOTP(secret)
            
            # Check current time and adjacent windows
            current_time = int(time.time())
            for i in range(-window, window + 1):
                test_time = current_time + (i * 30)  # 30-second window
                if totp.verify(code, test_time):
                    return True
            return False
        except ImportError:
            # Fallback if pyotp is not installed
            return False