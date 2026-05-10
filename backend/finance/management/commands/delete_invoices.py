from django.core.management.base import BaseCommand
from finance.models import Invoice
from decimal import Decimal


class Command(BaseCommand):
    help = 'Delete specific invoice entries from the database'

    def handle(self, *args, **options):
        # Invoice numbers to delete
        invoice_numbers = [
            'BKC/001/2627',
            'BKC/02O/2526',
            'BKC/020/2526',
            'INV-25-002630',
            'INV-25-002629',
        ]

        deleted_count = 0
        not_found = []

        for invoice_number in invoice_numbers:
            try:
                # Try to find and delete the invoice
                invoices = Invoice.objects.filter(invoice_number=invoice_number)
                
                if invoices.exists():
                    count = invoices.count()
                    invoice = invoices.first()
                    
                    self.stdout.write(
                        self.style.WARNING(
                            f'Deleting invoice: {invoice_number} '
                            f'(Customer: {invoice.customer.name}, '
                            f'Amount: ₹{invoice.total_amount})'
                        )
                    )
                    
                    invoices.delete()
                    deleted_count += count
                    
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Deleted {count} invoice(s) with number: {invoice_number}')
                    )
                else:
                    not_found.append(invoice_number)
                    self.stdout.write(
                        self.style.WARNING(f'✗ Invoice not found: {invoice_number}')
                    )
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error deleting invoice {invoice_number}: {str(e)}')
                )

        # Summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS(f'Total invoices deleted: {deleted_count}'))
        
        if not_found:
            self.stdout.write(self.style.WARNING(f'Invoices not found: {len(not_found)}'))
            for inv_num in not_found:
                self.stdout.write(f'  - {inv_num}')
        
        self.stdout.write('='*60)
