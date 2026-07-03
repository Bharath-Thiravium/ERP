from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import permissions
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum, Avg, F
from django.utils import timezone
from datetime import datetime, timedelta
from .models import CustomerInteraction, CustomerHealthScore, CustomerSegment, CustomerSegmentMembership, SalesAnalytics, Account, Deal
from .serializers import CustomerInteractionSerializer, CustomerHealthScoreSerializer, CustomerSegmentSerializer, SalesAnalyticsSerializer
from .views import CRMBaseViewSet
import random


class CustomerInteractionViewSet(CRMBaseViewSet):
    queryset = CustomerInteraction.objects.all()
    serializer_class = CustomerInteractionSerializer
    filterset_fields = ['interaction_type', 'contact', 'account', 'deal']
    search_fields = ['subject', 'description']
    ordering_fields = ['interaction_date', 'created_at']
    ordering = ['-interaction_date']

    @action(detail=False)
    def interaction_timeline(self, request):
        account_id = request.query_params.get('account_id')
        contact_id = request.query_params.get('contact_id')
        
        queryset = self.get_queryset()
        
        if account_id:
            queryset = queryset.filter(account_id=account_id)
        if contact_id:
            queryset = queryset.filter(contact_id=contact_id)
            
        interactions = queryset.order_by('-interaction_date')[:50]
        serializer = self.get_serializer(interactions, many=True)
        return Response(serializer.data)

    @action(detail=False)
    def interaction_summary(self, request):
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        company = su.company

        # Get interaction statistics with secure queries
        interactions = CustomerInteraction.objects.filter(company=company)
        
        # Last 30 days
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_interactions = interactions.filter(interaction_date__gte=thirty_days_ago)
        
        summary = {
            'total_interactions': interactions.count(),
            'recent_interactions': recent_interactions.count(),
            'interactions_by_type': list(recent_interactions.values('interaction_type').annotate(count=Count('id'))),
            'top_accounts': list(recent_interactions.select_related('account').values('account__name').annotate(count=Count('id')).order_by('-count')[:10]),
            'avg_interactions_per_account': recent_interactions.values('account').distinct().count()
        }
        
        return Response(summary)


