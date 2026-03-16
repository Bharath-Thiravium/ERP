from django.core.management.base import BaseCommand
from authentication.models import Service


class Command(BaseCommand):
    help = 'Remove old Athens service (service_type: athens) from database'

    def handle(self, *args, **options):
        try:
            old_service = Service.objects.filter(service_type='athens').first()
            if old_service:
                old_service.delete()
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully removed old Athens service: {old_service.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING('Old Athens service not found in database')
                )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error removing old Athens service: {str(e)}')
            )