from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from finance.models import Invoice, Payment, InvoiceItem
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Safely delete an invoice and update all related records'

    def add_arguments(self, parser):
        parser.add_argument(
            'invoice_number',
            type=str,
            help='Invoice number to delete (e.g., BKC/009/2526)'
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm deletion without interactive prompt'
        )

    def handle(self, *args, **options):
        invoice_number = options['invoice_number']
        confirm = options['confirm']

        try:
            # Find the invoice
            invoice = Invoice.objects.get(invoice_number=invoice_number)
            
            self.stdout.write(f"\n🔍 Found Invoice: {invoice.invoice_number}")
            self.stdout.write(f"   Customer: {invoice.customer.name}")
            self.stdout.write(f"   Date: {invoice.invoice_date}")
            self.stdout.write(f"   Amount: ₹{invoice.total_amount}")
            self.stdout.write(f"   Status: {invoice.status}")
            self.stdout.write(f"   Payment Status: {invoice.payment_status}")
            
            if invoice.purchase_order:
                self.stdout.write(f"   PO: {invoice.purchase_order.internal_po_number}")
            if invoice.quotation:
                self.stdout.write(f"   Quotation: {invoice.quotation.quotation_number}")

            # Show related records that will be affected
            invoice_items = invoice.invoice_items.all()
            payments = invoice.payments.all()
            
            self.stdout.write(f"\n📋 Related Records:")
            self.stdout.write(f"   Invoice Items: {invoice_items.count()}")
            self.stdout.write(f"   Payment Records: {payments.count()}")
            
            if payments.exists():
                total_payments = sum(p.amount for p in payments)
                self.stdout.write(f"   Total Payments: ₹{total_payments}")

            # Confirm deletion
            if not confirm:
                response = input(f"\n⚠️  Are you sure you want to delete invoice {invoice_number}? (yes/no): ")
                if response.lower() != 'yes':
                    self.stdout.write(self.style.WARNING("❌ Deletion cancelled."))
                    return

            # Perform safe deletion with transaction
            with transaction.atomic():
                self.stdout.write(f"\n🗑️  Deleting invoice {invoice_number}...")
                
                # Store references before deletion
                purchase_order = invoice.purchase_order
                quotation = invoice.quotation
                customer = invoice.customer
                
                # 1. Delete payment records
                if payments.exists():
                    self.stdout.write(f"   🔄 Deleting {payments.count()} payment records...")
                    for payment in payments:
                        self.stdout.write(f"      - Payment {payment.payment_number}: ₹{payment.amount}")
                    payments.delete()
                
                # 2. Delete invoice items
                if invoice_items.exists():
                    self.stdout.write(f"   🔄 Deleting {invoice_items.count()} invoice items...")
                    invoice_items.delete()
                
                # 3. Delete the invoice
                self.stdout.write(f"   🔄 Deleting invoice record...")
                invoice.delete()
                
                # 4. Update related PO balance tracking
                if purchase_order:
                    self.stdout.write(f"   🔄 Updating PO balance tracking: {purchase_order.internal_po_number}")
                    purchase_order.update_balance_tracking()
                    self.stdout.write(f"      - Remaining invoice balance: ₹{purchase_order.remaining_invoice_balance}")
                    self.stdout.write(f"      - Invoice status: {purchase_order.invoice_status}")
                
                # 5. Update related quotation balance tracking
                if quotation:
                    self.stdout.write(f"   🔄 Updating quotation balance tracking: {quotation.quotation_number}")
                    quotation.update_balance_tracking()
                    self.stdout.write(f"      - Remaining invoice balance: ₹{quotation.remaining_invoice_balance}")
                
                # 6. Update customer payment history (recalculate totals)
                self.stdout.write(f"   🔄 Updating customer payment history: {customer.name}")
                
                # Recalculate customer totals
                remaining_invoices = Invoice.objects.filter(customer=customer)
                total_outstanding = sum(inv.outstanding_amount for inv in remaining_invoices)
                total_paid = sum(inv.paid_amount for inv in remaining_invoices)
                
                self.stdout.write(f"      - Customer remaining invoices: {remaining_invoices.count()}")
                self.stdout.write(f"      - Customer total outstanding: ₹{total_outstanding}")
                self.stdout.write(f"      - Customer total paid: ₹{total_paid}")

            self.stdout.write(self.style.SUCCESS(f"\n✅ Invoice {invoice_number} deleted successfully!"))
            self.stdout.write(self.style.SUCCESS("✅ All related records updated."))
            
        except Invoice.DoesNotExist:
            raise CommandError(f"❌ Invoice '{invoice_number}' not found.")
        
        except Exception as e:
            logger.error(f"Error deleting invoice {invoice_number}: {str(e)}")
            raise CommandError(f"❌ Error deleting invoice: {str(e)}")