class CustomerHealthScoreViewSet(CRMBaseViewSet):
    queryset = CustomerHealthScore.objects.all()
    serializer_class = CustomerHealthScoreSerializer
    filterset_fields = ['health_status', 'account']
    ordering_fields = ['overall_score', 'last_calculated']
    ordering = ['-overall_score']

    def get_queryset(self):
        su = self._get_service_user()
        if not su:
            return self.queryset.none()
        return self.queryset.filter(account__company=su.company)

    @action(detail=False, methods=['post'])
    def calculate_scores(self, request):
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        company = su.company

        account_ids = request.data.get('account_ids', [])
        
        if not account_ids:
            # Calculate for all accounts if none specified
            accounts = Account.objects.filter(company=company, is_active=True)
        else:
            accounts = Account.objects.filter(company=company, id__in=account_ids)

        calculated_count = 0
        
        for account in accounts:
            health_score, created = CustomerHealthScore.objects.get_or_create(account=account)
            
            # Calculate engagement score (based on interactions)
            thirty_days_ago = timezone.now() - timedelta(days=30)
            recent_interactions = CustomerInteraction.objects.filter(
                account=account,
                interaction_date__gte=thirty_days_ago
            ).count()
            health_score.engagement_score = min(100, recent_interactions * 10)
            
            # Calculate satisfaction score (based on support tickets)
            from .models import Ticket
            recent_tickets = Ticket.objects.filter(
                account=account,
                created_at__gte=thirty_days_ago
            )
            if recent_tickets.exists():
                avg_satisfaction = recent_tickets.filter(
                    satisfaction_rating__isnull=False
                ).aggregate(Avg('satisfaction_rating'))['satisfaction_rating__avg']
                health_score.satisfaction_score = int((avg_satisfaction or 3) * 20) if avg_satisfaction else 60
            else:
                health_score.satisfaction_score = 75  # Default good score if no tickets
            
            # Calculate usage score (simulated - would be based on actual product usage)
            health_score.usage_score = random.randint(40, 95)
            
            # Calculate financial score (based on deal value and payment history)
            total_deal_value = Deal.objects.filter(
                account=account,
                status='won'
            ).aggregate(Sum('value'))['value__sum'] or 0
            
            if total_deal_value > 100000:
                health_score.financial_score = 90
            elif total_deal_value > 50000:
                health_score.financial_score = 75
            elif total_deal_value > 10000:
                health_score.financial_score = 60
            else:
                health_score.financial_score = 40
            
            # Calculate overall score and save
            health_score.calculate_overall_score()
            
            # Generate risk factors and recommendations
            risk_factors = []
            recommendations = []
            
            if health_score.engagement_score < 30:
                risk_factors.append("Low engagement - minimal recent interactions")
                recommendations.append("Schedule regular check-in meetings")
            
            if health_score.satisfaction_score < 50:
                risk_factors.append("Low satisfaction scores from support tickets")
                recommendations.append("Conduct customer satisfaction survey")
            
            if health_score.overall_score < 40:
                health_score.churn_risk = 0.8
                recommendations.append("Immediate intervention required - high churn risk")
            elif health_score.overall_score > 80:
                health_score.upsell_opportunity = 0.7
                recommendations.append("Excellent relationship - explore upsell opportunities")
            
            health_score.risk_factors = risk_factors
            health_score.recommendations = recommendations
            health_score.save()
            
            calculated_count += 1
        
        return Response({
            'message': f'Health scores calculated for {calculated_count} accounts',
            'calculated_count': calculated_count
        })

    @action(detail=False)
    def health_dashboard(self, request):
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        company = su.company

        # Get health score statistics
        health_scores = CustomerHealthScore.objects.filter(account__company=company)
        
        dashboard_data = {
            'total_accounts': health_scores.count(),
            'health_distribution': list(health_scores.values('health_status').annotate(count=Count('id'))),
            'avg_health_score': health_scores.aggregate(Avg('overall_score'))['overall_score__avg'] or 0,
            'high_risk_accounts': health_scores.filter(churn_risk__gte=0.7).count(),
            'upsell_opportunities': health_scores.filter(upsell_opportunity__gte=0.7).count(),
            'recent_calculations': health_scores.filter(
                last_calculated__gte=timezone.now() - timedelta(days=7)
            ).count()
        }
        
        return Response(dashboard_data)

    @action(detail=False)
    def at_risk_accounts(self, request):
        queryset = self.get_queryset().filter(
            Q(health_status__in=['poor', 'critical']) | Q(churn_risk__gte=0.6)
        ).order_by('-churn_risk', 'overall_score')
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class CustomerSegmentViewSet(CRMBaseViewSet):
    queryset = CustomerSegment.objects.all()
    serializer_class = CustomerSegmentSerializer
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering = ['name']

    @action(detail=True, methods=['post'])
    def add_accounts(self, request, pk=None):
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        segment = self.get_object()
        account_ids = request.data.get('account_ids', [])
        
        added_count = 0
        for account_id in account_ids:
            try:
                account = Account.objects.get(id=account_id, company=segment.company)
                membership, created = CustomerSegmentMembership.objects.get_or_create(
                    segment=segment,
                    account=account,
                    defaults={'added_by': su.created_by}
                )
                if created:
                    added_count += 1
            except Account.DoesNotExist:
                continue
        
        return Response({
            'message': f'{added_count} accounts added to segment',
            'added_count': added_count
        })

    @action(detail=True)
    def accounts(self, request, pk=None):
        segment = self.get_object()
        memberships = segment.memberships.all()
        
        accounts_data = []
        for membership in memberships:
            account_data = {
                'id': membership.account.id,
                'name': membership.account.name,
                'account_type': membership.account.account_type,
                'industry': membership.account.industry,
                'added_at': membership.added_at
            }
            accounts_data.append(account_data)
        
        return Response(accounts_data)


