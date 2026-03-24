from rest_framework import status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum, Avg
from django.utils import timezone
from datetime import timedelta

from common.viewsets import CompanyScopedModelViewSet
from .models import Lead, Contact, Account, Opportunity, Activity, Campaign, CampaignMember, SalesTarget
from .serializers import (
    LeadSerializer, ContactSerializer, AccountSerializer, OpportunitySerializer,
    ActivitySerializer, CampaignSerializer, CampaignMemberSerializer, SalesTargetSerializer,
    DashboardStatsSerializer, LeadsByStatusSerializer, OpportunitiesByStageSerializer
)


class LeadViewSet(CompanyScopedModelViewSet):
    """Lead management with centralized tenant enforcement"""
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'source', 'assigned_to']
    search_fields = ['first_name', 'last_name', 'email', 'company_name']
    ordering_fields = ['created_at', 'updated_at', 'last_contacted', 'estimated_value']
    ordering = ['-created_at']

    @action(detail=True, methods=['post'])
    def calculate_score(self, request, pk=None):
        """Calculate AI lead score for a specific lead"""
        lead = self.get_object()
        company = self.get_company()
        
        from .lead_scoring import LeadScoringEngine
        
        scoring_engine = LeadScoringEngine(company)
        lead_score = scoring_engine.calculate_lead_score(lead)
        
        return Response({
            'lead_id': lead.lead_id,
            'total_score': lead_score.total_score,
            'grade': lead_score.grade,
            'behavioral_score': lead_score.behavioral_score,
            'demographic_score': lead_score.demographic_score,
            'engagement_score': lead_score.engagement_score,
            'predictive_score': lead_score.predictive_score,
            'conversion_probability': lead_score.conversion_probability,
            'recommended_actions': lead_score.recommended_actions,
            'score_factors': lead_score.score_factors
        })

    @action(detail=False)
    def smart_prioritization(self, request):
        """Get AI-prioritized leads based on scores and conversion probability"""
        # Get leads with scores, prioritized by AI
        leads = self.get_queryset().select_related('score').filter(
            status__in=['new', 'contacted', 'qualified']
        ).order_by('-score__total_score', '-score__conversion_probability')
        
        prioritized_leads = []
        for lead in leads[:20]:  # Top 20 leads
            lead_data = self.get_serializer(lead).data
            if hasattr(lead, 'score'):
                lead_data['ai_score'] = {
                    'total_score': lead.score.total_score,
                    'grade': lead.score.grade,
                    'conversion_probability': lead.score.conversion_probability,
                    'recommended_actions': lead.score.recommended_actions[:3]  # Top 3 actions
                }
            prioritized_leads.append(lead_data)
        
        return Response({
            'prioritized_leads': prioritized_leads,
            'total_leads': leads.count()
        })

    @action(detail=True, methods=['post'])
    def convert_to_opportunity(self, request, pk=None):
        """Convert lead to opportunity"""
        lead = self.get_object()
        
        # Check if lead is already converted
        if lead.status == 'won':
            return Response({'error': 'Lead has already been converted to opportunity'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get default user
        from django.contrib.auth.models import User
        default_user = User.objects.filter(is_superuser=True).first()
        if not default_user:
            return Response({'error': 'No valid user found for conversion'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create account
        account_data = {
            'company': self.get_company().id,
            'name': lead.company_name or f"{lead.first_name} {lead.last_name}",
            'account_type': 'prospect',
            'email': lead.email,
            'created_by': default_user.id
        }
        account_serializer = AccountSerializer(data=account_data)
        if account_serializer.is_valid():
            account = account_serializer.save(created_by=default_user)
        else:
            return Response({'error': f'Failed to create account: {account_serializer.errors}'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create contact
        contact_data = {
            'company': self.get_company().id,
            'first_name': lead.first_name,
            'last_name': lead.last_name,
            'email': lead.email,
            'phone': lead.phone,
            'job_title': lead.job_title,
            'created_by': default_user.id
        }
        contact_serializer = ContactSerializer(data=contact_data)
        if contact_serializer.is_valid():
            contact = contact_serializer.save(created_by=default_user)
        else:
            return Response({'error': f'Failed to create contact: {contact_serializer.errors}'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create opportunity
        opportunity_data = {
            'company': self.get_company().id,
            'name': f"{lead.first_name} {lead.last_name} - Opportunity",
            'account': account.id,
            'contact': contact.id,
            'amount': lead.estimated_value or 0,
            'expected_close_date': lead.expected_close_date or timezone.now().date() + timedelta(days=30),
            'owner': lead.assigned_to.id if lead.assigned_to else default_user.id,
            'created_by': default_user.id,
            'description': lead.description
        }
        opportunity_serializer = OpportunitySerializer(data=opportunity_data)
        if opportunity_serializer.is_valid():
            opportunity = opportunity_serializer.save(created_by=default_user, owner_id=lead.assigned_to.id if lead.assigned_to else default_user.id)
        else:
            return Response({'error': f'Failed to create opportunity: {opportunity_serializer.errors}'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update lead status to converted
        lead.status = 'won'
        lead.save()
        
        return Response({
            'message': 'Lead converted successfully',
            'opportunity_id': opportunity.opportunity_id,
            'account_id': account.account_id,
            'contact_id': contact.contact_id,
            'lead_status': 'won'
        })

    @action(detail=False)
    def by_status(self, request):
        """Get leads grouped by status"""
        queryset = self.get_queryset()
        stats = queryset.values('status').annotate(count=Count('id')).order_by('status')
        serializer = LeadsByStatusSerializer(stats, many=True)
        return Response(serializer.data)


class ContactViewSet(CompanyScopedModelViewSet):
    """Contact management with centralized tenant enforcement"""
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'department']
    search_fields = ['first_name', 'last_name', 'email', 'job_title', 'department']
    ordering_fields = ['first_name', 'last_name', 'created_at']
    ordering = ['first_name', 'last_name']


class AccountViewSet(CompanyScopedModelViewSet):
    """Account management with centralized tenant enforcement"""
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['account_type', 'industry', 'is_active']
    search_fields = ['name', 'email', 'website']
    ordering_fields = ['name', 'created_at', 'annual_revenue']
    ordering = ['name']

    @action(detail=True)
    def opportunities(self, request, pk=None):
        """Get opportunities for this account"""
        account = self.get_object()
        opportunities = account.opportunities.all()
        serializer = OpportunitySerializer(opportunities, many=True)
        return Response(serializer.data)

    @action(detail=True)
    def activities(self, request, pk=None):
        """Get activities for this account"""
        account = self.get_object()
        activities = account.activities.all()
        serializer = ActivitySerializer(activities, many=True)
        return Response(serializer.data)


class OpportunityViewSet(CompanyScopedModelViewSet):
    """Opportunity management with centralized tenant enforcement"""
    queryset = Opportunity.objects.all()
    serializer_class = OpportunitySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['stage', 'probability', 'owner']
    search_fields = ['name', 'account__name', 'description']
    ordering_fields = ['created_at', 'expected_close_date', 'amount', 'probability']
    ordering = ['-created_at']

    @action(detail=False)
    def pipeline(self, request):
        """Get opportunity pipeline data"""
        queryset = self.get_queryset()
        pipeline = queryset.values('stage').annotate(
            count=Count('id'),
            total_value=Sum('amount')
        ).order_by('stage')
        serializer = OpportunitiesByStageSerializer(pipeline, many=True)
        return Response(serializer.data)

    @action(detail=False)
    def forecast(self, request):
        """Get sales forecast data"""
        queryset = self.get_queryset().exclude(stage__in=['closed_won', 'closed_lost'])
        forecast_data = {
            'total_pipeline_value': queryset.aggregate(Sum('amount'))['amount__sum'] or 0,
            'weighted_pipeline_value': sum(opp.weighted_amount for opp in queryset),
            'opportunities_count': queryset.count(),
            'avg_deal_size': queryset.aggregate(Avg('amount'))['amount__avg'] or 0,
        }
        return Response(forecast_data)

    @action(detail=True, methods=['post'])
    def update_stage(self, request, pk=None):
        """Update opportunity stage"""
        opportunity = self.get_object()
        new_stage = request.data.get('stage')
        
        if new_stage in dict(Opportunity.STAGE_CHOICES):
            opportunity.stage = new_stage
            if new_stage in ['closed_won', 'closed_lost']:
                opportunity.closed_date = timezone.now().date()
            opportunity.save()
            
            serializer = self.get_serializer(opportunity)
            return Response(serializer.data)
        
        return Response({'error': 'Invalid stage'}, status=status.HTTP_400_BAD_REQUEST)


class ActivityViewSet(CompanyScopedModelViewSet):
    """Activity management with centralized tenant enforcement"""
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['activity_type', 'status', 'assigned_to']
    search_fields = ['subject', 'description']
    ordering_fields = ['due_date', 'created_at']
    ordering = ['due_date']

    @action(detail=True, methods=['post'])
    def analyze_conversation(self, request, pk=None):
        """Analyze conversation using AI for insights"""
        activity = self.get_object()
        company = self.get_company()
        
        from .lead_scoring import AIAnalyticsEngine
        
        ai_engine = AIAnalyticsEngine(company)
        analysis = ai_engine.analyze_conversation_intelligence(activity)
        
        if analysis:
            return Response({
                'activity_id': activity.id,
                'conversation_analysis': analysis
            })
        else:
            return Response({
                'message': 'No conversation content to analyze'
            })

    @action(detail=False)
    def today(self, request):
        """Get today's activities"""
        today = timezone.now().date()
        queryset = self.get_queryset().filter(due_date__date=today)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False)
    def overdue(self, request):
        """Get overdue activities"""
        now = timezone.now()
        queryset = self.get_queryset().filter(
            due_date__lt=now,
            status__in=['planned', 'in_progress']
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark activity as completed"""
        activity = self.get_object()
        activity.status = 'completed'
        activity.completed_at = timezone.now()
        activity.outcome = request.data.get('outcome', '')
        activity.save()
        
        # Analyze conversation if it has content
        if activity.description or activity.outcome:
            from .lead_scoring import AIAnalyticsEngine
            ai_engine = AIAnalyticsEngine(activity.company)
            analysis = ai_engine.analyze_conversation_intelligence(activity)
            if analysis:
                # Store analysis results in activity metadata if needed
                pass
        
        serializer = self.get_serializer(activity)
        return Response(serializer.data)


class CampaignViewSet(CompanyScopedModelViewSet):
    """Campaign management with centralized tenant enforcement"""
    queryset = Campaign.objects.all()
    serializer_class = CampaignSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['campaign_type', 'status']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'start_date', 'end_date']
    ordering = ['-created_at']

    @action(detail=True)
    def members(self, request, pk=None):
        """Get campaign members"""
        campaign = self.get_object()
        members = campaign.members.all()
        serializer = CampaignMemberSerializer(members, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_members(self, request, pk=None):
        """Add members to campaign"""
        campaign = self.get_object()
        lead_ids = request.data.get('lead_ids', [])
        contact_ids = request.data.get('contact_ids', [])
        
        added_count = 0
        
        # Add leads
        for lead_id in lead_ids:
            try:
                lead = Lead.objects.get(id=lead_id, company=campaign.company)
                CampaignMember.objects.get_or_create(
                    campaign=campaign,
                    lead=lead,
                    defaults={'sent_date': timezone.now()}
                )
                added_count += 1
            except Lead.DoesNotExist:
                continue
        
        # Add contacts
        for contact_id in contact_ids:
            try:
                contact = Contact.objects.get(id=contact_id, company=campaign.company)
                CampaignMember.objects.get_or_create(
                    campaign=campaign,
                    contact=contact,
                    defaults={'sent_date': timezone.now()}
                )
                added_count += 1
            except Contact.DoesNotExist:
                continue
        
        return Response({'message': f'{added_count} members added to campaign'})


class SalesTargetViewSet(CompanyScopedModelViewSet):
    """Sales Target management with centralized tenant enforcement"""
    queryset = SalesTarget.objects.all()
    serializer_class = SalesTargetSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['period', 'year', 'user']
    ordering_fields = ['year', 'month', 'quarter', 'target_amount']
    ordering = ['-year', '-month', '-quarter']

    @action(detail=False)
    def current_performance(self, request):
        """Get current performance against targets"""
        current_year = timezone.now().year
        current_month = timezone.now().month
        current_quarter = (current_month - 1) // 3 + 1
        
        # Get current targets
        monthly_target = SalesTarget.objects.filter(
            user=request.service_user,
            period='monthly',
            year=current_year,
            month=current_month
        ).first()
        
        quarterly_target = SalesTarget.objects.filter(
            user=request.service_user,
            period='quarterly',
            year=current_year,
            quarter=current_quarter
        ).first()
        
        yearly_target = SalesTarget.objects.filter(
            user=request.service_user,
            period='yearly',
            year=current_year
        ).first()
        
        performance_data = {
            'monthly': SalesTargetSerializer(monthly_target).data if monthly_target else None,
            'quarterly': SalesTargetSerializer(quarterly_target).data if quarterly_target else None,
            'yearly': SalesTargetSerializer(yearly_target).data if yearly_target else None,
        }
        
        return Response(performance_data)


class DashboardViewSet(CompanyScopedModelViewSet):
    """CRM Dashboard with centralized tenant enforcement"""
    queryset = Lead.objects.none()  # Dummy queryset
    serializer_class = DashboardStatsSerializer
    is_global_model = True  # Skip company filtering for dashboard

    def list(self, request, *args, **kwargs):
        """Return dashboard stats instead of a queryset list"""
        company = self.get_company()
        from .query_optimizations import CRMQueryOptimizer
        stats = CRMQueryOptimizer.get_dashboard_stats_optimized(company)
        return Response(DashboardStatsSerializer(stats).data)

    @action(detail=False)
    def stats(self, request):
        """Get dashboard statistics"""
        company = self.get_company()
        
        # Get optimized dashboard statistics with caching
        from .query_optimizations import CRMQueryOptimizer
        stats = CRMQueryOptimizer.get_dashboard_stats_optimized(company)
        
        serializer = DashboardStatsSerializer(stats)
        return Response(serializer.data)

    @action(detail=False)
    def recent_activities(self, request):
        """Get recent activities"""
        company = self.get_company()
        
        activities = Activity.objects.filter(company=company).order_by('-created_at')[:10]
        serializer = ActivitySerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=False)
    def sales_funnel(self, request):
        """Get sales funnel data"""
        company = self.get_company()
        
        # Get optimized sales funnel data with caching
        from .query_optimizations import CRMQueryOptimizer
        funnel_data = CRMQueryOptimizer.get_sales_funnel_optimized(company)
        return Response(funnel_data)

    @action(detail=False)
    def ai_insights(self, request):
        """Get AI-powered insights dashboard"""
        company = self.get_company()
        
        from .ai_analytics import SmartInsightsGenerator
        
        insights_generator = SmartInsightsGenerator(company)
        insights = insights_generator.generate_daily_insights()
        
        return Response({
            'insights': insights,
            'generated_at': timezone.now().isoformat()
        })

    @action(detail=False)
    def lead_intelligence(self, request):
        """Get AI-powered lead intelligence dashboard"""
        company = self.get_company()
        
        from .ai_analytics import AdvancedAnalytics
        
        analytics = AdvancedAnalytics(company)
        lead_intelligence = analytics.get_lead_intelligence_dashboard()
        
        return Response(lead_intelligence)

    @action(detail=False)
    def sales_forecast(self, request):
        """Get AI-powered sales forecast"""
        company = self.get_company()
        
        from .ai_analytics import AdvancedAnalytics
        
        period_days = int(request.query_params.get('period_days', 90))
        analytics = AdvancedAnalytics(company)
        forecast = analytics.get_sales_forecast_dashboard(period_days)
        
        return Response(forecast)

    @action(detail=False)
    def customer_health(self, request):
        """Get customer health and churn risk insights"""
        company = self.get_company()
        
        from .ai_analytics import AdvancedAnalytics
        
        analytics = AdvancedAnalytics(company)
        health_insights = analytics.get_customer_health_insights()
        
        return Response(health_insights)

    @action(detail=False)
    def conversation_intelligence(self, request):
        """Get conversation intelligence insights"""
        company = self.get_company()
        
        from .ai_analytics import AdvancedAnalytics
        
        analytics = AdvancedAnalytics(company)
        conversation_insights = analytics.get_conversation_intelligence_insights()
        
        return Response(conversation_insights)

    @action(detail=False)
    def performance_analytics(self, request):
        """Get team and individual performance analytics"""
        company = self.get_company()
        
        from .ai_analytics import AdvancedAnalytics
        
        analytics = AdvancedAnalytics(company)
        performance = analytics.get_performance_analytics()
        
        return Response(performance)

    @action(detail=False)
    def weekly_report(self, request):
        """Generate comprehensive weekly AI report"""
        company = self.get_company()
        
        from .ai_analytics import SmartInsightsGenerator
        
        insights_generator = SmartInsightsGenerator(company)
        weekly_report = insights_generator.generate_weekly_report()
        
        return Response(weekly_report)