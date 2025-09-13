from django.core.management.base import BaseCommand
from finance.models import Quotation, QuotationItem


class Command(BaseCommand):
    help = 'Fix quotations with missing or incorrect item counts'

    def handle(self, *args, **options):
        quotations = Quotation.objects.all()
        fixed_count = 0
        
        for quotation in quotations:
            item_count = quotation.quotation_items.count()
            
            if item_count == 0:
                self.stdout.write(
                    self.style.WARNING(
                        f'Quotation {quotation.quotation_number} has 0 items'
                    )
                )
            else:
                self.stdout.write(
                    f'Quotation {quotation.quotation_number}: {item_count} items'
                )
                
            # Check if any items have null line_total
            null_items = quotation.quotation_items.filter(line_total__isnull=True)
            if null_items.exists():
                self.stdout.write(
                    self.style.WARNING(
                        f'Fixing {null_items.count()} items with null line_total in {quotation.quotation_number}'
                    )
                )
                for item in null_items:
                    item.line_total = item.quantity * item.unit_price
                    item.save(skip_totals_calculation=True)
                    fixed_count += 1
                
                # Recalculate quotation totals
                quotation.calculate_totals()
        
        if fixed_count > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully fixed {fixed_count} quotation items'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS('No items needed fixing')
            )
