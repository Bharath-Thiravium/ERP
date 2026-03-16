"""
Management command to update existing Purchase Orders to use the new status system
"""

from django.core.management.base import BaseCommand
from finance.models import PurchaseOrder


class Command(BaseCommand):
    help = 'Update existing Purchase Orders to use the new status system (active, partially_completed, completed)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Find POs with old status values
        pos_to_update = PurchaseOrder.objects.exclude(
            status__in=['active', 'partially_completed', 'completed']
        )

        if not pos_to_update.exists():
            self.stdout.write(
                self.style.SUCCESS('✅ All Purchase Orders already have correct status values')
            )
            return

        self.stdout.write(f'Found {pos_to_update.count()} Purchase Orders with old status values')

        status_mapping = {
            'draft': 'active',
            'confirmed': 'active',
            'in_progress': 'partially_completed',
            'cancelled': 'completed',
        }

        updated_count = 0
        for po in pos_to_update:
            old_status = po.status
            new_status = status_mapping.get(old_status, 'active')
            
            self.stdout.write(f'PO {po.internal_po_number}: {old_status} → {new_status}')
            
            if not dry_run:
                # Use bulk update to avoid triggering save() method issues
                PurchaseOrder.objects.filter(id=po.id).update(status=new_status)
                updated_count += 1

        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'DRY RUN: Would update {pos_to_update.count()} Purchase Orders')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'✅ Updated {updated_count} Purchase Orders to new status system')
            )