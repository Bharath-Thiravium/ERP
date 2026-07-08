from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import permissions
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum, Avg, F
from django.utils import timezone
from datetime import datetime, timedelta
from .models import PipelineStage, Deal, DealStageHistory, SalesQuota
from .serializers import PipelineStageSerializer, DealSerializer, DealStageHistorySerializer, SalesQuotaSerializer
from .views import CRMBaseViewSet


class PipelineStageViewSet(CRMBaseViewSet):
    queryset = PipelineStage.objects.all()
    serializer_class = PipelineStageSerializer
    filterset_fields = ['is_active']
    ordering_fields = ['order', 'name']
    ordering = ['order']
    
    def list(self, request, *args, **kwargs):
        """Override list to create default stages if none exist"""
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        company = su.company

        default_stages = [
            {'name': 'Prospecting', 'order': 1, 'probability': 10},
            {'name': 'Qualification', 'order': 2, 'probability': 25},
            {'name': 'Needs Analysis', 'order': 3, 'probability': 50},
            {'name': 'Proposal', 'order': 4, 'probability': 75},
            {'name': 'Negotiation', 'order': 5, 'probability': 90},
            {'name': 'Closed Won', 'order': 6, 'probability': 100},
            {'name': 'Closed Lost', 'order': 7, 'probability': 0},
        ]
        # Ensure ALL default stages exist — not just check if any exist
        existing_names = set(PipelineStage.objects.filter(company=company).values_list('name', flat=True))
        for stage_data in default_stages:
            if stage_data['name'] not in existing_names:
                PipelineStage.objects.create(company=company, **stage_data)

        return super().list(request, *args, **kwargs)


class DealViewSet(CRMBaseViewSet):
    queryset = Deal.objects.all()
    serializer_class = DealSerializer
    filterset_fields = ['status', 'current_stage', 'owner']
    search_fields = ['name', 'account__name', 'description']
    ordering_fields = ['created_at', 'expected_close_date', 'value']
    ordering = ['-created_at']

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_stage_id = instance.current_stage_id
        response = super().update(request, *args, **kwargs)
        instance.refresh_from_db()
        if old_stage_id != instance.current_stage_id:
            su = self._get_service_user()
            DealStageHistory.objects.create(
                deal=instance,
                stage=instance.current_stage,
                changed_by=su.created_by,
                notes='Stage updated via edit',
            )
        return response

    @action(detail=False)
    def pipeline_overview(self, request):
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        company = su.company

        # Get pipeline data by stage
        pipeline_data = []
        stages = PipelineStage.objects.filter(company=company, is_active=True).order_by('order')
        
        for stage in stages:
            deals = Deal.objects.filter(
                company=company,
                current_stage=stage,
                status='open'
            ).select_related(
                'account',
                'contact',
                'owner',
                'current_stage',
                'opportunity',
            ).order_by('expected_close_date', '-value')
            stage_data = {
                'stage': PipelineStageSerializer(stage).data,
                'deals_count': deals.count(),
                'total_value': deals.aggregate(Sum('value'))['value__sum'] or 0,
                'weighted_value': sum(deal.weighted_value for deal in deals),
                'avg_days_in_stage': 0,  # Calculate separately since it's a property
                'deals': DealSerializer(deals, many=True).data
            }
            pipeline_data.append(stage_data)
        
        return Response(pipeline_data)

    @action(detail=True, methods=['post'])
    def move_stage(self, request, pk=None):
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        service_user = su

        deal = self.get_object()
        new_stage_id = request.data.get('stage_id')
        notes = request.data.get('notes', '')

        try:
            new_stage = PipelineStage.objects.get(id=new_stage_id, company=deal.company)
        except PipelineStage.DoesNotExist:
            return Response({'error': 'Invalid stage'}, status=status.HTTP_400_BAD_REQUEST)

        # Calculate duration in previous stage
        previous_history = deal.stage_history.filter(stage=deal.current_stage).order_by('-changed_at').first()
        duration_days = None
        if previous_history:
            duration_days = (timezone.now().date() - previous_history.changed_at.date()).days

        # Create stage history entry
        DealStageHistory.objects.create(
            deal=deal,
            stage=new_stage,
            changed_by=su.created_by,
            notes=notes,
            duration_days=duration_days
        )

        # Update deal
        deal.current_stage = new_stage
        deal.probability = new_stage.probability
        stage_name = (new_stage.name or '').strip().lower()
        if stage_name == 'closed won':
            deal.status = 'won'
            deal.actual_close_date = timezone.now().date()
        elif stage_name == 'closed lost':
            deal.status = 'lost'
            deal.actual_close_date = timezone.now().date()
        else:
            deal.status = 'open'
            deal.actual_close_date = None
        deal.save()

        if deal.opportunity_id:
            opportunity_stage_map = {
                'prospecting': 'prospecting',
                'qualification': 'qualification',
                'needs analysis': 'needs_analysis',
                'proposal': 'proposal',
                'negotiation': 'negotiation',
                'closed won': 'closed_won',
                'closed lost': 'closed_lost',
            }
            deal.opportunity.stage = opportunity_stage_map.get(stage_name, 'prospecting')
            deal.opportunity.probability = deal.probability
            if deal.opportunity.stage in ['closed_won', 'closed_lost']:
                deal.opportunity.closed_date = timezone.now().date()
            else:
                deal.opportunity.closed_date = None
            deal.opportunity.save(update_fields=['stage', 'probability', 'closed_date', 'updated_at'])

        return Response(DealSerializer(deal).data)

    @action(detail=False)
    def velocity_metrics(self, request):
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        company = su.company

        # Calculate velocity metrics
        closed_deals = Deal.objects.filter(
            company=company,
            status__in=['won', 'lost'],
            actual_close_date__isnull=False
        )

        won_deals = closed_deals.filter(status='won')
        
        metrics = {
            'avg_sales_cycle': 0,
            'win_rate': 0,
            'avg_deal_size': 0,
            'conversion_rate_by_stage': [],
            'velocity_trend': []
        }

        if closed_deals.exists():
            # Average sales cycle (days from creation to close)
            cycle_days = []
            for deal in closed_deals:
                days = (deal.actual_close_date - deal.created_at.date()).days
                cycle_days.append(days)
            metrics['avg_sales_cycle'] = sum(cycle_days) / len(cycle_days) if cycle_days else 0

            # Win rate
            metrics['win_rate'] = (won_deals.count() / closed_deals.count()) * 100

            # Average deal size
            metrics['avg_deal_size'] = won_deals.aggregate(Avg('value'))['value__avg'] or 0

        return Response(metrics)


