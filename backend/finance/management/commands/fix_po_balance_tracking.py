"""
Management command to fix Purchase Order balance tracking for existing POs
"""

from django.core.management.base import BaseCommand
from finance.models import PurchaseOrder
from decimal import Decimal


class Command(BaseCommand):
    help = 'Fix balance tracking for existing Purchase Orders'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be fixed without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Find POs with incorrect balance tracking
        pos_to_fix = PurchaseOrder.objects.filter(
            remaining_proforma_balance=0,
            remaining_invoice_balance=0,
            proforma_claimed_amount=0,
            invoice_claimed_amount=0
        ).exclude(subtotal=0)

        if not pos_to_fix.exists():
            self.stdout.write(
                self.style.SUCCESS('✅ All Purchase Orders have correct balance tracking')
            )
            return

        self.stdout.write(f'Found {pos_to_fix.count()} POs with incorrect balance tracking')

        for po in pos_to_fix:
            self.stdout.write(f'PO: {po.internal_po_number}')
            self.stdout.write(f'  Current - Proforma Balance: ₹{po.remaining_proforma_balance}, Invoice Balance: ₹{po.remaining_invoice_balance}')
            
            if not dry_run:
                # Update balance tracking
                po.remaining_proforma_balance = po.subtotal
                po.remaining_invoice_balance = po.total_amount
                po.save(update_fields=['remaining_proforma_balance', 'remaining_invoice_balance'])
                
                # Refresh from database
                po.refresh_from_db()
                self.stdout.write(f'  Fixed - Proforma Balance: ₹{po.remaining_proforma_balance}, Invoice Balance: ₹{po.remaining_invoice_balance}')
            else:
                self.stdout.write(f'  Would fix - Proforma Balance: ₹{po.subtotal}, Invoice Balance: ₹{po.total_amount}')

        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'DRY RUN: Would fix {pos_to_fix.count()} Purchase Orders')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'✅ Fixed balance tracking for {pos_to_fix.count()} Purchase Orders')
            )
