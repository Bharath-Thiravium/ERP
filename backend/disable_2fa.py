#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from authentication.models import MasterAdmin

# Disable 2FA for master admin
ma = MasterAdmin.objects.first()
if ma:
    ma.two_factor_enabled = False
    ma.two_factor_secret = ''
    ma.save()
    print("✅ 2FA disabled for master admin")
    print(f"2FA Status: {ma.two_factor_enabled}")
else:
    print("❌ No master admin found")