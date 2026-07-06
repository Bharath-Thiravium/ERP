from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from datetime import timedelta
from .models import (
    ServiceUtilization, CompanyAnalytics, ServiceUserActivity,
    CompanyNotification, ServiceConfiguration, ActivityLog
)
from .serializers import (
    ServiceUtilizationSerializer, CompanyAnalyticsSerializer,
    ServiceUserActivitySerializer, CompanyNotificationSerializer,
    ServiceConfigurationSerializer, ActivityLogSerializer,
    DataSharingPolicySerializer, SyncApprovalRequestSerializer
)
from authentication.models import Company, Service, CompanyServiceUser
from common.models import SyncApprovalRequest
from common.sync_services import approve_sync_request, get_data_sharing_policy, reject_sync_request


class DataSharingPolicyView(APIView):
    """View and update current company's cross-service data sharing policy."""
    permission_classes = [IsAuthenticated]

    def get_company(self, request):
        if not hasattr(request.user, 'company_user'):
            return None
        return request.user.company_user.company

    def get(self, request):
        company = self.get_company(request)
        if not company:
            return Response(
                {'error': 'Only company users can manage data sharing.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        policy = get_data_sharing_policy(company)
        serializer = DataSharingPolicySerializer(policy)
        return Response(serializer.data)

    def patch(self, request):
        company = self.get_company(request)
        if not company:
            return Response(
                {'error': 'Only company users can manage data sharing.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        policy = get_data_sharing_policy(company)
        serializer = DataSharingPolicySerializer(policy, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class SyncApprovalRequestListView(APIView):
    """List current company's cross-service sync approval queue."""
    permission_classes = [IsAuthenticated]

    def get_company(self, request):
        if not hasattr(request.user, 'company_user'):
            return None
        return request.user.company_user.company

    def get(self, request):
        company = self.get_company(request)
        if not company:
            return Response(
                {'error': 'Only company users can view sync approvals.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        request_status = request.query_params.get('status')
        queryset = SyncApprovalRequest.objects.filter(company=company)
        if request_status:
            queryset = queryset.filter(status=request_status)
        serializer = SyncApprovalRequestSerializer(queryset[:100], many=True)
        return Response(serializer.data)


class SyncApprovalRequestActionView(APIView):
    """Approve or reject a sync approval request."""
    permission_classes = [IsAuthenticated]

    def get_company(self, request):
        if not hasattr(request.user, 'company_user'):
            return None
        return request.user.company_user.company

    def post(self, request, request_id, action):
        company = self.get_company(request)
        if not company:
            return Response(
                {'error': 'Only company users can review sync approvals.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            sync_request = SyncApprovalRequest.objects.get(pk=request_id, company=company)
        except SyncApprovalRequest.DoesNotExist:
            return Response({'error': 'Sync request not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            if action == 'approve':
                approve_sync_request(
                    sync_request,
                    reviewed_by=request.user,
                    approval_data=request.data.get('approval_data') or {},
                )
            elif action == 'reject':
                reject_sync_request(
                    sync_request,
                    reviewed_by=request.user,
                    reason=request.data.get('reason') or '',
                )
            else:
                return Response({'error': 'Unsupported action.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            sync_request.status = 'failed'
            sync_request.error_message = str(exc)
            sync_request.save(update_fields=['status', 'error_message'])
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        sync_request.refresh_from_db()
        return Response(SyncApprovalRequestSerializer(sync_request).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_dashboard_overview(request):
    """Get comprehensive company dashboard overview - real data only"""
    try:
        company = request.user.company_user.company
        
        # Basic stats - only real data for this company
        total_services = company.company_services.filter(is_active=True).count()
        total_service_users = CompanyServiceUser.objects.filter(company=company, is_active=True).count()
        
        # Service utilization - only for this company
        service_utilizations = ServiceUtilization.objects.filter(company=company)
        
        # Calculate enhanced metrics - real data only
        active_services = service_utilizations.filter(active_users__gt=0).count()
        total_data_entries = service_utilizations.aggregate(Sum('data_volume'))['data_volume__sum'] or 0
        
        # Most/least used services - only from this company's services
        most_used = service_utilizations.filter(usage_percentage__gt=0).order_by('-usage_percentage').first()
        least_used = service_utilizations.filter(usage_percentage__gt=0).order_by('usage_percentage').first()
        
        # Active users today - only this company's service users
        today = timezone.now().date()
        active_users_today = ServiceUserActivity.objects.filter(
            service_user__company=company,
            service_user__is_active=True,
            last_login__date=today
        ).count()
        
        # Enhanced system health calculation - based on real usage
        health_score = 0
        
        # Factor 1: Service availability (40% weight)
        if total_services > 0:
            health_score += 40
        
        # Factor 2: Service users created (30% weight)
        if total_service_users > 0:
            health_score += 30
        
        # Factor 3: Service utilization (20% weight)
        avg_usage = service_utilizations.aggregate(Avg('usage_percentage'))['usage_percentage__avg'] or 0
        if avg_usage > 0:
            if avg_usage >= 60:
                health_score += 20
            elif avg_usage >= 30:
                health_score += 15
            else:
                health_score += 10
        
        # Factor 4: Recent activity (10% weight)
        if active_users_today > 0:
            health_score += 10
        
        # Calculate final health status
        if health_score >= 85:
            system_health = 'excellent'
        elif health_score >= 65:
            system_health = 'good'
        elif health_score >= 40:
            system_health = 'fair'
        else:
            system_health = 'poor'
        
        # Monthly growth calculation - only company activities
        last_month = timezone.now() - timedelta(days=30)
        current_month_activities = ActivityLog.objects.filter(
            company=company,
            timestamp__gte=last_month
        ).count()
        
        previous_month = timezone.now() - timedelta(days=60)
        previous_month_activities = ActivityLog.objects.filter(
            company=company,
            timestamp__gte=previous_month,
            timestamp__lt=last_month
        ).count()
        
        monthly_growth = 0
        if previous_month_activities > 0:
            monthly_growth = ((current_month_activities - previous_month_activities) / previous_month_activities) * 100
        elif current_month_activities > 0:
            monthly_growth = 100  # 100% growth if no previous data but current activity exists
        
        # Service utilization percentage
        service_utilization_rate = (active_services / max(total_services, 1)) * 100 if total_services > 0 else 0
        
        overview_data = {
            'total_services': total_services,
            'total_service_users': total_service_users,
            'active_services': active_services,
            'service_utilization_rate': round(service_utilization_rate, 2),
            'total_data_entries': total_data_entries,
            'active_users_today': active_users_today,
            'monthly_growth': round(monthly_growth, 2),
            'system_health': system_health,
            'most_used_service': most_used.service.name if most_used else 'None',
            'least_used_service': least_used.service.name if least_used else 'None',
        }
        
        return Response(overview_data)
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def service_utilization_stats(request):
    """Get detailed service utilization statistics"""
    try:
        company = request.user.company_user.company
        utilizations = ServiceUtilization.objects.filter(company=company).select_related('service')
        
        stats = []
        for util in utilizations:
            stats.append({
                'service_name': util.service.name,
                'service_type': util.service.service_type,
                'total_users': util.total_users,
                'active_users': util.active_users,
                'usage_percentage': util.usage_percentage,
                'data_volume': util.data_volume,
                'last_activity': util.last_activity,
                'status': 'active' if util.active_users > 0 else 'inactive'
            })
        
        return Response(stats)
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def service_user_activities(request):
    """Get service user activity monitoring data - only for current company"""
    try:
        company = request.user.company_user.company
        
        # Only get activities for service users belonging to this company
        activities = ServiceUserActivity.objects.filter(
            service_user__company=company,
            service_user__is_active=True
        ).select_related('service_user')
        
        activity_data = []
        for activity in activities:
            activity_data.append({
                'user_id': activity.service_user.id,
                'username': activity.service_user.username,
                'full_name': activity.service_user.full_name,
                'service_type': activity.service_type,
                'last_login': activity.last_login,
                'total_sessions': activity.total_sessions,
                'actions_performed': activity.actions_performed,
                'status': activity.status,
                'session_duration': activity.session_duration
            })
        
        return Response(activity_data)
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class CompanyNotificationListView(generics.ListCreateAPIView):
    """List and create company notifications"""
    serializer_class = CompanyNotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        company = self.request.user.company_user.company
        return CompanyNotification.objects.filter(company=company)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """Mark a notification as read"""
    try:
        company = request.user.company_user.company
        notification = CompanyNotification.objects.get(
            id=notification_id, 
            company=company
        )
        notification.read = True
        notification.read_at = timezone.now()
        notification.save()
        
        return Response({'message': 'Notification marked as read'})
        
    except CompanyNotification.DoesNotExist:
        return Response(
            {'error': 'Notification not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def activity_logs(request):
    """Get company activity logs - only for current company and its users"""
    try:
        company = request.user.company_user.company
        
        # Get logs for this company only, exclude superuser activities
        logs = ActivityLog.objects.filter(
            company=company
        ).exclude(
            user__is_superuser=True
        ).select_related('user')[:50]
        
        log_data = []
        for log in logs:
            log_data.append({
                'id': log.id,
                'action_type': log.action_type,
                'description': log.description,
                'service_type': log.service_type,
                'user_email': log.user.email if log.user else 'System',
                'timestamp': log.timestamp,
                'ip_address': log.ip_address
            })
        
        return Response(log_data)
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_activity(request):
    """Log a company dashboard activity"""
    try:
        company = request.user.company_user.company
        
        ActivityLog.objects.create(
            company=company,
            user=request.user,
            action_type=request.data.get('action_type'),
            description=request.data.get('description'),
            service_type=request.data.get('service_type'),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            metadata=request.data.get('metadata', {})
        )
        
        return Response({'message': 'Activity logged successfully'})
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_dashboard(request):
    """Get comprehensive analytics for company dashboard"""
    try:
        company = request.user.company_user.company
        
        # Get or create analytics record
        analytics, created = CompanyAnalytics.objects.get_or_create(
            company=company,
            defaults={
                'total_data_entries': 0,
                'monthly_growth': 0.0,
                'service_adoption_rate': {}
            }
        )
        
        # Calculate real-time analytics
        service_utilizations = ServiceUtilization.objects.filter(company=company)
        total_data = service_utilizations.aggregate(Sum('data_volume'))['data_volume__sum'] or 0
        
        # Service adoption rates
        total_services = company.company_services.count()
        active_services = service_utilizations.filter(active_users__gt=0).count()
        adoption_rate = (active_services / max(total_services, 1)) * 100
        
        # Update analytics
        analytics.total_data_entries = total_data
        analytics.service_adoption_rate = {'overall': adoption_rate}
        analytics.save()
        
        return Response(CompanyAnalyticsSerializer(analytics).data)
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def company_domain_settings(request):
    """Get or update company domain settings"""
    try:
        company = request.user.company_user.company
        
        if request.method == 'GET':
            return Response({
                'domain_name': company.domain_name or '',
                'company_name': company.name
            })
        
        elif request.method == 'POST':
            domain_name = request.data.get('domain_name', '').strip()
            
            # Basic validation
            if domain_name and not domain_name.replace('.', '').replace('-', '').isalnum():
                return Response(
                    {'message': 'Invalid domain format'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            company.domain_name = domain_name
            company.save()
            
            # Log activity
            ActivityLog.objects.create(
                company=company,
                user=request.user,
                action_type='update_settings',
                description=f'Updated company domain to: {domain_name}',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response({
                'message': 'Domain updated successfully',
                'domain_name': company.domain_name
            })
            
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
