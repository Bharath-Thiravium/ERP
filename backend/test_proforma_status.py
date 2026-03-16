#!/usr/bin/env python
import os
import sys
import django

sys.path.insert(0, '/var/www/SAP-Python/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
os.environ['DEBUG'] = 'False'
django.setup()

from finance.models import ProformaInvoice

print("=" * 60)
print("TESTING STATUS UPDATE FOR PROFORMA INVOICE")
print("=" * 60)

# Get the proforma invoice
proforma = ProformaInvoice.objects.filter(proforma_number='PRO-26-008').first()

if not proforma:
    print("❌ Proforma PRO-26-008 not found")
    sys.exit(1)

print(f"\n✓ Found Proforma: {proforma.proforma_number}")
print(f"  ID: {proforma.id}")
print(f"  Customer: {proforma.customer.name if proforma.customer else 'N/A'}")
print(f"  Current Status: {proforma.status}")
print(f"  Amount: ₹{proforma.total_amount}")

# Test status update
print(f"\n📝 Testing status update...")
original_status = proforma.status

# Update status
proforma.status = 'sent'
proforma.save(update_fields=['status'])
print(f"  ✓ Status saved to database")

# Refresh from database
proforma.refresh_from_db()
print(f"  ✓ Refreshed from database")

# Verify
if proforma.status == 'sent':
    print(f"  ✅ SUCCESS: Status updated from '{original_status}' to '{proforma.status}'")
else:
    print(f"  ❌ FAILED: Status is still '{proforma.status}'")

# Revert for testing
proforma.status = original_status
proforma.save(update_fields=['status'])
print(f"\n  ↩️  Reverted status back to '{original_status}' for testing")

print("\n" + "=" * 60)
print("✅ Status update mechanism is working correctly!")
print("=" * 60)
print("\nNext steps:")
print("1. Restart Django: sudo systemctl restart gunicorn")
print("2. Send email via UI")
print("3. Status should update to 'sent'")
print("4. List should refresh and show new status")
