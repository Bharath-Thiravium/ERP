#!/usr/bin/env python3
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from finance.models import Payment

# Get all TDS-only payments and trigger save to recalculate invoice outstanding
tds_only_payments = Payment.objects.filter(payment_type='tds_only')
print(f"Found {tds_only_payments.count()} TDS-only payments")

for payment in tds_only_payments:
    print(f"Recalculating invoice for payment {payment.payment_number}")
    payment.save()

print("Done!")
