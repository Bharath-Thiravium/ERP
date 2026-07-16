from rest_framework import status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
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

        if lead.status in ['converted', 'won'] or lead.converted_opportunity_id:
            return Response({'error': 'Lead has already been converted to opportunity'}, status=status.HTTP_400_BAD_REQUEST)

        default_user = request.service_user.created_by
        if not default_user:
            return Response({'error': 'No valid user found for conversion'}, status=status.HTTP_400_BAD_REQUEST)

        company = self.get_company()
        ctx = {'request': request, 'skip_duplicate_check': True}

        with transaction.atomic():
            # Reuse existing account by name, or create new
            account_name = lead.company_name or f"{lead.first_name} {lead.last_name}"
            account = Account.objects.filter(company=company, name__iexact=account_name).first()
            if not account:
                account_serializer = AccountSerializer(data={
                    'company': company.id, 'name': account_name,
                    'account_type': 'prospect', 'email': lead.email,
                    'created_by': default_user.id
                }, context=ctx)
                if not account_serializer.is_valid():
                    return Response({'error': f'Failed to create account: {account_serializer.errors}'}, status=status.HTTP_400_BAD_REQUEST)
                account = account_serializer.save(company=company, created_by=default_user)

            # Reuse existing contact by email, or create new
            contact = Contact.objects.filter(company=company, email__iexact=lead.email).first() if lead.email else None
            if not contact:
                contact_serializer = ContactSerializer(data={
                    'company': company.id, 'first_name': lead.first_name,
                    'last_name': lead.last_name, 'email': lead.email,
                    'phone': lead.phone, 'job_title': lead.job_title,
                    'created_by': default_user.id
                }, context=ctx)
                if not contact_serializer.is_valid():
                    return Response({'error': f'Failed to create contact: {contact_serializer.errors}'}, status=status.HTTP_400_BAD_REQUEST)
                contact = contact_serializer.save(company=company, created_by=default_user)

            owner_id = lead.assigned_to.id if lead.assigned_to else default_user.id
            opportunity_serializer = OpportunitySerializer(data={
                'company': company.id,
                'name': f"{lead.first_name} {lead.last_name} - Opportunity",
                'account': account.id, 'contact': contact.id,
                'amount': lead.estimated_value or 0,
                'expected_close_date': lead.expected_close_date or timezone.now().date() + timedelta(days=30),
                'owner': owner_id, 'created_by': default_user.id,
                'description': lead.description
            }, context=ctx)
            if not opportunity_serializer.is_valid():
                return Response({'error': f'Failed to create opportunity: {opportunity_serializer.errors}'}, status=status.HTTP_400_BAD_REQUEST)
            opportunity = opportunity_serializer.save(company=company, created_by=default_user, owner_id=owner_id)

            lead.status = 'converted'
            lead.converted_contact = contact
            lead.converted_account = account
            lead.converted_opportunity = opportunity
            lead.save()

            from .models import PipelineStage, Deal
            first_stage = PipelineStage.objects.filter(company=company, is_active=True).order_by('order').first()
            if not first_stage:
                first_stage = PipelineStage.objects.create(
                    company=company, name='Prospecting', order=1, probability=10
                )
            Deal.objects.create(
                company=company,
                name=f"{lead.first_name} {lead.last_name} - {lead.company_name or 'Deal'}",
                account=account, contact=contact, opportunity=opportunity,
                current_stage=first_stage, status='open',
                value=lead.estimated_value or 0,
                probability=first_stage.probability,
                expected_close_date=lead.expected_close_date or (timezone.now().date() + timedelta(days=30)),
                owner=default_user, created_by=default_user,
            )

        return Response({
            'message': 'Lead converted successfully',
            'opportunity_id': opportunity.opportunity_id,
            'account_id': account.account_id,
            'contact_id': contact.contact_id,
            'lead_status': 'converted'
        })

    @action(detail=False)
    def by_status(self, request):
        """Get leads grouped by status"""
        queryset = self.get_queryset()
        stats = queryset.values('status').annotate(count=Count('id')).order_by('status')
        serializer = LeadsByStatusSerializer(stats, many=True)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        lead = self.get_object()
        with transaction.atomic():
            # Delete linked converted records if they exist
            if lead.converted_opportunity:
                # Deal is OneToOne with Opportunity — cascade handles it
                lead.converted_opportunity.delete()
            if lead.converted_contact:
                lead.converted_contact.delete()
            if lead.converted_account:
                lead.converted_account.delete()
            lead.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ContactViewSet(CompanyScopedModelViewSet):
    """Contact management with centralized tenant enforcement"""
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'department']
    search_fields = ['first_name', 'last_name', 'email', 'job_title', 'department']
    ordering_fields = ['first_name', 'last_name', 'created_at']
    ordering = ['first_name', 'last_name']

    def perform_create(self, serializer):
        super().perform_create(serializer)
        contact = serializer.instance
        from common.sync_services import (
            ensure_master_customer_from_crm_contact,
            get_data_sharing_policy,
            request_customer_sync_from_crm_contact,
        )
        policy = get_data_sharing_policy(contact.company)
        if policy.auto_sync_enabled and (policy.crm_to_finance_customers or policy.finance_to_crm_customers):
            if policy.require_manual_approval and policy.crm_to_finance_customers:
                request_customer_sync_from_crm_contact(contact)
            else:
                ensure_master_customer_from_crm_contact(contact)

    def destroy(self, request, *args, **kwargs):
        contact = self.get_object()
        if contact.source_lead.exists():
            return Response({'error': 'This contact was created from a lead conversion and cannot be deleted directly. Delete the lead instead.'}, status=status.HTTP_400_BAD_REQUEST)
        from common.sync_services import is_shared_record, request_shared_delete
        if is_shared_record(contact):
            reason = request.query_params.get('delete_reason') or request.data.get('delete_reason') or request.data.get('reason')
            if not reason:
                return Response(
                    {'error': 'Delete reason is required for shared records.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            sync_request = request_shared_delete(contact, reason, requested_by=request.service_user)
            return Response(
                {
                    'message': 'Delete approval request sent to company admin.',
                    'sync_request_id': sync_request.id,
                },
                status=status.HTTP_202_ACCEPTED,
            )
        return super().destroy(request, *args, **kwargs)


class AccountViewSet(CompanyScopedModelViewSet):
    """Account management with centralized tenant enforcement"""
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['account_type', 'industry', 'is_active']
    search_fields = ['name', 'email', 'website']
    ordering_fields = ['name', 'created_at', 'annual_revenue']
    ordering = ['name']

    def perform_create(self, serializer):
        super().perform_create(serializer)
        account = serializer.instance
        from common.sync_services import (
            ensure_master_customer_from_crm_account,
            get_data_sharing_policy,
            request_customer_sync_from_crm_account,
        )
        policy = get_data_sharing_policy(account.company)
        if policy.auto_sync_enabled and (policy.crm_to_finance_customers or policy.finance_to_crm_customers):
            if policy.require_manual_approval and policy.crm_to_finance_customers:
                request_customer_sync_from_crm_account(account)
            else:
                ensure_master_customer_from_crm_account(account)

    def destroy(self, request, *args, **kwargs):
        account = self.get_object()
        if account.source_lead.exists():
            return Response({'error': 'This account was created from a lead conversion and cannot be deleted directly. Delete the lead instead.'}, status=status.HTTP_400_BAD_REQUEST)
        from common.sync_services import is_shared_record, request_shared_delete
        if is_shared_record(account):
            reason = request.query_params.get('delete_reason') or request.data.get('delete_reason') or request.data.get('reason')
            if not reason:
                return Response(
                    {'error': 'Delete reason is required for shared records.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            sync_request = request_shared_delete(account, reason, requested_by=request.service_user)
            return Response(
                {
                    'message': 'Delete approval request sent to company admin.',
                    'sync_request_id': sync_request.id,
                },
                status=status.HTTP_202_ACCEPTED,
            )
        return super().destroy(request, *args, **kwargs)

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

    def destroy(self, request, *args, **kwargs):
        opportunity = self.get_object()
        if opportunity.source_lead.exists():
            return Response({'error': 'This opportunity was created from a lead conversion and cannot be deleted directly. Delete the lead instead.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

    def _sync_deal_stage(self, opportunity, new_stage):
        """Sync opportunity stage change to linked Deal in Sales Pipeline."""
        from .models import Deal, PipelineStage, DealStageHistory
        deal = Deal.objects.filter(opportunity=opportunity).first()
        if not deal:
            return
        stage_name_map = {
            'prospecting': 'Prospecting',
            'qualification': 'Qualification',
            'needs_analysis': 'Needs Analysis',
            'proposal': 'Proposal',
            'negotiation': 'Negotiation',
            'closed_won': 'Closed Won',
            'closed_lost': 'Closed Lost',
        }
        stage_order_map = {
            'Prospecting': (1, 10),
            'Qualification': (2, 25),
            'Needs Analysis': (3, 50),
            'Proposal': (4, 75),
            'Negotiation': (5, 90),
            'Closed Won': (6, 100),
            'Closed Lost': (7, 0),
        }
        pipeline_stage_name = stage_name_map.get(new_stage)
        if not pipeline_stage_name:
            return
        company = opportunity.company
        # Get or create the pipeline stage for this company
        pipeline_stage = PipelineStage.objects.filter(
            company=company,
            name__iexact=pipeline_stage_name,
        ).first()
        if not pipeline_stage:
            order, probability = stage_order_map.get(pipeline_stage_name, (99, 0))
            pipeline_stage = PipelineStage.objects.create(
                company=company,
                name=pipeline_stage_name,
                order=order,
                probability=probability,
                is_active=True,
            )
        if deal.current_stage != pipeline_stage:
            try:
                django_user = self.request.service_user.created_by
            except Exception:
                django_user = None
            DealStageHistory.objects.create(
                deal=deal,
                stage=pipeline_stage,
                changed_by=django_user,
                notes='Synced from opportunity stage change',
            )
            deal.current_stage = pipeline_stage
            deal.probability = pipeline_stage.probability
            if new_stage == 'closed_won':
                deal.status = 'won'
                deal.actual_close_date = timezone.now().date()
            elif new_stage == 'closed_lost':
                deal.status = 'lost'
                deal.actual_close_date = timezone.now().date()
            deal.save()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_stage = instance.stage
        response = super().update(request, *args, **kwargs)
        instance.refresh_from_db()
        new_stage = instance.stage
        if old_stage != new_stage:
            if new_stage in ['closed_won', 'closed_lost']:
                instance.closed_date = timezone.now().date()
                instance.save(update_fields=['closed_date'])
            self._sync_deal_stage(instance, new_stage)
        return response

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
            old_stage = opportunity.stage
            opportunity.stage = new_stage
            if new_stage in ['closed_won', 'closed_lost']:
                opportunity.closed_date = timezone.now().date()
            opportunity.save()
            if old_stage != new_stage:
                self._sync_deal_stage(opportunity, new_stage)
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

    def _completed_locked_response(self):
        return Response(
            {'error': 'Completed activities are locked and cannot be changed.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    def update(self, request, *args, **kwargs):
        activity = self.get_object()
        if activity.status == 'completed':
            return self._completed_locked_response()
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        activity = self.get_object()
        if activity.status == 'completed':
            return self._completed_locked_response()
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        activity = self.get_object()
        if activity.status == 'completed':
            return self._completed_locked_response()
        return super().destroy(request, *args, **kwargs)

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
        if activity.status == 'completed':
            return Response(
                {'error': 'Activity is already completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )
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

        with transaction.atomic():
            # Add leads
            for lead_id in lead_ids:
                try:
                    lead = Lead.objects.get(id=lead_id, company=campaign.company)
                    _, created = CampaignMember.objects.get_or_create(
                        campaign=campaign,
                        lead=lead,
                        defaults={'sent_date': timezone.now()}
                    )
                    if created:
                        added_count += 1
                except Lead.DoesNotExist:
                    continue

            # Add contacts
            for contact_id in contact_ids:
                try:
                    contact = Contact.objects.get(id=contact_id, company=campaign.company)
                    _, created = CampaignMember.objects.get_or_create(
                        campaign=campaign,
                        contact=contact,
                        defaults={'sent_date': timezone.now()}
                    )
                    if created:
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
        django_user = request.service_user.created_by

        # Get current targets
        monthly_target = SalesTarget.objects.filter(
            user=django_user,
            period='monthly',
            year=current_year,
            month=current_month
        ).first()
        
        quarterly_target = SalesTarget.objects.filter(
            user=django_user,
            period='quarterly',
            year=current_year,
            quarter=current_quarter
        ).first()
        
        yearly_target = SalesTarget.objects.filter(
            user=django_user,
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
