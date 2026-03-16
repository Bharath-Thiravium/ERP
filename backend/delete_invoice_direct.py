#!/usr/bin/env python3
"""
Direct Database Invoice Deletion Script
Connects directly to PostgreSQL to delete invoice BKC/009/2526
"""

import psycopg2
from decimal import Decimal
import sys

# Database connection parameters
DB_CONFIG = {
    'host': '127.0.0.1',
    'port': '5432',
    'database': 'modernsap',
    'user': 'postgres',
    'password': 'mango'
}

def connect_to_db():
    """Connect to PostgreSQL database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return None

def delete_invoice_safely(invoice_number):
    """Safely delete an invoice and update all related records"""
    
    conn = connect_to_db()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # 1. Find the invoice
        cursor.execute("""
            SELECT i.id, i.invoice_number, i.total_amount, i.status, i.payment_status,
                   c.name as customer_name, i.purchase_order_id, i.quotation_id
            FROM finance_invoices i
            JOIN finance_customer c ON i.customer_id = c.id
            WHERE i.invoice_number = %s
        """, (invoice_number,))
        
        invoice_data = cursor.fetchone()
        if not invoice_data:
            print(f"❌ Invoice '{invoice_number}' not found.")
            return False
        
        invoice_id, inv_number, total_amount, status, payment_status, customer_name, po_id, quotation_id = invoice_data
        
        print(f"\n🔍 Found Invoice: {inv_number}")
        print(f"   Customer: {customer_name}")
        print(f"   Amount: ₹{total_amount}")
        print(f"   Status: {status}")
        print(f"   Payment Status: {payment_status}")
        
        # 2. Check related records
        cursor.execute("SELECT COUNT(*) FROM finance_invoice_items WHERE invoice_id = %s", (invoice_id,))
        items_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM finance_payments WHERE invoice_id = %s", (invoice_id,))
        payments_count, total_payments = cursor.fetchone()
        
        print(f"\n📋 Related Records:")
        print(f"   Invoice Items: {items_count}")
        print(f"   Payment Records: {payments_count}")
        if total_payments:
            print(f"   Total Payments: ₹{total_payments}")
        
        # 3. Confirm deletion
        response = input(f"\n⚠️  Are you sure you want to delete invoice {invoice_number}? (yes/no): ")
        if response.lower() != 'yes':
            print("❌ Deletion cancelled.")
            return False
        
        # 4. Start transaction
        cursor.execute("BEGIN")
        
        print(f"\n🗑️  Deleting invoice {invoice_number}...")
        
        # 5. Delete payment records
        if payments_count > 0:
            print(f"   🔄 Deleting {payments_count} payment records...")
            cursor.execute("DELETE FROM finance_payments WHERE invoice_id = %s", (invoice_id,))
        
        # 6. Delete invoice items
        if items_count > 0:
            print(f"   🔄 Deleting {items_count} invoice items...")
            cursor.execute("DELETE FROM finance_invoice_items WHERE invoice_id = %s", (invoice_id,))
        
        # 7. Delete the invoice
        print(f"   🔄 Deleting invoice record...")
        cursor.execute("DELETE FROM finance_invoices WHERE id = %s", (invoice_id,))
        
        # 8. Update PO balance tracking if exists
        if po_id:
            print(f"   🔄 Updating PO balance tracking...")
            # Recalculate PO invoice claimed amount
            cursor.execute("""
                UPDATE finance_purchase_orders 
                SET invoice_claimed_amount = COALESCE((
                    SELECT SUM(total_amount) 
                    FROM finance_invoices 
                    WHERE purchase_order_id = %s AND is_rejected = FALSE
                ), 0),
                remaining_invoice_balance = total_amount - COALESCE((
                    SELECT SUM(total_amount) 
                    FROM finance_invoices 
                    WHERE purchase_order_id = %s AND is_rejected = FALSE
                ), 0)
                WHERE id = %s
            """, (po_id, po_id, po_id))
            
            # Update PO status
            cursor.execute("""
                UPDATE finance_purchase_orders 
                SET invoice_status = CASE 
                    WHEN remaining_invoice_balance <= 0 THEN 'completed'
                    WHEN invoice_claimed_amount > 0 THEN 'partial'
                    ELSE 'not_started'
                END
                WHERE id = %s
            """, (po_id,))
        
        # 9. Update quotation balance tracking if exists
        if quotation_id:
            print(f"   🔄 Updating quotation balance tracking...")
            cursor.execute("""
                UPDATE finance_quotations 
                SET invoice_claimed_amount = COALESCE((
                    SELECT SUM(total_amount) 
                    FROM finance_invoices 
                    WHERE quotation_id = %s AND is_rejected = FALSE
                ), 0),
                remaining_invoice_balance = total_amount - COALESCE((
                    SELECT SUM(total_amount) 
                    FROM finance_invoices 
                    WHERE quotation_id = %s AND is_rejected = FALSE
                ), 0)
                WHERE id = %s
            """, (quotation_id, quotation_id, quotation_id))
        
        # 10. Commit transaction
        cursor.execute("COMMIT")
        
        print(f"\n✅ Invoice {invoice_number} deleted successfully!")
        print("✅ All related records updated.")
        
        return True
        
    except Exception as e:
        cursor.execute("ROLLBACK")
        print(f"❌ Error deleting invoice: {e}")
        return False
    
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    # Delete the specific invoice
    invoice_number = "BKC/009/2526"
    success = delete_invoice_safely(invoice_number)
    
    if success:
        print(f"\n🎉 Successfully deleted invoice {invoice_number}")
    else:
        print(f"\n💥 Failed to delete invoice {invoice_number}")
        sys.exit(1)