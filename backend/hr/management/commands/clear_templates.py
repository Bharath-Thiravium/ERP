from django.core.management.base import BaseCommand
from hr.form_automation_models import ComplianceFormTemplate, MonthlyComplianceForm, EmployeeFormEntry

class Command(BaseCommand):
    help = 'Clear all compliance templates and forms'

    def handle(self, *args, **options):
        # Delete all employee form entries
        EmployeeFormEntry.objects.all().delete()
        self.stdout.write('Deleted all employee form entries')
        
        # Delete all monthly forms
        MonthlyComplianceForm.objects.all().delete()
        self.stdout.write('Deleted all monthly forms')
        
        # Delete all templates
        ComplianceFormTemplate.objects.all().delete()
        self.stdout.write('Deleted all compliance templates')
        
        self.stdout.write(
            self.style.SUCCESS('Successfully cleared all templates and forms')
        )