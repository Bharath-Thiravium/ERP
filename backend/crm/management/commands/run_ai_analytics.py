"""
Management command to run AI analytics and update lead scores
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from authentication.models import Company
from crm.models import Lead, Activity
from crm.lead_scoring import LeadScoringEngine, AIAnalyticsEngine
from crm.ai_analytics import SmartInsightsGenerator


class Command(BaseCommand):
    help = 'Run AI analytics and update lead scores for all companies'

    def add_arguments(self, parser):
        parser.add_argument(
            '--company-id',
            type=int,
            help='Run analytics for specific company ID only'
        )
        parser.add_argument(
            '--update-scores',
            action='store_true',
            help='Update lead scores'
        )
        parser.add_argument(
            '--analyze-conversations',
            action='store_true',
            help='Analyze recent conversations'
        )
        parser.add_argument(
            '--generate-insights',
            action='store_true',
            help='Generate daily insights'
        )

    def handle(self, *args, **options):
        company_id = options.get('company_id')
        
        if company_id:
            companies = Company.objects.filter(id=company_id)
        else:
            companies = Company.objects.filter(is_active=True)
        
        for company in companies:
            self.stdout.write(f"Processing company: {company.name}")
            
            if options.get('update_scores'):
                self.update_lead_scores(company)
            
            if options.get('analyze_conversations'):
                self.analyze_conversations(company)
            
            if options.get('generate_insights'):
                self.generate_insights(company)
        
        self.stdout.write(
            self.style.SUCCESS('AI analytics completed successfully')
        )

    def update_lead_scores(self, company):
        """Update lead scores for all active leads"""
        self.stdout.write(f"Updating lead scores for {company.name}...")
        
        scoring_engine = LeadScoringEngine(company)
        
        # Get active leads that need scoring
        leads = Lead.objects.filter(
            company=company,
            status__in=['new', 'contacted', 'qualified']
        )
        
        updated_count = 0
        for lead in leads:
            try:
                lead_score = scoring_engine.calculate_lead_score(lead)
                updated_count += 1
                
                if updated_count % 10 == 0:
                    self.stdout.write(f"Updated {updated_count} lead scores...")
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Error updating score for lead {lead.lead_id}: {str(e)}")
                )
        
        self.stdout.write(
            self.style.SUCCESS(f"Updated {updated_count} lead scores for {company.name}")
        )

    def analyze_conversations(self, company):
        """Analyze recent conversations for insights"""
        self.stdout.write(f"Analyzing conversations for {company.name}...")
        
        ai_engine = AIAnalyticsEngine(company)
        
        # Get recent activities with conversation content
        recent_activities = Activity.objects.filter(
            company=company,
            created_at__gte=timezone.now() - timezone.timedelta(days=7),
            activity_type__in=['call', 'meeting', 'demo']
        ).exclude(
            description='',
            outcome=''
        )
        
        analyzed_count = 0
        insights_found = 0
        
        for activity in recent_activities:
            try:
                analysis = ai_engine.analyze_conversation_intelligence(activity)
                if analysis:
                    analyzed_count += 1
                    
                    # Count significant insights
                    if (analysis.get('buying_signals') or 
                        analysis.get('risk_indicators') or 
                        analysis.get('sentiment') in ['positive', 'negative']):
                        insights_found += 1
                        
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Error analyzing activity {activity.id}: {str(e)}")
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Analyzed {analyzed_count} conversations, found {insights_found} significant insights for {company.name}"
            )
        )

    def generate_insights(self, company):
        """Generate daily insights for company"""
        self.stdout.write(f"Generating insights for {company.name}...")
        
        try:
            insights_generator = SmartInsightsGenerator(company)
            insights = insights_generator.generate_daily_insights()
            
            high_priority_count = len([i for i in insights if i.get('priority') == 'high'])
            critical_count = len([i for i in insights if i.get('priority') == 'critical'])
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Generated {len(insights)} insights for {company.name} "
                    f"({critical_count} critical, {high_priority_count} high priority)"
                )
            )
            
            # Display critical insights
            for insight in insights:
                if insight.get('priority') == 'critical':
                    self.stdout.write(
                        self.style.WARNING(f"CRITICAL: {insight.get('title')}")
                    )
                    
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error generating insights for {company.name}: {str(e)}")
            )