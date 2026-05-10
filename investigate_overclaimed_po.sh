#!/bin/bash

# Investigate over-claimed PO

cd "$(dirname "$0")/backend"
source venv/bin/activate

echo "=========================================="
echo "Investigating Over-Claimed PO"
echo "=========================================="
echo ""

python manage.py shell << 'EOF'
from finance.models import PurchaseOrder, Invoice, ProformaInvoice
from decimal import Decimal

# Find the PO
po = PurchaseOrder.objects.filter(internal_po_number__icontains='PGEL/24-25/200').first()

if po:
    print(f"PO Found: {po.internal_po_number}")
    print(f"Company: {po.company.name}")
    print(f"Customer: {po.customer.name}")
    print(f"\n" + "="*60)
    print("PO DETAILS")
    print("="*60)
    print(f"Total PO Value: ₹{po.total_amount:,.2f}")
    print(f"Subtotal: ₹{po.subtotal:,.2f}")
    print(f"Total Tax: ₹{po.total_tax:,.2f}")
    print(f"Status: {po.status}")
    
    print(f"\n" + "="*60)
    print("CLAIMING SUMMARY")
    print("="*60)
    print(f"Proforma Claimed: ₹{po.proforma_claimed_amount:,.2f}")
    print(f"Invoice Claimed: ₹{po.invoice_claimed_amount:,.2f}")
    print(f"Total Claimed: ₹{(po.proforma_claimed_amount + po.invoice_claimed_amount):,.2f}")
    print(f"Balance Remaining: ₹{po.remaining_invoice_balance:,.2f}")
    
    if po.total_amount > 0:
        claimed_pct = float((po.invoice_claimed_amount / po.total_amount) * 100)
        over_claim = po.invoice_claimed_amount - po.total_amount
        print(f"Claimed Percentage: {claimed_pct:.2f}%")
        if over_claim > 0:
            print(f"⚠️  OVER-CLAIMED BY: ₹{over_claim:,.2f}")
    
    # Get all invoices
    invoices = po.invoices.all().order_by('invoice_date')
    proformas = po.proforma_invoices.all().order_by('proforma_date')
    
    print(f"\n" + "="*60)
    print(f"PROFORMA INVOICES ({proformas.count()})")
    print("="*60)
    
    if proformas.exists():
        proforma_total = Decimal('0')
        for pf in proformas:
            status_flag = ""
            if hasattr(pf, 'is_rejected') and pf.is_rejected:
                status_flag = " [REJECTED]"
            print(f"\n  {pf.proforma_number}{status_flag}")
            print(f"    Date: {pf.proforma_date}")
            print(f"    Subtotal: ₹{pf.subtotal:,.2f}")
            print(f"    Total: ₹{pf.total_amount:,.2f}")
            print(f"    Status: {pf.status if hasattr(pf, 'status') else 'N/A'}")
            if not (hasattr(pf, 'is_rejected') and pf.is_rejected):
                proforma_total += pf.subtotal
        
        print(f"\n  Total Proforma Claimed: ₹{proforma_total:,.2f}")
        print(f"  PO Proforma Claimed: ₹{po.proforma_claimed_amount:,.2f}")
        if proforma_total != po.proforma_claimed_amount:
            print(f"  ⚠️  MISMATCH: Difference of ₹{abs(proforma_total - po.proforma_claimed_amount):,.2f}")
    else:
        print("  No proforma invoices found")
    
    print(f"\n" + "="*60)
    print(f"TAX INVOICES ({invoices.count()})")
    print("="*60)
    
    if invoices.exists():
        invoice_total = Decimal('0')
        for inv in invoices:
            status_flag = ""
            if hasattr(inv, 'is_rejected') and inv.is_rejected:
                status_flag = " [REJECTED]"
            print(f"\n  {inv.invoice_number}{status_flag}")
            print(f"    Date: {inv.invoice_date}")
            print(f"    Subtotal: ₹{inv.subtotal:,.2f}")
            print(f"    Total: ₹{inv.total_amount:,.2f}")
            print(f"    Payment Status: {inv.payment_status}")
            if hasattr(inv, 'is_rejected'):
                print(f"    Is Rejected: {inv.is_rejected}")
            
            # Show items
            items = inv.invoice_items.all()
            if items.exists():
                print(f"    Items:")
                for item in items:
                    print(f"      - {item.product_name}: {item.quantity} x ₹{item.unit_price:,.2f} = ₹{item.line_total:,.2f}")
            
            if not (hasattr(inv, 'is_rejected') and inv.is_rejected):
                invoice_total += inv.total_amount
        
        print(f"\n  Total Invoice Claimed: ₹{invoice_total:,.2f}")
        print(f"  PO Invoice Claimed: ₹{po.invoice_claimed_amount:,.2f}")
        if invoice_total != po.invoice_claimed_amount:
            print(f"  ⚠️  MISMATCH: Difference of ₹{abs(invoice_total - po.invoice_claimed_amount):,.2f}")
    else:
        print("  No tax invoices found")
    
    # Analysis
    print(f"\n" + "="*60)
    print("ANALYSIS")
    print("="*60)
    
    total_claimed = po.proforma_claimed_amount + po.invoice_claimed_amount
    over_claim = total_claimed - po.total_amount
    
    if over_claim > 0:
        print(f"\n⚠️  PO IS OVER-CLAIMED BY ₹{over_claim:,.2f}")
        print(f"\nPossible Causes:")
        print(f"  1. Tax calculation differences between PO and invoices")
        print(f"  2. Price changes after PO creation")
        print(f"  3. Rejected invoices not freed properly")
        print(f"  4. Duplicate invoices")
        print(f"  5. Manual invoice creation with wrong amounts")
        
        print(f"\nRecommended Actions:")
        print(f"  1. Review all invoices above for accuracy")
        print(f"  2. Check if any invoices should be rejected")
        print(f"  3. Verify tax calculations match PO")
        print(f"  4. Consider creating a credit note for ₹{over_claim:,.2f}")
        print(f"  5. Or amend the PO to increase total by ₹{over_claim:,.2f}")
    else:
        print(f"\n✓ PO claiming is within limits")
    
    # Check for rejected invoices
    rejected_invoices = invoices.filter(is_rejected=True) if hasattr(Invoice, 'is_rejected') else []
    if rejected_invoices:
        print(f"\n⚠️  Found {len(rejected_invoices)} rejected invoice(s)")
        print(f"   These should not count towards claimed amount")

else:
    print("❌ PO not found!")

EOF

echo ""
echo "=========================================="
echo "Investigation completed!"
echo "=========================================="
