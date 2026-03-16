"""
Management command to update existing invoices to use the new status system
"""

from django.core.management.base import BaseCommand
from finance.models import Invoice


class Command(BaseCommand):
    help = 'Update existing invoices to use the new status system (active, partially_completed, completed)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Find invoices with old status values
        invoices_to_update = Invoice.objects.exclude(
            status__in=['active', 'partially_completed', 'completed', 'rejected']
        )

        if not invoices_to_update.exists():
            self.stdout.write(
                self.style.SUCCESS('✅ All invoices already have correct status values')
            )
            return

        self.stdout.write(f'Found {invoices_to_update.count()} invoices with old status values')

        status_mapping = {
            'draft': 'active',
            'sent': 'active', 
            'paid': 'completed',
            'partially_paid': 'partially_completed',
            'overdue': 'partially_completed',
            'cancelled': 'completed',
            'rejected': 'rejected',
        }

        updated_count = 0
        for invoice in invoices_to_update:
            old_status = invoice.status
            new_status = status_mapping.get(old_status, 'active')
            
            self.stdout.write(f'Invoice {invoice.invoice_number}: {old_status} → {new_status}')
            
            if not dry_run:
                # Use bulk update to avoid triggering save() method recursion
                Invoice.objects.filter(id=invoice.id).update(status=new_status)
                updated_count += 1

        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'DRY RUN: Would update {invoices_to_update.count()} invoices')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'✅ Updated {updated_count} invoices to new status system')
            )