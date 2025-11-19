"""
Login Performance Cache
======================
Caching utilities to speed up login operations
"""
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
import json

class LoginCache:
    """Cache manager for login operations"""
    
    @staticmethod
    def cache_user_profile(user_email, profile_data, timeout=3600):
        """Cache user profile data"""
        cache_key = f"user_profile:{user_email}"
        cache.set(cache_key, profile_data, timeout)
    
    @staticmethod
    def get_cached_user_profile(user_email):
        """Get cached user profile"""
        cache_key = f"user_profile:{user_email}"
        return cache.get(cache_key)
    
    @staticmethod
    def cache_security_settings(company_id, settings_data, timeout=1800):
        """Cache company security settings"""
        cache_key = f"security_settings:{company_id}"
        cache.set(cache_key, settings_data, timeout)
    
    @staticmethod
    def get_cached_security_settings(company_id):
        """Get cached security settings"""
        cache_key = f"security_settings:{company_id}"
        return cache.get(cache_key)
    
    @staticmethod
    def cache_geolocation_result(ip_address, location_data, timeout=7200):
        """Cache geolocation results"""
        cache_key = f"geolocation:{ip_address}"
        cache.set(cache_key, location_data, timeout)
    
    @staticmethod
    def get_cached_geolocation(ip_address):
        """Get cached geolocation"""
        cache_key = f"geolocation:{ip_address}"
        return cache.get(cache_key)
    
    @staticmethod
    def increment_failed_attempts(identifier, max_attempts=5, window=900):
        """Increment failed login attempts with rate limiting"""
        cache_key = f"failed_attempts:{identifier}"
        attempts = cache.get(cache_key, 0)
        
        if attempts >= max_attempts:
            return False, attempts
        
        cache.set(cache_key, attempts + 1, window)
        return True, attempts + 1
    
    @staticmethod
    def clear_failed_attempts(identifier):
        """Clear failed login attempts"""
        cache_key = f"failed_attempts:{identifier}"
        cache.delete(cache_key)
    
    @staticmethod
    def is_rate_limited(identifier, max_attempts=5):
        """Check if identifier is rate limited"""
        cache_key = f"failed_attempts:{identifier}"
        attempts = cache.get(cache_key, 0)
        return attempts >= max_attempts
    
    @staticmethod
    def cache_device_fingerprint(user_id, device_data, timeout=86400):
        """Cache device fingerprint"""
        cache_key = f"device_fingerprint:{user_id}"
        cache.set(cache_key, device_data, timeout)
    
    @staticmethod
    def get_cached_device_fingerprint(user_id):
        """Get cached device fingerprint"""
        cache_key = f"device_fingerprint:{user_id}"
        return cache.get(cache_key)

# Global cache instance
login_cache = LoginCache()