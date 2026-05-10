"""
Management command to recalculate and fix Purchase Order claimed amounts
"""

from django.core.management.base import BaseCommand
from django.db.models import Sum
from decimal import Decimal
from finance.models import PurchaseOrder


class Command(BaseCommand):
    help = 'Recalculate claimed amounts for all Purchase Orders'

    def add_arguments(self, parser):
        parser.add_argument(
            '--po-number',
            type=str,
            help='Recalculate specific PO by internal PO number',
        )
        parser.add_argument(
            '--company',
            type=str,
            help='Recalculate POs for specific company (company prefix)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        po_number = options.get('po_number')
        company_prefix = options.get('company')
        dry_run = options.get('dry_run')

        # Build queryset
        queryset = PurchaseOrder.objects.all()
        
        if po_number:
            queryset = queryset.filter(internal_po_number=po_number)
            self.stdout.write(f"Filtering by PO number: {po_number}")
        
        if company_prefix:
            queryset = queryset.filter(company__company_prefix=company_prefix)
            self.stdout.write(f"Filtering by company: {company_prefix}")

        total_pos = queryset.count()
        self.stdout.write(f"\nFound {total_pos} Purchase Orders to process")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("\n*** DRY RUN MODE - No changes will be saved ***\n"))

        updated_count = 0
        error_count = 0

        for po in queryset.select_related('company'):
            try:
                # Store old values for comparison
                old_proforma_claimed = po.proforma_claimed_amount
                old_invoice_claimed = po.invoice_claimed_amount
                old_proforma_balance = po.remaining_proforma_balance
                old_invoice_balance = po.remaining_invoice_balance
                old_proforma_status = po.proforma_status
                old_invoice_status = po.invoice_status

                # Recalculate proforma claimed amount
                proforma_total = po.proforma_invoices.aggregate(
                    total=Sum('subtotal')
                )['total'] or Decimal('0')

                # Recalculate invoice claimed amount
                invoice_total = po.invoices.aggregate(
                    total=Sum('total_amount')
                )['total'] or Decimal('0')

                # Calculate remaining balances
                new_proforma_balance = po.subtotal - proforma_total
                new_invoice_balance = po.total_amount - invoice_total

                # Determine statuses
                if new_proforma_balance <= 0:
                    new_proforma_status = 'completed'
                elif proforma_total > 0:
                    new_proforma_status = 'partial'
                else:
                    new_proforma_status = 'not_started'

                if new_invoice_balance <= 0:
                    new_invoice_status = 'completed'
                elif invoice_total > 0:
                    new_invoice_status = 'partial'
                else:
                    new_invoice_status = 'not_started'

                # Check if anything changed
                changed = (
                    old_proforma_claimed != proforma_total or
                    old_invoice_claimed != invoice_total or
                    old_proforma_balance != new_proforma_balance or
                    old_invoice_balance != new_invoice_balance or
                    old_proforma_status != new_proforma_status or
                    old_invoice_status != new_invoice_status
                )

                if changed:
                    self.stdout.write(f"\n{po.internal_po_number} ({po.company.name}):")
                    
                    if old_proforma_claimed != proforma_total:
                        self.stdout.write(f"  Proforma Claimed: {old_proforma_claimed} → {proforma_total}")
                    
                    if old_invoice_claimed != invoice_total:
                        self.stdout.write(f"  Invoice Claimed: {old_invoice_claimed} → {invoice_total}")
                    
                    if old_proforma_balance != new_proforma_balance:
                        self.stdout.write(f"  Proforma Balance: {old_proforma_balance} → {new_proforma_balance}")
                    
                    if old_invoice_balance != new_invoice_balance:
                        self.stdout.write(f"  Invoice Balance: {old_invoice_balance} → {new_invoice_balance}")
                    
                    if old_proforma_status != new_proforma_status:
                        self.stdout.write(f"  Proforma Status: {old_proforma_status} → {new_proforma_status}")
                    
                    if old_invoice_status != new_invoice_status:
                        self.stdout.write(f"  Invoice Status: {old_invoice_status} → {new_invoice_status}")

                    # Calculate claimed percentage for display
                    claimed_pct = float((invoice_total / po.total_amount) * 100) if po.total_amount > 0 else 0
                    self.stdout.write(f"  Claimed Percentage: {claimed_pct:.1f}%")

                    if not dry_run:
                        # Update the PO
                        po.proforma_claimed_amount = proforma_total
                        po.invoice_claimed_amount = invoice_total
                        po.remaining_proforma_balance = new_proforma_balance
                        po.remaining_invoice_balance = new_invoice_balance
                        po.proforma_status = new_proforma_status
                        po.invoice_status = new_invoice_status
                        
                        po.save(update_fields=[
                            'proforma_claimed_amount', 'invoice_claimed_amount',
                            'remaining_proforma_balance', 'remaining_invoice_balance',
                            'proforma_status', 'invoice_status'
                        ])
                        
                        self.stdout.write(self.style.SUCCESS("  ✓ Updated"))
                    else:
                        self.stdout.write(self.style.WARNING("  (Would be updated)"))

                    updated_count += 1

            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(f"\n✗ Error processing {po.internal_po_number}: {str(e)}")
                )

        # Summary
        self.stdout.write("\n" + "="*60)
        self.stdout.write(f"Total POs processed: {total_pos}")
        self.stdout.write(f"POs with changes: {updated_count}")
        self.stdout.write(f"Errors: {error_count}")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("\nDry run completed - no changes were saved"))
            self.stdout.write("Run without --dry-run to apply changes")
        else:
            self.stdout.write(self.style.SUCCESS(f"\n✓ Successfully updated {updated_count} Purchase Orders"))
