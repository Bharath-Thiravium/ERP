"""
Management command to fix Purchase Order balance tracking and status for existing POs
"""

from django.core.management.base import BaseCommand
from finance.models import PurchaseOrder
from decimal import Decimal


class Command(BaseCommand):
    help = 'Fix balance tracking and status for existing Purchase Orders'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be fixed without making changes',
        )
        parser.add_argument(
            '--fix-status',
            action='store_true',
            help='Also fix PO status (set draft POs with quotations to active)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        fix_status = options['fix_status']
        
        # Find POs with incorrect balance tracking
        pos_to_fix = PurchaseOrder.objects.filter(
            remaining_proforma_balance=0,
            remaining_invoice_balance=0,
            proforma_claimed_amount=0,
            invoice_claimed_amount=0
        ).exclude(subtotal=0)

        # Find POs with incorrect status (draft but created from quotation)
        pos_status_to_fix = []
        if fix_status:
            pos_status_to_fix = PurchaseOrder.objects.filter(
                status='draft',
                quotation__isnull=False
            )

        if not pos_to_fix.exists() and not pos_status_to_fix:
            self.stdout.write(
                self.style.SUCCESS('✅ All Purchase Orders have correct balance tracking and status')
            )
            return

        if pos_to_fix.exists():
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

        if pos_status_to_fix:
            self.stdout.write(f'Found {len(pos_status_to_fix)} POs with incorrect status (draft but from quotation)')

            for po in pos_status_to_fix:
                self.stdout.write(f'PO: {po.internal_po_number} (from quotation {po.quotation.quotation_number})')
                self.stdout.write(f'  Current status: {po.status}')
                
                if not dry_run:
                    po.status = 'active'
                    po.save(update_fields=['status'])
                    self.stdout.write(f'  Fixed status: active')
                else:
                    self.stdout.write(f'  Would fix status: active')

        if dry_run:
            total_fixes = pos_to_fix.count() + len(pos_status_to_fix)
            self.stdout.write(
                self.style.WARNING(f'DRY RUN: Would fix {total_fixes} Purchase Orders')
            )
        else:
            balance_fixes = pos_to_fix.count()
            status_fixes = len(pos_status_to_fix)
            self.stdout.write(
                self.style.SUCCESS(f'✅ Fixed balance tracking for {balance_fixes} POs and status for {status_fixes} POs')
            )
