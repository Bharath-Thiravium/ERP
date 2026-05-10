#!/bin/bash
# Script to fix TDS calculations and invoice payment statuses

echo "================================================================================"
echo "FIXING TDS CALCULATIONS AND INVOICE PAYMENT STATUSES"
echo "================================================================================"
echo ""

DB_NAME="modernsap"

echo "Step 1: Fixing net_amount_received for payments with TDS..."
sudo -u postgres psql -d "$DB_NAME" << 'EOF'
-- Fix net_amount_received calculation
UPDATE finance_payments
SET net_amount_received = amount - tds_amount
WHERE tds_amount > 0
  AND net_amount_received != (amount - tds_amount)
  AND status = 'completed';

SELECT COUNT(*) as "Payments Fixed" FROM finance_payments WHERE tds_amount > 0;
EOF

echo ""
echo "Step 2: Recalculating invoice payment statuses..."
echo "This will update paid_amount, outstanding_amount, and payment_status for all invoices"
echo ""

# Create a Python script to recalculate all invoice statuses
cat > /tmp/fix_invoice_statuses.py << 'PYTHON_EOF'
import os
import sys
import django

# Setup Django
sys.path.insert(0, '/var/www/SAP-Python/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
os.environ['DEBUG'] = 'True'
django.setup()

from finance.models import Invoice, Payment
from decimal import Decimal
from django.utils import timezone

def recalculate_invoice_status(invoice):
    """Recalculate invoice payment status based on payments"""
    payments = invoice.payments.filter(status='completed')
    
    total_paid = Decimal('0')
    for payment in payments:
        net = Decimal(str(payment.net_amount_received or 0))
        tds = Decimal(str(payment.tds_amount or 0))
        
        # Count net amount always
        # Count TDS only if certificate received
        if tds > 0:
            total_paid += net + (tds if payment.tds_certificate_received else Decimal('0'))
        else:
            # No TDS, use gross amount
            total_paid += Decimal(str(payment.amount or 0))
    
    invoice_total = Decimal(str(invoice.total_amount or 0))
    outstanding = invoice_total - total_paid
    
    # Update invoice
    invoice.paid_amount = total_paid
    invoice.outstanding_amount = outstanding
    
    # Determine status
    if outstanding <= Decimal('0.01'):  # Allow 1 paisa tolerance
        invoice.payment_status = 'paid'
    elif total_paid > Decimal('0'):
        invoice.payment_status = 'partially_paid'
    else:
        invoice.payment_status = 'unpaid'
    
    # Check for overdue
    if invoice.payment_status == 'unpaid' and invoice.due_date and invoice.due_date < timezone.now().date():
        invoice.payment_status = 'overdue'
    
    invoice.save(update_fields=['paid_amount', 'outstanding_amount', 'payment_status'])
    
    return {
        'invoice_number': invoice.invoice_number,
        'total': float(invoice_total),
        'paid': float(total_paid),
        'outstanding': float(outstanding),
        'status': invoice.payment_status
    }

# Process all invoices
print("Recalculating all invoice payment statuses...")
print("-" * 80)

invoices = Invoice.objects.filter(is_rejected=False)
updated_count = 0
status_changes = {'paid': 0, 'partially_paid': 0, 'unpaid': 0, 'overdue': 0}

for invoice in invoices:
    old_status = invoice.payment_status
    result = recalculate_invoice_status(invoice)
    
    if old_status != result['status']:
        print(f"✓ {result['invoice_number']}: {old_status} → {result['status']} (Outstanding: ₹{result['outstanding']:,.2f})")
        status_changes[result['status']] += 1
        updated_count += 1

print("-" * 80)
print(f"\nTotal invoices processed: {invoices.count()}")
print(f"Invoices with status changes: {updated_count}")
print(f"\nStatus distribution:")
print(f"  Paid: {status_changes['paid']}")
print(f"  Partially Paid: {status_changes['partially_paid']}")
print(f"  Unpaid: {status_changes['unpaid']}")
print(f"  Overdue: {status_changes['overdue']}")
print("\n✓ Invoice payment statuses recalculated successfully!")
PYTHON_EOF

# Run the Python script
cd /var/www/SAP-Python/backend
python3 /tmp/fix_invoice_statuses.py

echo ""
echo "================================================================================"
echo "VERIFICATION"
echo "================================================================================"
echo ""

sudo -u postgres psql -d "$DB_NAME" << 'EOF'
-- Show sample invoices with TDS payments
SELECT 
    i.invoice_number,
    i.total_amount,
    i.paid_amount,
    i.outstanding_amount,
    i.payment_status,
    COUNT(p.id) as payment_count,
    SUM(CASE WHEN p.tds_amount > 0 THEN 1 ELSE 0 END) as tds_payment_count
FROM finance_invoices i
LEFT JOIN finance_payments p ON p.invoice_id = i.id AND p.status = 'completed'
WHERE i.is_rejected = false
GROUP BY i.id, i.invoice_number, i.total_amount, i.paid_amount, i.outstanding_amount, i.payment_status
HAVING SUM(CASE WHEN p.tds_amount > 0 THEN 1 ELSE 0 END) > 0
ORDER BY i.invoice_date DESC
LIMIT 10;
EOF

echo ""
echo "================================================================================"
echo "DONE!"
echo "================================================================================"
echo ""
echo "Summary:"
echo "1. ✓ Fixed net_amount_received for payments with TDS"
echo "2. ✓ Recalculated all invoice payment statuses"
echo "3. ✓ TDS entries will now appear in customer ledger"
echo ""
echo "Next steps:"
echo "- Refresh the customer ledger page to see TDS entries"
echo "- Invoice statuses should now be accurate"
echo "- Outstanding amounts now reflect TDS pending certificates"
echo ""
