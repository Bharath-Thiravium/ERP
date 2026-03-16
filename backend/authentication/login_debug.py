"""
Login Debug Utility
===================
Debug tool to identify login issues
"""
from django.core.cache import cache
from django.contrib.auth.models import User
from .models import MasterAdmin, CompanyUser

def debug_login_issue(email):
    """Debug login issues for a specific email"""
    print(f"🔍 DEBUG: Analyzing login issues for {email}")
    
    # Check cache state
    cache_key = f"login_attempts:{email}"
    failed_attempts = cache.get(cache_key, 0)
    print(f"🔍 Cache failed attempts: {failed_attempts}")
    
    # Check user existence
    try:
        user = User.objects.get(email=email)
        print(f"🔍 User found: {user.username}, active: {user.is_active}")
        
        # Check user type
        if hasattr(user, 'master_admin'):
            master_admin = user.master_admin
            print(f"🔍 Master Admin: locked={master_admin.is_locked}, locked_until={master_admin.locked_until}")
        elif hasattr(user, 'company_user'):
            company_user = user.company_user
            print(f"🔍 Company User: locked={company_user.is_locked}, locked_until={company_user.locked_until}")
            print(f"🔍 Company approval: {company_user.company.approval_status}")
        else:
            print("🔍 User has no admin or company profile")
            
    except User.DoesNotExist:
        print(f"🔍 User not found with email: {email}")
    
    # Check rate limiting
    from .ultra_security import UltraSecurityManager
    rate_limit_key = f"rate_limit:127.0.0.1:login"
    rate_limit_count = cache.get(rate_limit_key, 0)
    print(f"🔍 Rate limit count: {rate_limit_count}")
    
    return {
        'failed_attempts': failed_attempts,
        'rate_limit_count': rate_limit_count,
        'user_exists': User.objects.filter(email=email).exists()
    }

def clear_login_cache(email):
    """Clear login cache for debugging"""
    cache_key = f"login_attempts:{email}"
    cache.delete(cache_key)
    print(f"🔍 Cleared login cache for {email}")

def clear_rate_limit_cache(ip_address="127.0.0.1"):
    """Clear rate limit cache for debugging"""
    rate_limit_key = f"rate_limit:{ip_address}:login"
    cache.delete(rate_limit_key)
    print(f"🔍 Cleared rate limit cache for {ip_address}")