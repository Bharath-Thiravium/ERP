from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from datetime import datetime, timedelta
from authentication.models import ServiceUserSession
from .share_analytics_models import (
    JobShareAnalytics, ShareClickTracking, MessageTemplate, 
    BulkShareOperation, SharePerformanceMetrics, ShareCampaign
)
from .models import JobPosting, JobApplication
import json


class ShareAnalyticsViewSet(viewsets.ViewSet):
    """Share analytics and tracking views"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    
    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key
    
    @action(detail=False, methods=['post'])
    def track_share(self, request):
        """Track when a job is shared"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            job_id = request.data.get('job_id')
            platform = request.data.get('platform')
            
            if not job_id or not platform:
                return Response({'error': 'job_id and platform required'}, status=status.HTTP_400_BAD_REQUEST)
            
            job_posting = JobPosting.objects.get(id=job_id, company=session.service_user.company)
            
            # Create share analytics record
            share_analytics = JobShareAnalytics.objects.create(
                job_posting=job_posting,
                platform=platform,
                shared_by=session.service_user,
                utm_source=platform,
                utm_medium='social',
                utm_campaign='job_sharing',
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                ip_address=self._get_client_ip(request)
            )
            
            return Response({
                'success': True,
                'share_id': share_analytics.id,
                'tracking_url': f"{request.build_absolute_uri('/')[:-1]}/public/jobs/{job_id}?utm_source={platform}&utm_medium=social&utm_campaign=job_sharing&share_id={share_analytics.id}"
            })
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except JobPosting.DoesNotExist:
            return Response({'error': 'Job posting not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get sharing analytics dashboard data"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            # Date range filter
            days = int(request.query_params.get('days', 30))
            start_date = timezone.now() - timedelta(days=days)
            
            # Total shares
            total_shares = JobShareAnalytics.objects.filter(
                job_posting__company=company,
                shared_at__gte=start_date
            ).count()
            
            # Platform breakdown with actual application counts
            from django.db.models import Q
            
            # Get share analytics
            share_stats = JobShareAnalytics.objects.filter(
                job_posting__company=company,
                shared_at__gte=start_date
            ).values('platform').annotate(
                count=Count('id'),
                clicks=Sum('clicks_from_share')
            ).order_by('-count')
            
            # Get actual applications by source
            app_stats = JobApplication.objects.filter(
                job_posting__company=company,
                created_at__gte=start_date
            ).values('application_source').annotate(
                applications=Count('id')
            )
            
            # Debug logging
            print(f"Debug - Company: {company.name}")
            print(f"Debug - Date range: {start_date} to now")
            print(f"Debug - App stats: {list(app_stats)}")
            
            # Also check all applications regardless of date
            all_apps = JobApplication.objects.filter(
                job_posting__company=company
            ).values('application_source', 'share_id', 'first_name', 'last_name', 'created_at')
            print(f"Debug - All applications: {list(all_apps)}")
            
            # Combine share and application data
            platform_stats = []
            for share_stat in share_stats:
                platform = share_stat['platform']
                app_count = 0
                for app_stat in app_stats:
                    if app_stat['application_source'] == platform:
                        app_count = app_stat['applications']
                        break
                
                platform_stats.append({
                    'platform': platform,
                    'count': share_stat['count'],
                    'clicks': share_stat['clicks'] or 0,
                    'applications': app_count
                })
            
            # Add platforms that have applications but no shares tracked
            tracked_platforms = [stat['platform'] for stat in platform_stats]
            for app_stat in app_stats:
                if app_stat['application_source'] not in tracked_platforms and app_stat['application_source'] != 'direct':
                    platform_stats.append({
                        'platform': app_stat['application_source'],
                        'count': 0,
                        'clicks': 0,
                        'applications': app_stat['applications']
                    })
            
            # Top performing jobs
            top_jobs = JobShareAnalytics.objects.filter(
                job_posting__company=company,
                shared_at__gte=start_date
            ).values(
                'job_posting__id',
                'job_posting__title'
            ).annotate(
                shares=Count('id'),
                clicks=Sum('clicks_from_share'),
                applications=Sum('applications_from_share')
            ).order_by('-shares')[:5]
            
            # Top sharers
            top_sharers = JobShareAnalytics.objects.filter(
                job_posting__company=company,
                shared_at__gte=start_date
            ).values(
                'shared_by__username',
                'shared_by__full_name'
            ).annotate(
                shares=Count('id')
            ).order_by('-shares')[:5]
            
            # Daily share trends
            daily_trends = []
            for i in range(days):
                date = (timezone.now() - timedelta(days=i)).date()
                shares = JobShareAnalytics.objects.filter(
                    job_posting__company=company,
                    shared_at__date=date
                ).count()
                daily_trends.append({
                    'date': date.isoformat(),
                    'shares': shares
                })
            
            print(f"Debug - Final platform_stats: {platform_stats}")
            
            return Response({
                'total_shares': total_shares,
                'platform_stats': list(platform_stats),
                'top_jobs': list(top_jobs),
                'top_sharers': list(top_sharers),
                'daily_trends': daily_trends[::-1],  # Reverse to show oldest first
                'date_range': f"Last {days} days"
            })
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='job/(?P<job_id>[^/.]+)')
    def job_analytics(self, request, job_id=None):
        """Get analytics for a specific job"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            job_posting = JobPosting.objects.get(id=job_id, company=session.service_user.company)
            
            # Platform performance for this job
            platform_stats = JobShareAnalytics.objects.filter(
                job_posting=job_posting
            ).values('platform').annotate(
                shares=Count('id'),
                clicks=Sum('clicks_from_share'),
                applications=Sum('applications_from_share')
            ).order_by('-shares')
            
            return Response({
                'total_shares': sum(p['shares'] for p in platform_stats),
                'total_clicks': sum(p['clicks'] or 0 for p in platform_stats),
                'total_applications': sum(p['applications'] or 0 for p in platform_stats),
                'platform_stats': list(platform_stats)
            })
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except JobPosting.DoesNotExist:
            return Response({'error': 'Job posting not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def templates(self, request):
        """Get message templates"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            templates = MessageTemplate.objects.filter(
                company=company,
                is_active=True
            ).order_by('-is_default', 'name')
            
            templates_data = [{
                'id': template.id,
                'name': template.name,
                'template_type': template.template_type,
                'template_content': template.template_content,
                'is_default': template.is_default,
                'created_at': template.created_at
            } for template in templates]
            
            return Response(templates_data)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class MessageTemplateViewSet(viewsets.ViewSet):
    """Message template management"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    
    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key
    
    def list(self, request):
        """Get all message templates for company"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            templates = MessageTemplate.objects.filter(
                company=company,
                is_active=True
            ).order_by('-is_default', 'name')
            
            templates_data = [{
                'id': template.id,
                'name': template.name,
                'template_type': template.template_type,
                'template_content': template.template_content,
                'is_default': template.is_default,
                'created_at': template.created_at
            } for template in templates]
            
            return Response(templates_data)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def create(self, request):
        """Create new message template"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            template = MessageTemplate.objects.create(
                company=session.service_user.company,
                name=request.data.get('name'),
                template_type=request.data.get('template_type', 'custom'),
                template_content=request.data.get('template_content'),
                created_by=session.service_user
            )
            
            return Response({
                'id': template.id,
                'name': template.name,
                'message': 'Template created successfully'
            }, status=status.HTTP_201_CREATED)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def destroy(self, request, pk=None):
        """Delete message template"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            template = MessageTemplate.objects.get(
                id=pk, 
                company=session.service_user.company
            )
            template.delete()
            
            return Response({'message': 'Template deleted successfully'})
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except MessageTemplate.DoesNotExist:
            return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def track_click(request):
    """Track clicks on shared job links (public endpoint)"""
    try:
        share_id = request.data.get('share_id')
        if not share_id:
            return Response({'error': 'share_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        share_analytics = JobShareAnalytics.objects.get(id=share_id)
        
        # Create click tracking record
        ShareClickTracking.objects.create(
            share_analytics=share_analytics,
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            referrer=request.META.get('HTTP_REFERER', '')
        )
        
        # Update share analytics
        share_analytics.clicks_from_share += 1
        share_analytics.save()
        
        return Response({'success': True})
        
    except JobShareAnalytics.DoesNotExist:
        return Response({'error': 'Share not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def track_application_from_share(request):
    """Track when an application comes from a shared link"""
    try:
        share_id = request.data.get('share_id')
        application_id = request.data.get('application_id')
        
        if not share_id or not application_id:
            return Response({'error': 'share_id and application_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        share_analytics = JobShareAnalytics.objects.get(id=share_id)
        application = JobApplication.objects.get(id=application_id)
        
        # Update share analytics
        share_analytics.applications_from_share += 1
        share_analytics.save()
        
        return Response({'success': True})
        
    except (JobShareAnalytics.DoesNotExist, JobApplication.DoesNotExist):
        return Response({'error': 'Share or application not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)