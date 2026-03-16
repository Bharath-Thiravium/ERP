"""
Management command to debug and fix login issues
"""
from django.core.management.base import BaseCommand
from django.core.cache import cache
from django.contrib.auth.models import User
from authentication.models import MasterAdmin, CompanyUser

class Command(BaseCommand):
    help = 'Debug and fix login issues'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Email to debug')
        parser.add_argument('--clear-cache', action='store_true', help='Clear login cache')
        parser.add_argument('--clear-rate-limit', action='store_true', help='Clear rate limit cache')

    def handle(self, *args, **options):
        email = options.get('email')
        
        if options['clear_cache']:
            if email:
                cache_key = f"login_attempts:{email}"
                cache.delete(cache_key)
                self.stdout.write(f"Cleared login cache for {email}")
            else:
                # Clear all login attempt caches
                cache.clear()
                self.stdout.write("Cleared all cache")
        
        if options['clear_rate_limit']:
            rate_limit_key = "rate_limit:127.0.0.1:login"
            cache.delete(rate_limit_key)
            self.stdout.write("Cleared rate limit cache")
        
        if email:
            self.debug_user_login(email)
    
    def debug_user_login(self, email):
        self.stdout.write(f"Debugging login for: {email}")
        
        # Check cache
        cache_key = f"login_attempts:{email}"
        failed_attempts = cache.get(cache_key, 0)
        self.stdout.write(f"Failed attempts in cache: {failed_attempts}")
        
        # Check user
        try:
            user = User.objects.get(email=email)
            self.stdout.write(f"User found: {user.username}, active: {user.is_active}")
            
            if hasattr(user, 'master_admin'):
                ma = user.master_admin
                self.stdout.write(f"Master Admin - locked: {ma.is_locked}")
            elif hasattr(user, 'company_user'):
                cu = user.company_user
                self.stdout.write(f"Company User - locked: {cu.is_locked}")
                self.stdout.write(f"Company approval: {cu.company.approval_status}")
            
        except User.DoesNotExist:
            self.stdout.write(f"User not found: {email}")