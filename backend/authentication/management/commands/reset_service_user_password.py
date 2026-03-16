from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from authentication.models import CompanyServiceUser

class Command(BaseCommand):
    help = 'Reset password for service users'

    def add_arguments(self, parser):
        parser.add_argument('unique_service_id', type=str, help='Unique service ID')
        parser.add_argument('new_password', type=str, help='New password')

    def handle(self, *args, **options):
        unique_service_id = options['unique_service_id']
        new_password = options['new_password']
        
        try:
            user = CompanyServiceUser.objects.get(unique_service_id=unique_service_id)
            user.password = make_password(new_password)
            user.must_change_password = False
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Password reset for {unique_service_id}'))
        except CompanyServiceUser.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User {unique_service_id} not found'))
