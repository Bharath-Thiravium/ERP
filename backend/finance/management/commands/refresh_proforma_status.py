from django.core.management.base import BaseCommand
from finance.models import ProformaInvoice
from decimal import Decimal
from django.db import models

class Command(BaseCommand):
    help = 'Refresh payment status for all proforma invoices'

    def handle(self, *args, **options):
        proforma_invoices = ProformaInvoice.objects.all()
        updated_count = 0
        
        for proforma in proforma_invoices:
            # Calculate total payments for this proforma
            total_payments = proforma.payments.filter(status='completed').aggregate(
                total=models.Sum('amount')
            )['total'] or Decimal('0')
            
            old_status = proforma.payment_status
            old_paid = proforma.paid_amount
            old_outstanding = proforma.outstanding_amount
            
            # Update payment amounts
            proforma.paid_amount = total_payments
            proforma_total = Decimal(str(proforma.total_amount)) if proforma.total_amount is not None else Decimal('0')
            proforma.outstanding_amount = proforma_total - total_payments
            
            # Update payment status with fixed logic
            if abs(proforma.outstanding_amount) <= Decimal('0.01'):  # Allow for small rounding differences
                proforma.payment_status = 'paid'
            elif total_payments > Decimal('0'):
                proforma.payment_status = 'partially_paid'
            else:
                proforma.payment_status = 'unpaid'
            
            # Save if anything changed
            if (old_status != proforma.payment_status or 
                old_paid != proforma.paid_amount or 
                old_outstanding != proforma.outstanding_amount):
                
                proforma.save(update_fields=['paid_amount', 'outstanding_amount', 'payment_status'])
                updated_count += 1
                self.stdout.write(f"Updated {proforma.proforma_number}: {old_status} -> {proforma.payment_status}, Paid: ₹{proforma.paid_amount}, Outstanding: ₹{proforma.outstanding_amount}")
        
        self.stdout.write(self.style.SUCCESS(f"\nRefresh completed. Updated {updated_count} proforma invoices."))