class SalesAnalyticsViewSet(CRMBaseViewSet):
    queryset = SalesAnalytics.objects.all()
    serializer_class = SalesAnalyticsSerializer
    filterset_fields = ['metric_type', 'period', 'year', 'month']
    ordering = ['-date']

    @action(detail=False, methods=['post'])
    def calculate_metrics(self, request):
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        company = su.company

        period = request.data.get('period', 'monthly')
        date_str = request.data.get('date', timezone.now().date().isoformat())
        calculation_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # Calculate various metrics
        metrics_calculated = 0
        
        # Conversion Rate
        total_leads = company.leads.filter(created_at__date=calculation_date).count()
        converted_leads = company.leads.filter(
            created_at__date=calculation_date,
            status='won'
        ).count()
        
        if total_leads > 0:
            conversion_rate = (converted_leads / total_leads) * 100
            SalesAnalytics.objects.update_or_create(
                company=company,
                metric_type='conversion_rate',
                period=period,
                date=calculation_date,
                defaults={
                    'value': conversion_rate,
                    'count': total_leads,
                    'year': calculation_date.year,
                    'month': calculation_date.month,
                    'metadata': {'converted_leads': converted_leads}
                }
            )
            metrics_calculated += 1
        
        # Average Deal Size
        won_deals = Deal.objects.filter(
            company=company,
            status='won',
            actual_close_date=calculation_date
        )
        
        if won_deals.exists():
            avg_deal_size = won_deals.aggregate(Avg('value'))['value__avg']
            SalesAnalytics.objects.update_or_create(
                company=company,
                metric_type='avg_deal_size',
                period=period,
                date=calculation_date,
                defaults={
                    'value': avg_deal_size,
                    'count': won_deals.count(),
                    'year': calculation_date.year,
                    'month': calculation_date.month
                }
            )
            metrics_calculated += 1
        
        # Win Rate
        closed_deals = Deal.objects.filter(
            company=company,
            status__in=['won', 'lost'],
            actual_close_date=calculation_date
        )
        
        if closed_deals.exists():
            won_deals_count = closed_deals.filter(status='won').count()
            win_rate = (won_deals_count / closed_deals.count()) * 100
            SalesAnalytics.objects.update_or_create(
                company=company,
                metric_type='win_rate',
                period=period,
                date=calculation_date,
                defaults={
                    'value': win_rate,
                    'count': closed_deals.count(),
                    'year': calculation_date.year,
                    'month': calculation_date.month,
                    'metadata': {'won_deals': won_deals_count}
                }
            )
            metrics_calculated += 1
        
        return Response({
            'message': f'{metrics_calculated} metrics calculated for {calculation_date}',
            'metrics_calculated': metrics_calculated
        })

    @action(detail=False)
    def analytics_dashboard(self, request):
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        company = su.company

        # Get recent analytics data
        thirty_days_ago = timezone.now().date() - timedelta(days=30)
        analytics = SalesAnalytics.objects.filter(
            company=company,
            date__gte=thirty_days_ago
        ).order_by('-date')
        
        dashboard_data = {
            'conversion_rate_trend': [],
            'avg_deal_size_trend': [],
            'win_rate_trend': [],
            'key_metrics': {}
        }
        
        # Group by metric type
        for metric_type in ['conversion_rate', 'avg_deal_size', 'win_rate']:
            metric_data = analytics.filter(metric_type=metric_type).order_by('date')
            trend_data = []
            
            for metric in metric_data:
                trend_data.append({
                    'date': metric.date,
                    'value': float(metric.value),
                    'count': metric.count
                })
            
            dashboard_data[f'{metric_type}_trend'] = trend_data
            
            # Latest value for key metrics
            latest_metric = metric_data.last()
            if latest_metric:
                dashboard_data['key_metrics'][metric_type] = {
                    'current_value': float(latest_metric.value),
                    'date': latest_metric.date
                }
        
        return Response(dashboard_data)