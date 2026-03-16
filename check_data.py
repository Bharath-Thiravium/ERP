#!/usr/bin/env python3
"""
Quick database check to verify relationships
"""

import os
import sys
import django

backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_path)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from finance.models import Invoice, PurchaseOrder, Customer

def check_data():
    print("=== Data Check ===")
    print(f"Total Invoices: {Invoice.objects.count()}")
    print(f"Total Purchase Orders: {PurchaseOrder.objects.count()}")
    print(f"Total Customers: {Customer.objects.count()}")
    
    print("\n=== Sample Invoice with PO ===")
    invoice_with_po = Invoice.objects.filter(purchase_order__isnull=False).first()
    if invoice_with_po:
        print(f"Invoice: {invoice_with_po.invoice_number}")
        print(f"PO: {invoice_with_po.purchase_order.internal_po_number}")
    else:
        print("No invoices with purchase orders found")
    
    print("\n=== Sample PO with Customer ===")
    po_with_customer = PurchaseOrder.objects.filter(customer__isnull=False).first()
    if po_with_customer:
        print(f"PO: {po_with_customer.internal_po_number}")
        print(f"Customer: {po_with_customer.customer.name}")
        print(f"Customer Email: {po_with_customer.customer.email}")
        print(f"Customer Phone: {po_with_customer.customer.phone}")

if __name__ == "__main__":
    check_data()