#!/usr/bin/env python3
"""
Script to reset Master Admin 2FA authentication
Usage: python reset_master_admin_2fa.py <email>
"""

import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from django.contrib.auth.models import User
from authentication.models import MasterAdmin

def reset_2fa(email):
    try:
        # Find the user
        user = User.objects.get(email=email)
        master_admin = MasterAdmin.objects.get(user=user)
        
        # Reset 2FA settings
        master_admin.two_factor_enabled = False
        master_admin.two_factor_secret = ''
        master_admin.save()
        
        print(f"✅ Successfully reset 2FA for {email}")
        print(f"   - two_factor_enabled: {master_admin.two_factor_enabled}")
        print(f"   - two_factor_secret: {'[CLEARED]' if not master_admin.two_factor_secret else '[SET]'}")
        
    except User.DoesNotExist:
        print(f"❌ User with email {email} not found")
    except MasterAdmin.DoesNotExist:
        print(f"❌ Master Admin profile for {email} not found")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python reset_master_admin_2fa.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    reset_2fa(email)