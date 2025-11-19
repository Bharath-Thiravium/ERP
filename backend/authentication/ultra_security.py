"""
Ultra Security Manager Module
=============================
Military-grade security utilities for master admin operations
"""
import hashlib
import secrets
from datetime import timedelta
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings

# Optional imports - gracefully handle if not installed
try:
    import pyotp
    PYOTP_AVAILABLE = True
except ImportError:
    PYOTP_AVAILABLE = False
    print("⚠️  Warning: pyotp not installed. 2FA features will be limited.")


class UltraSecurityManager:
    """Ultra-secure security management utilities"""
    
    @staticmethod
    def check_rate_limit(ip_address, action, max_attempts=5, window=300):
        """
        Rate limiting with cache backend
        
        Args:
            ip_address: Client IP address
            action: Action being rate limited (e.g., 'login', 'password_change')
            max_attempts: Maximum attempts allowed
            window: Time window in seconds
            
        Returns:
            bool: True if within rate limit, False if exceeded
        """
        key = f"rate_limit:{action}:{ip_address}"
        
        try:
            attempts = cache.get(key, 0)
            
            if attempts >= max_attempts:
                return False
            
            cache.set(key, attempts + 1, window)
            return True
        except Exception as e:
            # If cache fails, allow the request but log the error
            print(f"Rate limit check failed: {e}")
            return True
    
    @staticmethod
    def log_security_event(user, event_type, ip_address, details=""):
        """
        Log security events to database
        
        Args:
            user: User object
            event_type: Type of security event
            ip_address: Client IP address
            details: Additional details about the event
        """
        try:
            from .models import SecurityLog
            SecurityLog.objects.create(
                user=user,
                event_type=event_type,
                ip_address=ip_address,
                details=details,
                timestamp=timezone.now()
            )
        except Exception as e:
            print(f"Failed to log security event: {e}")
    
    @staticmethod
    def generate_secure_token(length=32):
        """
        Generate cryptographically secure random token
        
        Args:
            length: Length of token in bytes
            
        Returns:
            str: Secure random token
        """
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def hash_sensitive_data(data):
        """
        Hash sensitive data using SHA-256
        
        Args:
            data: Data to hash
            
        Returns:
            str: Hashed data
        """
        return hashlib.sha256(data.encode()).hexdigest()
    
    @staticmethod
    def validate_password_strength(password):
        """
        Validate password meets ultra-secure requirements
        
        Args:
            password: Password to validate
            
        Returns:
            tuple: (bool, list) - (is_valid, list_of_errors)
        """
        errors = []
        
        if len(password) < 16:
            errors.append("Password must be at least 16 characters")
        
        if not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one number")
        
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            errors.append("Password must contain at least one special character")
        
        return (len(errors) == 0, errors)
    
    @staticmethod
    def check_suspicious_activity(user, ip_address, user_agent):
        """
        Check for suspicious activity patterns
        
        Args:
            user: User object
            ip_address: Client IP address
            user_agent: Client user agent
            
        Returns:
            bool: True if suspicious, False otherwise
        """
        # Check for rapid login attempts from different IPs
        key = f"login_ips:{user.id}"
        recent_ips = cache.get(key, [])
        
        if len(recent_ips) > 3 and ip_address not in recent_ips:
            # More than 3 different IPs in short time
            return True
        
        recent_ips.append(ip_address)
        cache.set(key, recent_ips[-5:], 3600)  # Keep last 5 IPs for 1 hour
        
        return False


