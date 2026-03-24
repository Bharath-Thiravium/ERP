"""
Management command to sync all PO statuses with their actual invoice data.
Fixes all 3 known inconsistency types:
  1. status=completed but invoice_status=not_started (no invoices raised)
  2. status=active but invoice_status=completed (fully invoiced)
  3. status=active but invoice_status=partial (partially invoiced)
"""

from django.core.management.base import BaseCommand
from finance.models import PurchaseOrder
from decimal import Decimal


class Command(BaseCommand):
    help = 'Sync all PO statuses based on actual invoice data'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Show changes without applying')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        pos = PurchaseOrder.objects.all().prefetch_related(
            'invoices', 'proforma_invoices', 'po_items'
        )

        fixed = 0
        errors = 0

        for po in pos:
            old_status = po.status
            old_invoice_status = po.invoice_status

            # Fix Case 1: status=completed but no invoices exist — reset remaining balances first
            # These POs had status manually set to 'completed' bypassing update_balance_tracking
            non_rejected_invoices = po.invoices.filter(is_rejected=False).count()
            if po.status == 'completed' and non_rejected_invoices == 0:
                if not dry_run:
                    # Reset balances so update_balance_tracking recalculates correctly
                    po.remaining_proforma_balance = po.subtotal
                    po.remaining_invoice_balance = po.total_amount
                    po.save(update_fields=['remaining_proforma_balance', 'remaining_invoice_balance'])

            try:
                if not dry_run:
                    po.update_balance_tracking()
                    po.refresh_from_db()
                    new_status = po.status
                    new_invoice_status = po.invoice_status
                else:
                    # Simulate what update_balance_tracking would set
                    invoice_total = sum(
                        inv.total_amount for inv in po.invoices.filter(is_rejected=False)
                    ) or Decimal('0')
                    if invoice_total == 0:
                        new_status = 'active'
                        new_invoice_status = 'not_started'
                    elif (po.total_amount - invoice_total) < Decimal('5.00'):
                        new_status = 'completed'
                        new_invoice_status = 'completed'
                    else:
                        new_status = 'partially_completed'
                        new_invoice_status = 'partial'

                if old_status != new_status or old_invoice_status != new_invoice_status:
                    self.stdout.write(
                        f'{po.internal_po_number}: status {old_status}→{new_status}, '
                        f'invoice_status {old_invoice_status}→{new_invoice_status}'
                    )
                    fixed += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(f'{po.internal_po_number}: ERROR — {e}'))
                errors += 1

        prefix = 'DRY RUN — Would fix' if dry_run else 'Fixed'
        self.stdout.write(self.style.SUCCESS(
            f'\n✅ {prefix} {fixed} POs. Errors: {errors}. Total: {pos.count()}'
        ))
