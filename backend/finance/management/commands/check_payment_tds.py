"""
Django management command to check TDS information in payments
"""
from django.core.management.base import BaseCommand
from finance.models import Payment
from decimal import Decimal


class Command(BaseCommand):
    help = 'Check payments for TDS information'

    def handle(self, *args, **options):
        self.stdout.write("=" * 80)
        self.stdout.write("CHECKING PAYMENTS FOR TDS INFORMATION")
        self.stdout.write("=" * 80)
        
        # Get all completed payments
        payments = Payment.objects.filter(status='completed').select_related('invoice', 'customer')
        
        total_payments = payments.count()
        payments_with_tds = payments.filter(tds_amount__gt=0).count()
        payments_without_tds = total_payments - payments_with_tds
        
        self.stdout.write(f"\nTotal Completed Payments: {total_payments}")
        self.stdout.write(f"Payments WITH TDS recorded: {payments_with_tds}")
        self.stdout.write(f"Payments WITHOUT TDS recorded: {payments_without_tds}")
        self.stdout.write("")
        
        # Show sample payments without TDS
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write("SAMPLE PAYMENTS WITHOUT TDS (First 10)")
        self.stdout.write("=" * 80)
        
        no_tds_payments = payments.filter(tds_amount=0).order_by('-payment_date')[:10]
        for payment in no_tds_payments:
            self.stdout.write(f"\nPayment Number: {payment.payment_number}")
            self.stdout.write(f"  Customer: {payment.customer.name if payment.customer else 'N/A'}")
            self.stdout.write(f"  Date: {payment.payment_date}")
            self.stdout.write(f"  Amount: ₹{payment.amount}")
            self.stdout.write(f"  Net Amount Received: ₹{payment.net_amount_received or payment.amount}")
            self.stdout.write(f"  TDS Amount: ₹{payment.tds_amount}")
            self.stdout.write(f"  TDS Applicable: {payment.tds_applicable}")
            self.stdout.write(f"  TDS Rate: {payment.tds_rate}%")
            self.stdout.write(f"  TDS Section: {payment.tds_section or 'Not specified'}")
            
            # Check if linked invoice has TDS
            if payment.invoice:
                self.stdout.write(f"  Linked Invoice: {payment.invoice.invoice_number}")
                self.stdout.write(f"  Invoice TDS Applicable: {payment.invoice.tds_applicable}")
                self.stdout.write(f"  Invoice TDS Rate: {payment.invoice.tds_rate}%")
        
        # Show sample payments with TDS
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write("SAMPLE PAYMENTS WITH TDS (First 10)")
        self.stdout.write("=" * 80)
        
        with_tds_payments = payments.filter(tds_amount__gt=0).order_by('-payment_date')[:10]
        if with_tds_payments.exists():
            for payment in with_tds_payments:
                self.stdout.write(f"\nPayment Number: {payment.payment_number}")
                self.stdout.write(f"  Customer: {payment.customer.name if payment.customer else 'N/A'}")
                self.stdout.write(f"  Date: {payment.payment_date}")
                self.stdout.write(f"  Gross Amount: ₹{payment.amount}")
                self.stdout.write(f"  TDS Amount: ₹{payment.tds_amount}")
                self.stdout.write(f"  Net Amount Received: ₹{payment.net_amount_received}")
                self.stdout.write(f"  TDS Rate: {payment.tds_rate}%")
                self.stdout.write(f"  TDS Section: {payment.tds_section}")
                self.stdout.write(f"  Certificate Received: {payment.tds_certificate_received}")
        else:
            self.stdout.write("\nNo payments with TDS found.")
        
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write("RECOMMENDATIONS")
        self.stdout.write("=" * 80)
        self.stdout.write("""
If payments should have TDS but don't show TDS amounts:
1. Check if TDS was deducted when payment was received
2. Update payment records with correct TDS information
3. Ensure future payments capture TDS details during creation

To update a payment with TDS information:
    python manage.py update_payment_tds <payment_number> <gross_amount> <tds_rate> <tds_section>

Example:
    python manage.py update_payment_tds PAY-25-000042 76800.00 10.00 194C
        """)
        
        self.stdout.write(self.style.SUCCESS('\n✓ Diagnostic complete'))
