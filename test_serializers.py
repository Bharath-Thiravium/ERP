#!/usr/bin/env python3
"""
Test script to verify serializer implementations without running the full app
Run this from the backend directory: python ../test_serializers.py
"""

import os
import sys
import django

# Add the backend directory to Python path
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_path)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from finance.models import Invoice, PurchaseOrder
from finance.serializers import InvoiceListSerializer, PurchaseOrderListSerializer

def test_invoice_serializer():
    print("=== Testing Invoice List Serializer ===")
    invoices = Invoice.objects.select_related('purchase_order').all()[:3]
    
    if not invoices:
        print("No invoices found in database")
        return
    
    serializer = InvoiceListSerializer(invoices, many=True)
    
    for i, invoice_data in enumerate(serializer.data):
        print(f"\nInvoice {i+1}:")
        print(f"  ID: {invoice_data.get('id')}")
        print(f"  Invoice Number: {invoice_data.get('invoice_number')}")
        print(f"  Purchase Order: {invoice_data.get('purchase_order')}")
        print(f"  Customer: {invoice_data.get('customer')}")
        print(f"  Total Amount: {invoice_data.get('total_amount')}")

def test_purchase_order_serializer():
    print("\n=== Testing Purchase Order List Serializer ===")
    pos = PurchaseOrder.objects.select_related('customer').all()[:3]
    
    if not pos:
        print("No purchase orders found in database")
        return
    
    serializer = PurchaseOrderListSerializer(pos, many=True)
    
    for i, po_data in enumerate(serializer.data):
        print(f"\nPurchase Order {i+1}:")
        print(f"  ID: {po_data.get('id')}")
        print(f"  PO Number: {po_data.get('internal_po_number')}")
        print(f"  Customer: {po_data.get('customer')}")
        print(f"  Customer Display Name: {po_data.get('customer_display_name')}")
        print(f"  Customer Email: {po_data.get('customer_email')}")
        print(f"  Customer Phone: {po_data.get('customer_phone')}")
        print(f"  Total Amount: {po_data.get('total_amount')}")

if __name__ == "__main__":
    try:
        test_invoice_serializer()
        test_purchase_order_serializer()
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure you're running this from the project root and Django is properly configured")