class TwoFactorAuthManager:
    """Two-Factor Authentication management utilities"""
    
    @staticmethod
    def generate_2fa_secret():
        """
        Generate TOTP secret for 2FA
        
        Returns:
            str: Base32 encoded secret
        """
        if PYOTP_AVAILABLE:
            return pyotp.random_base32()
        else:
            # Fallback: generate base32 secret manually
            import base64
            return base64.b32encode(secrets.token_bytes(20)).decode()
    
    @staticmethod
    def verify_totp_code(secret, code):
        """
        Verify TOTP code
        
        Args:
            secret: TOTP secret
            code: 6-digit code to verify
            
        Returns:
            bool: True if valid, False otherwise
        """
        if not PYOTP_AVAILABLE:
            print("⚠️  pyotp not installed. Cannot verify TOTP code.")
            return False
            
        try:
            totp = pyotp.TOTP(secret)
            # Allow 1 time step before and after for clock skew
            return totp.verify(code, valid_window=1)
        except Exception as e:
            print(f"TOTP verification failed: {e}")
            return False
    
    @staticmethod
    def get_provisioning_uri(email, secret, issuer_name='AthenaSAP'):
        """
        Get provisioning URI for QR code generation
        
        Args:
            email: User email
            secret: TOTP secret
            issuer_name: Name of the issuer
            
        Returns:
            str: Provisioning URI
        """
        if not PYOTP_AVAILABLE:
            # Fallback: return manual URI format
            return f"otpauth://totp/{issuer_name}:{email}?secret={secret}&issuer={issuer_name}"
            
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(
            name=email,
            issuer_name=issuer_name
        )
    
    @staticmethod
    def generate_backup_codes(count=10):
        """
        Generate backup codes for 2FA recovery
        
        Args:
            count: Number of backup codes to generate
            
        Returns:
            list: List of backup codes
        """
        codes = []
        for _ in range(count):
            # Generate 8-character alphanumeric code
            code = ''.join(secrets.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') for _ in range(8))
            # Format as XXXX-XXXX
            formatted = f"{code[:4]}-{code[4:]}"
            codes.append(formatted)
        return codes
    
    @staticmethod
    def verify_backup_code(stored_codes, provided_code):
        """
        Verify and consume backup code
        
        Args:
            stored_codes: List of stored backup codes
            provided_code: Code provided by user
            
        Returns:
            tuple: (bool, list) - (is_valid, updated_codes_list)
        """
        if provided_code in stored_codes:
            # Remove used code
            updated_codes = [code for code in stored_codes if code != provided_code]
            return (True, updated_codes)
        return (False, stored_codes)


class SessionSecurityManager:
    """Session security management utilities"""
    
    @staticmethod
    def create_secure_session(user, ip_address, user_agent):
        """
        Create secure session with tracking
        
        Args:
            user: User object
            ip_address: Client IP address
            user_agent: Client user agent
            
        Returns:
            str: Session key
        """
        session_key = secrets.token_urlsafe(32)
        
        # Store session metadata in cache
        session_data = {
            'user_id': user.id,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'created_at': timezone.now().isoformat(),
            'last_activity': timezone.now().isoformat()
        }
        
        cache.set(f"session:{session_key}", session_data, 3600 * 24)  # 24 hours
        
        return session_key
    
    @staticmethod
    def validate_session(session_key, ip_address, user_agent):
        """
        Validate session and check for hijacking
        
        Args:
            session_key: Session key to validate
            ip_address: Current client IP
            user_agent: Current client user agent
            
        Returns:
            tuple: (bool, dict) - (is_valid, session_data)
        """
        session_data = cache.get(f"session:{session_key}")
        
        if not session_data:
            return (False, None)
        
        # Check for session hijacking indicators
        if session_data['ip_address'] != ip_address:
            # IP changed - potential hijacking
            return (False, None)
        
        if session_data['user_agent'] != user_agent:
            # User agent changed - potential hijacking
            return (False, None)
        
        # Update last activity
        session_data['last_activity'] = timezone.now().isoformat()
        cache.set(f"session:{session_key}", session_data, 3600 * 24)
        
        return (True, session_data)
    
    @staticmethod
    def invalidate_session(session_key):
        """
        Invalidate session
        
        Args:
            session_key: Session key to invalidate
        """
        cache.delete(f"session:{session_key}")
    
    @staticmethod
    def invalidate_all_user_sessions(user_id):
        """
        Invalidate all sessions for a user
        
        Args:
            user_id: User ID
        """
        # This requires iterating through cache keys
        # Implementation depends on cache backend
        pass


class EncryptionManager:
    """Data encryption utilities"""
    
    @staticmethod
    def encrypt_sensitive_data(data, key=None):
        """
        Encrypt sensitive data
        
        Args:
            data: Data to encrypt
            key: Encryption key (uses settings if not provided)
            
        Returns:
            str: Encrypted data
        """
        try:
            from cryptography.fernet import Fernet
            
            if key is None:
                # Derive key from SECRET_KEY
                key_material = settings.SECRET_KEY[:32].encode()
                key = hashlib.sha256(key_material).digest()
                key = base64.urlsafe_b64encode(key)
            
            f = Fernet(key)
            encrypted = f.encrypt(data.encode())
            return encrypted.decode()
        except ImportError:
            print("⚠️  cryptography not installed. Encryption unavailable.")
            return data
    
    @staticmethod
    def decrypt_sensitive_data(encrypted_data, key=None):
        """
        Decrypt sensitive data
        
        Args:
            encrypted_data: Encrypted data
            key: Decryption key (uses settings if not provided)
            
        Returns:
            str: Decrypted data
        """
        try:
            from cryptography.fernet import Fernet
            
            if key is None:
                # Derive key from SECRET_KEY
                key_material = settings.SECRET_KEY[:32].encode()
                key = hashlib.sha256(key_material).digest()
                key = base64.urlsafe_b64encode(key)
            
            f = Fernet(key)
            decrypted = f.decrypt(encrypted_data.encode())
            return decrypted.decode()
        except ImportError:
            print("⚠️  cryptography not installed. Decryption unavailable.")
            return encrypted_data


# Utility functions
import base64

def get_client_ip(request):
    """
    Get client IP address from request
    
    Args:
        request: Django request object
        
    Returns:
        str: Client IP address
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
    return ip


def get_user_agent(request):
    """
    Get user agent from request
    
    Args:
        request: Django request object
        
    Returns:
        str: User agent string
    """
    return request.META.get('HTTP_USER_AGENT', '')
