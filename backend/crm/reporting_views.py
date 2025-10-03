from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import permissions
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum, Avg, F
from django.utils import timezone
from datetime import datetime, timedelta
from .phase3_models import ReportTemplate, Dashboard, BusinessIntelligence
from .models import Lead, Deal, Account
from .phase3_serializers import ReportTemplateSerializer, DashboardSerializer, BusinessIntelligenceSerializer
from authentication.models import ServiceUserSession
from .views import CRMBaseViewSet
import json


class ReportTemplateViewSet(CRMBaseViewSet):
    queryset = ReportTemplate.objects.all()
    serializer_class = ReportTemplateSerializer
    filterset_fields = ['report_type', 'chart_type', 'is_active']
    search_fields = ['name', 'description']
    ordering = ['-created_at']

    @action(detail=True)
    def generate(self, request, pk=None):
        template = self.get_object()
        session_key = self.get_session_key()
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

        # Generate report data based on template configuration
        report_data = self._generate_report_data(template, company)
        return Response(report_data)

    def _generate_report_data(self, template, company):
        if template.report_type == 'sales_performance':
            return self._generate_sales_performance(company)
        elif template.report_type == 'lead_analysis':
            return self._generate_lead_analysis(company)
        elif template.report_type == 'pipeline_forecast':
            return self._generate_pipeline_forecast(company)
        else:
            return {'data': [], 'summary': {}}

    def _generate_sales_performance(self, company):
        deals = Deal.objects.filter(company=company, status='won')
        monthly_data = deals.extra(
            select={'month': 'EXTRACT(month FROM created_at)'}
        ).values('month').annotate(
            total_value=Sum('value'),
            count=Count('id')
        ).order_by('month')
        
        return {
            'data': list(monthly_data),
            'summary': {
                'total_revenue': deals.aggregate(Sum('value'))['value__sum'] or 0,
                'total_deals': deals.count(),
                'avg_deal_size': deals.aggregate(Avg('value'))['value__avg'] or 0
            }
        }

    def _generate_lead_analysis(self, company):
        leads = Lead.objects.filter(company=company)
        status_data = leads.values('status').annotate(count=Count('id'))
        source_data = leads.values('source').annotate(count=Count('id'))
        
        return {
            'data': {
                'by_status': list(status_data),
                'by_source': list(source_data)
            },
            'summary': {
                'total_leads': leads.count(),
                'conversion_rate': (leads.filter(status='won').count() / leads.count() * 100) if leads.count() > 0 else 0
            }
        }

    def _generate_pipeline_forecast(self, company):
        deals = Deal.objects.filter(company=company, status='open')
        stage_data = deals.values('current_stage__name').annotate(
            total_value=Sum('value'),
            weighted_value=Sum(F('value') * F('probability') / 100),
            count=Count('id')
        )
        
        return {
            'data': list(stage_data),
            'summary': {
                'total_pipeline': deals.aggregate(Sum('value'))['value__sum'] or 0,
                'weighted_pipeline': sum(deal.weighted_value for deal in deals),
                'total_deals': deals.count()
            }
        }


class DashboardViewSet(CRMBaseViewSet):
    queryset = Dashboard.objects.all()
    serializer_class = DashboardSerializer
    search_fields = ['name', 'description']
    ordering = ['-created_at']

    @action(detail=True)
    def data(self, request, pk=None):
        dashboard = self.get_object()
        session_key = self.get_session_key()
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

        # Generate dashboard data based on widgets configuration
        dashboard_data = {}
        for widget in dashboard.widgets:
            widget_data = self._generate_widget_data(widget, company)
            dashboard_data[widget.get('id', 'widget')] = widget_data
        
        return Response(dashboard_data)

    def _generate_widget_data(self, widget, company):
        widget_type = widget.get('type', 'metric')
        
        if widget_type == 'sales_metrics':
            return {
                'total_revenue': Deal.objects.filter(company=company, status='won').aggregate(Sum('value'))['value__sum'] or 0,
                'total_deals': Deal.objects.filter(company=company).count(),
                'pipeline_value': Deal.objects.filter(company=company, status='open').aggregate(Sum('value'))['value__sum'] or 0
            }
        elif widget_type == 'lead_metrics':
            return {
                'total_leads': Lead.objects.filter(company=company).count(),
                'new_leads': Lead.objects.filter(company=company, created_at__gte=timezone.now() - timedelta(days=30)).count(),
                'conversion_rate': 25.5  # Placeholder
            }
        else:
            return {'value': 0}


class BusinessIntelligenceViewSet(CRMBaseViewSet):
    queryset = BusinessIntelligence.objects.all()
    serializer_class = BusinessIntelligenceSerializer
    filterset_fields = ['insight_type', 'priority', 'is_active', 'is_acknowledged']
    ordering = ['-created_at']

    @action(detail=False)
    def generate_insights(self, request):
        session_key = self.get_session_key()
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

        insights_generated = 0
        
        # Generate trend insights
        recent_deals = Deal.objects.filter(
            company=company,
            created_at__gte=timezone.now() - timedelta(days=30)
        )
        
        if recent_deals.count() > 0:
            avg_deal_value = recent_deals.aggregate(Avg('value'))['value__avg']
            if avg_deal_value > 50000:
                BusinessIntelligence.objects.create(
                    company=company,
                    insight_type='trend',
                    title='High Value Deals Trending Up',
                    description=f'Average deal value in the last 30 days is ${avg_deal_value:,.2f}, indicating strong market performance.',
                    priority='high',
                    data={'avg_deal_value': avg_deal_value, 'deal_count': recent_deals.count()},
                    recommended_actions=['Focus on high-value prospects', 'Analyze successful deal patterns']
                )
                insights_generated += 1
        
        # Generate pipeline alerts
        stale_deals = Deal.objects.filter(
            company=company,
            status='open',
            updated_at__lt=timezone.now() - timedelta(days=14)
        )
        
        if stale_deals.count() > 5:
            BusinessIntelligence.objects.create(
                company=company,
                insight_type='alert',
                title='Stale Deals Alert',
                description=f'{stale_deals.count()} deals have not been updated in over 14 days.',
                priority='medium',
                data={'stale_deal_count': stale_deals.count()},
                recommended_actions=['Review and update stale deals', 'Contact prospects for status updates']
            )
            insights_generated += 1
        
        return Response({
            'message': f'{insights_generated} insights generated',
            'insights_generated': insights_generated
        })

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        insight = self.get_object()
        session_key = self.get_session_key()
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            user = session.service_user.created_by
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        
        insight.is_acknowledged = True
        insight.acknowledged_by = user
        insight.acknowledged_at = timezone.now()
        insight.save()
        
        return Response({'message': 'Insight acknowledged'})

    @action(detail=False)
    def dashboard_insights(self, request):
        session_key = self.get_session_key()
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

        insights = BusinessIntelligence.objects.filter(
            company=company,
            is_active=True,
            is_acknowledged=False
        ).order_by('-priority', '-created_at')[:10]
        
        serializer = self.get_serializer(insights, many=True)
        return Response(serializer.data)