from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Document numbering counter reset is disabled to prevent number reuse'

    def add_arguments(self, parser):
        parser.add_argument('--company-id', type=int, help='Company ID to reset counters for')
        parser.add_argument('--company-prefix', type=str, help='Company prefix to reset counters for')
        parser.add_argument('--all', action='store_true', help='Reset counters for all companies')

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.ERROR(
                'Counter reset is disabled in production to prevent document number reuse. '
                'Create a new financial-year configuration for a new sequence.'
            )
        )
