import logging
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Sum, Avg
from django.utils import timezone
from datetime import timedelta
from django.db import transaction

from .models import Lead, Contact, Account, Opportunity, Activity, Campaign, CampaignMember, SalesTarget
from .serializers import (
    LeadSerializer, ContactSerializer, AccountSerializer, OpportunitySerializer,
    ActivitySerializer, CampaignSerializer, CampaignMemberSerializer, SalesTargetSerializer,
    DashboardStatsSerializer, LeadsByStatusSerializer, OpportunitiesByStageSerializer
)
from authentication.authentication import ServiceUserSessionAuthentication
from authentication.permissions import IsServiceUserAuthenticated
from .security_utils import CRMSecurityValidator
from .query_optimizations import CRMQueryOptimizer

logger = logging.getLogger(__name__)


class CRMBaseViewSet(viewsets.ModelViewSet):
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    def _get_service_user(self):
        return getattr(self.request, 'service_user', None)

    def _get_django_user(self):
        su = self._get_service_user()
        return su.created_by if su else None

    def get_queryset(self):
        su = self._get_service_user()
        if not su:
            return self.queryset.none()
        return self.queryset.filter(company=su.company)

    def list(self, request, *args, **kwargs):
        if not self._get_service_user():
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            data = request.data.copy()
            for key, value in data.items():
                if isinstance(value, str):
                    if not CRMSecurityValidator.validate_sql_injection(value):
                        return Response({'error': f'Invalid characters in {key}'}, status=status.HTTP_400_BAD_REQUEST)
                    if not CRMSecurityValidator.validate_xss(value):
                        return Response({'error': f'Invalid content in {key}'}, status=status.HTTP_400_BAD_REQUEST)
                    data[key] = CRMSecurityValidator.sanitize_input(value)
            if 'email' in data and data['email']:
                if not CRMSecurityValidator.validate_email_format(data['email']):
                    return Response({'error': 'Invalid email format'}, status=status.HTTP_400_BAD_REQUEST)
            for field in ['phone', 'mobile', 'contact_phone']:
                if field in data and data[field]:
                    if not CRMSecurityValidator.validate_phone_number(data[field]):
                        return Response({'error': f'Invalid {field} format'}, status=status.HTTP_400_BAD_REQUEST)

            django_user = self._get_django_user()
            if not django_user:
                return Response({'error': 'No valid user found for created_by field'}, status=status.HTTP_400_BAD_REQUEST)

            data['company'] = su.company.id
            model_class = self.get_serializer().Meta.model

            if hasattr(model_class, 'created_by'):
                data['created_by'] = django_user.id
            if hasattr(model_class, 'assigned_to') and not data.get('assigned_to'):
                data['assigned_to'] = django_user.id
            if hasattr(model_class, 'owner'):
                if not data.get('owner') or data['owner'] == 'auto':
                    data['owner'] = django_user.id
                else:
                    try:
                        from django.contrib.auth.models import User
                        User.objects.get(id=int(data['owner']))
                    except (Exception,):
                        data['owner'] = django_user.id

            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            instance = serializer.save(created_by=django_user)
            return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"CRM Create Error: {e}", exc_info=True)
            return Response({'error': f'Creation failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, *args, **kwargs):
        if not self._get_service_user():
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        return super().retrieve(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        data = request.data.copy()
        data['company'] = su.company.id
        django_user = self._get_django_user()
        if django_user:
            data['created_by'] = django_user.id
            if 'owner' in data:
                if not data['owner'] or data['owner'] == 'auto':
                    data['owner'] = django_user.id
                else:
                    try:
                        from django.contrib.auth.models import User
                        User.objects.get(id=int(data['owner']))
                    except (Exception,):
                        data['owner'] = django_user.id
        request._full_data = data
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not self._get_service_user():
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        return super().destroy(request, *args, **kwargs)


class LeadViewSet(CRMBaseViewSet):
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer
    filterset_fields = ['status', 'priority', 'source', 'assigned_to']
    search_fields = ['first_name', 'last_name', 'email', 'company_name']
    ordering_fields = ['created_at', 'updated_at', 'last_contacted', 'estimated_value']
    ordering = ['-created_at']

    @action(detail=True, methods=['post'])
    def calculate_score(self, request, pk=None):
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        lead = self.get_object()
        from .lead_scoring import LeadScoringEngine
        scoring_engine = LeadScoringEngine(su.company)
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
        if not self._get_service_user():
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        leads = self.get_queryset().select_related('score').filter(
            status__in=['new', 'contacted', 'qualified']
        ).order_by('-score__total_score', '-score__conversion_probability')
        prioritized_leads = []
        for lead in leads[:20]:
            lead_data = self.get_serializer(lead).data
            if hasattr(lead, 'score'):
                lead_data['ai_score'] = {
                    'total_score': lead.score.total_score,
                    'grade': lead.score.grade,
                    'conversion_probability': lead.score.conversion_probability,
                    'recommended_actions': lead.score.recommended_actions[:3]
                }
            prioritized_leads.append(lead_data)
        return Response({'prioritized_leads': prioritized_leads, 'total_leads': leads.count()})

    @action(detail=True, methods=['post'])
    def convert_to_opportunity(self, request, pk=None):
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        lead = self.get_object()
        if lead.status == 'won':
            return Response({'error': 'Lead already converted'}, status=status.HTTP_400_BAD_REQUEST)
        default_user = self._get_django_user()
        if not default_user:
            return Response({'error': 'No valid user found for conversion'}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            account_serializer = AccountSerializer(data={
                'company': lead.company.id,
                'name': lead.company_name or f"{lead.first_name} {lead.last_name}",
                'account_type': 'prospect',
                'email': lead.email,
                'created_by': default_user.id
            })
            if not account_serializer.is_valid():
                return Response({'error': f'Account creation failed: {account_serializer.errors}'}, status=status.HTTP_400_BAD_REQUEST)
            account = account_serializer.save(created_by=default_user)

            contact_serializer = ContactSerializer(data={
                'company': lead.company.id,
                'first_name': lead.first_name,
                'last_name': lead.last_name,
                'email': lead.email,
                'phone': lead.phone,
                'job_title': lead.job_title,
                'created_by': default_user.id
            })
            if not contact_serializer.is_valid():
                return Response({'error': f'Contact creation failed: {contact_serializer.errors}'}, status=status.HTTP_400_BAD_REQUEST)
            contact = contact_serializer.save(created_by=default_user)

            owner_id = lead.assigned_to.id if lead.assigned_to else default_user.id
            opp_serializer = OpportunitySerializer(data={
                'company': lead.company.id,
                'name': f"{lead.first_name} {lead.last_name} - Opportunity",
                'account': account.id,
                'contact': contact.id,
                'amount': lead.estimated_value or 0,
                'expected_close_date': lead.expected_close_date or timezone.now().date() + timedelta(days=30),
                'owner': owner_id,
                'created_by': default_user.id,
                'description': lead.description
            })
            if not opp_serializer.is_valid():
                return Response({'error': f'Opportunity creation failed: {opp_serializer.errors}'}, status=status.HTTP_400_BAD_REQUEST)
            opportunity = opp_serializer.save(created_by=default_user, owner_id=owner_id)

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
        stats = self.get_queryset().values('status').annotate(count=Count('id')).order_by('status')
        return Response(LeadsByStatusSerializer(stats, many=True).data)


class ContactViewSet(CRMBaseViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    filterset_fields = ['is_active', 'department']
    search_fields = ['first_name', 'last_name', 'email', 'job_title', 'department']
    ordering_fields = ['first_name', 'last_name', 'created_at']
    ordering = ['first_name', 'last_name']


class AccountViewSet(CRMBaseViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    filterset_fields = ['account_type', 'industry', 'is_active']
    search_fields = ['name', 'email', 'website']
    ordering_fields = ['name', 'created_at', 'annual_revenue']
    ordering = ['name']

    @action(detail=True)
    def opportunities(self, request, pk=None):
        account = self.get_object()
        return Response(OpportunitySerializer(account.opportunities.all(), many=True).data)

    @action(detail=True)
    def activities(self, request, pk=None):
        account = self.get_object()
        return Response(ActivitySerializer(account.activities.all(), many=True).data)


class OpportunityViewSet(CRMBaseViewSet):
    queryset = Opportunity.objects.all()
    serializer_class = OpportunitySerializer
    filterset_fields = ['stage', 'probability', 'owner']
    search_fields = ['name', 'account__name', 'description']
    ordering_fields = ['created_at', 'expected_close_date', 'amount', 'probability']
    ordering = ['-created_at']

    @action(detail=False)
    def pipeline(self, request):
        pipeline = self.get_queryset().values('stage').annotate(
            count=Count('id'), total_value=Sum('amount')
        ).order_by('stage')
        return Response(OpportunitiesByStageSerializer(pipeline, many=True).data)

    @action(detail=False)
    def forecast(self, request):
        qs = self.get_queryset().exclude(stage__in=['closed_won', 'closed_lost'])
        return Response({
            'total_pipeline_value': qs.aggregate(Sum('amount'))['amount__sum'] or 0,
            'weighted_pipeline_value': sum(opp.weighted_amount for opp in qs),
            'opportunities_count': qs.count(),
            'avg_deal_size': qs.aggregate(Avg('amount'))['amount__avg'] or 0,
        })

    @action(detail=True, methods=['post'])
    def update_stage(self, request, pk=None):
        opportunity = self.get_object()
        new_stage = request.data.get('stage')
        if new_stage in dict(Opportunity.STAGE_CHOICES):
            opportunity.stage = new_stage
            if new_stage in ['closed_won', 'closed_lost']:
                opportunity.closed_date = timezone.now().date()
            opportunity.save()
            return Response(self.get_serializer(opportunity).data)
        return Response({'error': 'Invalid stage'}, status=status.HTTP_400_BAD_REQUEST)


class ActivityViewSet(CRMBaseViewSet):
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    filterset_fields = ['activity_type', 'status', 'assigned_to']
    search_fields = ['subject', 'description']
    ordering_fields = ['due_date', 'created_at']
    ordering = ['due_date']

    @action(detail=True, methods=['post'])
    def analyze_conversation(self, request, pk=None):
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        activity = self.get_object()
        from .lead_scoring import AIAnalyticsEngine
        analysis = AIAnalyticsEngine(su.company).analyze_conversation_intelligence(activity)
        if analysis:
            return Response({'activity_id': activity.id, 'conversation_analysis': analysis})
        return Response({'message': 'No conversation content to analyze'})

    @action(detail=False)
    def today(self, request):
        qs = self.get_queryset().filter(due_date__date=timezone.now().date())
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False)
    def overdue(self, request):
        qs = self.get_queryset().filter(due_date__lt=timezone.now(), status__in=['planned', 'in_progress'])
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        activity = self.get_object()
        activity.status = 'completed'
        activity.completed_at = timezone.now()
        activity.outcome = request.data.get('outcome', '')
        activity.save()
        if activity.description or activity.outcome:
            from .lead_scoring import AIAnalyticsEngine
            AIAnalyticsEngine(activity.company).analyze_conversation_intelligence(activity)
        return Response(self.get_serializer(activity).data)


class CampaignViewSet(CRMBaseViewSet):
    queryset = Campaign.objects.all()
    serializer_class = CampaignSerializer
    filterset_fields = ['campaign_type', 'status']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'start_date', 'end_date']
    ordering = ['-created_at']

    @action(detail=True)
    def members(self, request, pk=None):
        campaign = self.get_object()
        return Response(CampaignMemberSerializer(campaign.members.all(), many=True).data)

    @action(detail=True, methods=['post'])
    def add_members(self, request, pk=None):
        campaign = self.get_object()
        added_count = 0
        for lead_id in request.data.get('lead_ids', []):
            try:
                lead = Lead.objects.get(id=lead_id, company=campaign.company)
                CampaignMember.objects.get_or_create(campaign=campaign, lead=lead, defaults={'sent_date': timezone.now()})
                added_count += 1
            except Lead.DoesNotExist:
                continue
        for contact_id in request.data.get('contact_ids', []):
            try:
                contact = Contact.objects.get(id=contact_id, company=campaign.company)
                CampaignMember.objects.get_or_create(campaign=campaign, contact=contact, defaults={'sent_date': timezone.now()})
                added_count += 1
            except Contact.DoesNotExist:
                continue
        return Response({'message': f'{added_count} members added to campaign'})


class SalesTargetViewSet(CRMBaseViewSet):
    queryset = SalesTarget.objects.all()
    serializer_class = SalesTargetSerializer
    filterset_fields = ['period', 'year', 'user']
    ordering_fields = ['year', 'month', 'quarter', 'target_amount']
    ordering = ['-year', '-month', '-quarter']

    @action(detail=False)
    def current_performance(self, request):
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        django_user = su.created_by
        now = timezone.now()
        year, month = now.year, now.month
        quarter = (month - 1) // 3 + 1
        monthly = SalesTarget.objects.filter(user=django_user, period='monthly', year=year, month=month).first()
        quarterly = SalesTarget.objects.filter(user=django_user, period='quarterly', year=year, quarter=quarter).first()
        yearly = SalesTarget.objects.filter(user=django_user, period='yearly', year=year).first()
        return Response({
            'monthly': SalesTargetSerializer(monthly).data if monthly else None,
            'quarterly': SalesTargetSerializer(quarterly).data if quarterly else None,
            'yearly': SalesTargetSerializer(yearly).data if yearly else None,
        })


class DashboardViewSet(viewsets.ViewSet):
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]

    def _get_company(self, request):
        su = getattr(request, 'service_user', None)
        return su.company if su else None

    def list(self, request):
        company = self._get_company(request)
        if not company:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            stats = CRMQueryOptimizer.get_dashboard_stats_optimized(company)
            return Response(DashboardStatsSerializer(stats).data)
        except Exception as e:
            logger.error(f"Dashboard Error: {e}", exc_info=True)
            return Response({'error': f'Dashboard error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False)
    def recent_activities(self, request):
        company = self._get_company(request)
        if not company:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        activities = Activity.objects.filter(company=company).order_by('-created_at')[:10]
        return Response(ActivitySerializer(activities, many=True).data)

    @action(detail=False)
    def sales_funnel(self, request):
        company = self._get_company(request)
        if not company:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(CRMQueryOptimizer.get_sales_funnel_optimized(company))

    @action(detail=False)
    def ai_insights(self, request):
        company = self._get_company(request)
        if not company:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        from .ai_analytics import SmartInsightsGenerator
        insights = SmartInsightsGenerator(company).generate_daily_insights()
        return Response({'insights': insights, 'generated_at': timezone.now().isoformat()})

    @action(detail=False)
    def lead_intelligence(self, request):
        company = self._get_company(request)
        if not company:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        from .ai_analytics import AdvancedAnalytics
        return Response(AdvancedAnalytics(company).get_lead_intelligence_dashboard())

    @action(detail=False)
    def sales_forecast(self, request):
        company = self._get_company(request)
        if not company:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        from .ai_analytics import AdvancedAnalytics
        period_days = int(request.query_params.get('period_days', 90))
        return Response(AdvancedAnalytics(company).get_sales_forecast_dashboard(period_days))

    @action(detail=False)
    def customer_health(self, request):
        company = self._get_company(request)
        if not company:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        from .ai_analytics import AdvancedAnalytics
        return Response(AdvancedAnalytics(company).get_customer_health_insights())

    @action(detail=False)
    def conversation_intelligence(self, request):
        company = self._get_company(request)
        if not company:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        from .ai_analytics import AdvancedAnalytics
        return Response(AdvancedAnalytics(company).get_conversation_intelligence_insights())

    @action(detail=False)
    def performance_analytics(self, request):
        company = self._get_company(request)
        if not company:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        from .ai_analytics import AdvancedAnalytics
        return Response(AdvancedAnalytics(company).get_performance_analytics())

    @action(detail=False)
    def weekly_report(self, request):
        company = self._get_company(request)
        if not company:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        from .ai_analytics import SmartInsightsGenerator
        return Response(SmartInsightsGenerator(company).generate_weekly_report())
