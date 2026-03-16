from django.core.management.base import BaseCommand
from orchestrator.agent import OrchestratorAgent
from orchestrator.models import ErrorPattern

class Command(BaseCommand):
    help = 'Analyze error patterns and suggest fixes'

    def add_arguments(self, parser):
        parser.add_argument('--error-hash', type=str, help='Specific error hash to analyze')
        parser.add_argument('--top', type=int, default=10, help='Show top N errors')

    def handle(self, *args, **options):
        agent = OrchestratorAgent()
        
        if options['error_hash']:
            try:
                error = ErrorPattern.objects.get(error_hash=options['error_hash'])
                insights = agent.get_error_insights(error)
                self.stdout.write(self.style.SUCCESS(f"\nError: {insights['error_type']}"))
                self.stdout.write(f"Occurrences: {insights['occurrence_count']}")
                self.stdout.write(f"Working fixes: {insights['working_fixes_count']}")
                
                if insights['best_fix']:
                    self.stdout.write(self.style.SUCCESS("\nBest Fix:"))
                    self.stdout.write(f"  {insights['best_fix']['description']}")
                    self.stdout.write(f"  Confidence: {insights['best_fix']['confidence_score']}%")
            except ErrorPattern.DoesNotExist:
                self.stdout.write(self.style.ERROR('Error not found'))
        else:
            errors = ErrorPattern.objects.order_by('-occurrence_count')[:options['top']]
            self.stdout.write(self.style.SUCCESS(f"\nTop {options['top']} Errors:\n"))
            
            for error in errors:
                best_fix = agent.get_best_fix(error)
                fix_status = f"✓ Fixed ({best_fix.confidence_score:.0f}%)" if best_fix else "✗ No fix"
                self.stdout.write(f"{error.error_type} - {error.occurrence_count}x - {fix_status}")
                self.stdout.write(f"  {error.file_path}:{error.line_number}")