class DealStageHistoryViewSet(CRMBaseViewSet):
    queryset = DealStageHistory.objects.all()
    serializer_class = DealStageHistorySerializer
    company_lookup = 'deal__company'
    filterset_fields = ['deal', 'stage']
    ordering = ['-changed_at']


class SalesQuotaViewSet(CRMBaseViewSet):
    queryset = SalesQuota.objects.all()
    serializer_class = SalesQuotaSerializer
    filterset_fields = ['period', 'year', 'user']
    ordering = ['-year', '-month', '-quarter']

    @action(detail=False)
    def performance_dashboard(self, request):
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        company = su.company

        current_year = timezone.now().year
        current_month = timezone.now().month
        current_quarter = (current_month - 1) // 3 + 1

        # Get all quotas for current periods
        quotas = SalesQuota.objects.filter(company=company)
        
        performance_data = {
            'monthly_performance': [],
            'quarterly_performance': [],
            'yearly_performance': [],
            'team_leaderboard': []
        }

        # Monthly performance
        monthly_quotas = quotas.filter(period='monthly', year=current_year, month=current_month)
        for quota in monthly_quotas:
            performance_data['monthly_performance'].append({
                'user': quota.user.get_full_name(),
                'quota': float(quota.quota_amount),
                'achieved': float(quota.achieved_amount),
                'percentage': quota.achievement_percentage,
                'deals_target': quota.deals_target,
                'deals_achieved': quota.deals_achieved
            })

        # Quarterly performance
        quarterly_quotas = quotas.filter(period='quarterly', year=current_year, quarter=current_quarter)
        for quota in quarterly_quotas:
            performance_data['quarterly_performance'].append({
                'user': quota.user.get_full_name(),
                'quota': float(quota.quota_amount),
                'achieved': float(quota.achieved_amount),
                'percentage': quota.achievement_percentage,
                'deals_target': quota.deals_target,
                'deals_achieved': quota.deals_achieved
            })

        # Yearly performance
        yearly_quotas = quotas.filter(period='yearly', year=current_year)
        for quota in yearly_quotas:
            performance_data['yearly_performance'].append({
                'user': quota.user.get_full_name(),
                'quota': float(quota.quota_amount),
                'achieved': float(quota.achieved_amount),
                'percentage': quota.achievement_percentage,
                'deals_target': quota.deals_target,
                'deals_achieved': quota.deals_achieved
            })

        return Response(performance_data)
