from django.core.management.base import BaseCommand
from hr.models import JobApplication
from hr.ai_scoring import calculate_ai_score


class Command(BaseCommand):
    help = 'Update AI scores for existing job applications'

    def handle(self, *args, **options):
        applications = JobApplication.objects.filter(ai_score=0)
        updated_count = 0
        
        self.stdout.write(f'Found {applications.count()} applications without AI scores')
        
        for application in applications:
            try:
                ai_score, skill_match, screening_notes = calculate_ai_score(application)
                application.ai_score = ai_score
                application.skill_match_percentage = skill_match
                application.ai_screening_notes = screening_notes
                application.save()
                updated_count += 1
                
                if updated_count % 10 == 0:
                    self.stdout.write(f'Updated {updated_count} applications...')
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error updating application {application.id}: {str(e)}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully updated {updated_count} applications with AI scores')
        )