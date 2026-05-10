"""
Django management command to update payment with TDS information
"""
from django.core.management.base import BaseCommand, CommandError
from finance.models import Payment
from decimal import Decimal


class Command(BaseCommand):
    help = 'Update payment with TDS information'

    def add_arguments(self, parser):
        parser.add_argument('payment_number', type=str, help='Payment number (e.g., PAY-25-000042)')
        parser.add_argument('gross_amount', type=float, help='Gross amount before TDS (e.g., 76800.00)')
        parser.add_argument('tds_rate', type=float, help='TDS rate percentage (e.g., 10.00)')
        parser.add_argument('tds_section', type=str, nargs='?', default='194C', help='TDS section (default: 194C)')
        parser.add_argument(
            '--certificate-received',
            action='store_true',
            help='Mark TDS certificate as received',
        )
        parser.add_argument(
            '--form16a-number',
            type=str,
            help='Form 16A certificate number',
        )

    def handle(self, *args, **options):
        payment_number = options['payment_number']
        gross_amount = options['gross_amount']
        tds_rate = options['tds_rate']
        tds_section = options['tds_section']
        certificate_received = options['certificate_received']
        form16a_number = options.get('form16a_number')
        
        try:
            payment = Payment.objects.get(payment_number=payment_number)
        except Payment.DoesNotExist:
            raise CommandError(f'Payment "{payment_number}" does not exist')
        
        # Calculate TDS amount and net amount
        gross = Decimal(str(gross_amount))
        rate = Decimal(str(tds_rate))
        tds_amount = (gross * rate) / Decimal('100')
        net_amount = gross - tds_amount
        
        # Store original values for comparison
        original_amount = payment.amount
        original_tds = payment.tds_amount
        
        # Update payment with TDS information
        payment.amount = gross
        payment.tds_amount = tds_amount
        payment.tds_rate = rate
        payment.tds_section = tds_section
        payment.tds_applicable = True
        payment.net_amount_received = net_amount
        
        if certificate_received:
            payment.tds_certificate_received = True
        
        if form16a_number:
            payment.form16a_number = form16a_number
        
        payment.save()
        
        self.stdout.write(self.style.SUCCESS(f'\n✓ Successfully updated {payment_number}'))
        self.stdout.write(f"\nChanges:")
        self.stdout.write(f"  Original Amount: ₹{original_amount} → ₹{gross}")
        self.stdout.write(f"  Original TDS: ₹{original_tds} → ₹{tds_amount}")
        self.stdout.write(f"  TDS Rate: {rate}%")
        self.stdout.write(f"  TDS Section: {tds_section}")
        self.stdout.write(f"  Net Amount Received: ₹{net_amount}")
        
        if certificate_received:
            self.stdout.write(f"  TDS Certificate: Marked as received")
        
        if form16a_number:
            self.stdout.write(f"  Form 16A Number: {form16a_number}")
        
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write("VERIFICATION")
        self.stdout.write("=" * 80)
        self.stdout.write(f"""
The payment has been updated. You should now see TWO entries in the customer ledger:

1. Payment Entry:
   - Document: {payment_number}
   - Credit: ₹{net_amount}
   - Description: Payment received - {payment.payment_method}

2. TDS Entry:
   - Document: {payment_number}-TDS
   - Credit: ₹{tds_amount}
   - Description: TDS deducted - {tds_section} @ {rate}%
   - Status: {'Completed' if certificate_received else 'Pending'}
        """)
