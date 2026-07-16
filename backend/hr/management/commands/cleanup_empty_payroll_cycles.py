from django.core.management.base import BaseCommand
from django.db.models import Count

from hr.models import PayrollCycle


class Command(BaseCommand):
    help = 'Delete payroll cycles that no longer have any payslips.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--company-id',
            type=int,
            help='Limit cleanup to one company id.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show matching payroll cycles without deleting them.',
        )

    def handle(self, *args, **options):
        cycles = PayrollCycle.objects.annotate(payslip_count=Count('payslips')).filter(payslip_count=0)
        if options.get('company_id'):
            cycles = cycles.filter(company_id=options['company_id'])

        count = cycles.count()
        if options.get('dry_run'):
            for cycle in cycles.order_by('company_id', 'start_date', 'id'):
                self.stdout.write(
                    f'Would delete payroll cycle {cycle.id}: {cycle.name} '
                    f'({cycle.start_date} to {cycle.end_date}) company={cycle.company_id}'
                )
            self.stdout.write(self.style.WARNING(f'{count} empty payroll cycle(s) found.'))
            return

        deleted, details = cycles.delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {count} empty payroll cycle(s).'))
        self.stdout.write(f'Database rows deleted: {deleted}')
        if details:
            for model_label, model_count in sorted(details.items()):
                self.stdout.write(f'  {model_label}: {model_count}')
