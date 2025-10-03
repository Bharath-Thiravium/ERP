from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import permissions
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum, Avg, F
from django.utils import timezone
from datetime import datetime, timedelta
from .phase3_models import EmailTemplate, MarketingCampaign, EmailSend, AutomationWorkflow
from .phase3_serializers import EmailTemplateSerializer, MarketingCampaignSerializer, EmailSendSerializer, AutomationWorkflowSerializer
from authentication.models import ServiceUserSession
from .views import CRMBaseViewSet


class EmailTemplateViewSet(CRMBaseViewSet):
    queryset = EmailTemplate.objects.all()
    serializer_class = EmailTemplateSerializer
    filterset_fields = ['template_type', 'is_active']
    search_fields = ['name', 'subject']
    ordering = ['-created_at']


class MarketingCampaignViewSet(CRMBaseViewSet):
    queryset = MarketingCampaign.objects.all()
    serializer_class = MarketingCampaignSerializer
    filterset_fields = ['campaign_type', 'status']
    search_fields = ['name', 'description']
    ordering = ['-created_at']

    @action(detail=True, methods=['post'])
    def launch(self, request, pk=None):
        campaign = self.get_object()
        campaign.status = 'running'
        campaign.save()
        return Response({'message': 'Campaign launched successfully'})

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        campaign = self.get_object()
        campaign.status = 'paused'
        campaign.save()
        return Response({'message': 'Campaign paused'})

    @action(detail=True)
    def analytics(self, request, pk=None):
        campaign = self.get_object()
        analytics_data = {
            'total_sent': campaign.total_sent,
            'total_delivered': campaign.total_delivered,
            'total_opened': campaign.total_opened,
            'total_clicked': campaign.total_clicked,
            'open_rate': campaign.open_rate,
            'click_rate': campaign.click_rate,
            'bounce_rate': (campaign.total_bounced / campaign.total_sent * 100) if campaign.total_sent > 0 else 0,
            'unsubscribe_rate': (campaign.total_unsubscribed / campaign.total_sent * 100) if campaign.total_sent > 0 else 0
        }
        return Response(analytics_data)


class EmailSendViewSet(CRMBaseViewSet):
    queryset = EmailSend.objects.all()
    serializer_class = EmailSendSerializer
    filterset_fields = ['campaign', 'status']
    ordering = ['-created_at']


class AutomationWorkflowViewSet(CRMBaseViewSet):
    queryset = AutomationWorkflow.objects.all()
    serializer_class = AutomationWorkflowSerializer
    filterset_fields = ['trigger_type', 'status']
    search_fields = ['name', 'description']
    ordering = ['-created_at']

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        workflow = self.get_object()
        workflow.status = 'active'
        workflow.save()
        return Response({'message': 'Workflow activated'})

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        workflow = self.get_object()
        workflow.status = 'paused'
        workflow.save()
        return Response({'message': 'Workflow paused'})

    @action(detail=True)
    def performance(self, request, pk=None):
        workflow = self.get_object()
        performance_data = {
            'total_triggered': workflow.total_triggered,
            'total_completed': workflow.total_completed,
            'completion_rate': (workflow.total_completed / workflow.total_triggered * 100) if workflow.total_triggered > 0 else 0,
            'recent_executions': workflow.executions.order_by('-started_at')[:10].count()
        }
        return Response(performance_data)