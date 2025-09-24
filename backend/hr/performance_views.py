from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from django.db.models import Q, Count, Sum, Avg, F
from django.utils import timezone
from datetime import datetime, timedelta, date

from authentication.models import ServiceUserSession
from .models import Employee, PerformanceReview, Attendance
from .serializers import PerformanceReviewSerializer


class PerformanceViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = PerformanceReviewSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return PerformanceReview.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return PerformanceReview.objects.filter(employee__company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return PerformanceReview.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            # Performance overview
            total_reviews = PerformanceReview.objects.filter(employee__company=company).count()
            pending_reviews = PerformanceReview.objects.filter(
                employee__company=company, 
                status='draft'
            ).count()
            completed_reviews = PerformanceReview.objects.filter(
                employee__company=company, 
                status='approved'
            ).count()
            
            # Average ratings
            avg_ratings = PerformanceReview.objects.filter(
                employee__company=company,
                status='approved'
            ).aggregate(
                avg_overall=Avg('overall_rating'),
                avg_quality=Avg('quality_score'),
                avg_productivity=Avg('productivity_score'),
                avg_collaboration=Avg('collaboration_score')
            )
            
            # Top performers
            top_performers = list(PerformanceReview.objects.filter(
                employee__company=company,
                status='approved'
            ).select_related('employee')
             .order_by('-overall_rating')[:10])
            
            performer_data = []
            for review in top_performers:
                performer_data.append({
                    'employee_name': review.employee.full_name,
                    'employee_id': review.employee.employee_id,
                    'department': review.employee.department.name,
                    'overall_rating': float(review.overall_rating),
                    'review_period': f"{review.review_period_start} to {review.review_period_end}"
                })
            
            # Department performance
            dept_performance = list(PerformanceReview.objects.filter(
                employee__company=company,
                status='approved'
            ).values('employee__department__name')
             .annotate(
                 avg_rating=Avg('overall_rating'),
                 review_count=Count('id')
             ).order_by('-avg_rating'))
            
            # Recent reviews
            recent_reviews = list(PerformanceReview.objects.filter(
                employee__company=company
            ).select_related('employee', 'reviewer')
             .order_by('-created_at')[:5])
            
            recent_data = []
            for review in recent_reviews:
                recent_data.append({
                    'employee_name': review.employee.full_name,
                    'reviewer_name': review.reviewer.full_name,
                    'overall_rating': float(review.overall_rating),
                    'status': review.status,
                    'created_at': review.created_at
                })
            
            return Response({
                'overview': {
                    'total_reviews': total_reviews,
                    'pending_reviews': pending_reviews,
                    'completed_reviews': completed_reviews
                },
                'average_ratings': avg_ratings,
                'top_performers': performer_data,
                'department_performance': dept_performance,
                'recent_reviews': recent_data
            })
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=['post'])
    def create_review(self, request):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            data = request.data.copy()
            data.pop('session_key', None)
            
            # Get reviewer (current user)
            reviewer = Employee.objects.filter(
                company=session.service_user.company,
                email=session.service_user.email
            ).first()
            
            if not reviewer:
                return Response({'error': 'Reviewer not found'}, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = self.get_serializer(data=data)
            if not serializer.is_valid():
                return Response({'error': 'Validation failed', 'details': serializer.errors}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            serializer.save(reviewer=reviewer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def performance_analytics(request):
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        # Performance trends over time
        performance_trends = list(PerformanceReview.objects.filter(
            employee__company=company,
            status='approved'
        ).extra(select={'month': "DATE_TRUNC('month', created_at)"})
         .values('month')
         .annotate(
             avg_rating=Avg('overall_rating'),
             review_count=Count('id')
         ).order_by('month'))
        
        # Rating distribution
        rating_distribution = list(PerformanceReview.objects.filter(
            employee__company=company,
            status='approved'
        ).extra(select={'rating_range': 
            "CASE WHEN overall_rating >= 4.5 THEN 'Excellent (4.5-5.0)' "
            "WHEN overall_rating >= 3.5 THEN 'Good (3.5-4.4)' "
            "WHEN overall_rating >= 2.5 THEN 'Average (2.5-3.4)' "
            "ELSE 'Below Average (<2.5)' END"})
         .values('rating_range')
         .annotate(count=Count('id')))
        
        # Goal achievement analysis
        goal_achievement = PerformanceReview.objects.filter(
            employee__company=company,
            status='approved'
        ).aggregate(
            avg_goal_achievement=Avg('goals_achievement'),
            high_achievers=Count('id', filter=Q(goals_achievement__gte=90)),
            low_achievers=Count('id', filter=Q(goals_achievement__lt=50))
        )
        
        # Performance vs Attendance correlation
        performance_attendance = []
        employees = Employee.objects.filter(company=company, status='active')
        
        for emp in employees:
            latest_review = PerformanceReview.objects.filter(
                employee=emp, status='approved'
            ).order_by('-created_at').first()
            
            if latest_review:
                # Calculate attendance rate for the review period
                attendance_records = Attendance.objects.filter(
                    employee=emp,
                    date__gte=latest_review.review_period_start,
                    date__lte=latest_review.review_period_end
                )
                
                total_days = attendance_records.count()
                present_days = attendance_records.filter(status__in=['present', 'late']).count()
                attendance_rate = (present_days / total_days * 100) if total_days > 0 else 0
                
                performance_attendance.append({
                    'employee_name': emp.full_name,
                    'performance_rating': float(latest_review.overall_rating),
                    'attendance_rate': round(attendance_rate, 1)
                })
        
        return Response({
            'performance_trends': performance_trends,
            'rating_distribution': rating_distribution,
            'goal_achievement': goal_achievement,
            'performance_attendance_correlation': performance_attendance
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def employee_performance_report(request, employee_id):
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        employee = Employee.objects.get(id=employee_id, company=company)
        
        # Employee's performance history
        performance_history = list(PerformanceReview.objects.filter(
            employee=employee
        ).order_by('-created_at'))
        
        history_data = []
        for review in performance_history:
            history_data.append({
                'review_period': f"{review.review_period_start} to {review.review_period_end}",
                'overall_rating': float(review.overall_rating),
                'quality_score': float(review.quality_score),
                'productivity_score': float(review.productivity_score),
                'collaboration_score': float(review.collaboration_score),
                'goals_achievement': float(review.goals_achievement),
                'status': review.status,
                'reviewer': review.reviewer.full_name,
                'created_at': review.created_at
            })
        
        # Performance metrics
        avg_performance = PerformanceReview.objects.filter(
            employee=employee,
            status='approved'
        ).aggregate(
            avg_overall=Avg('overall_rating'),
            avg_quality=Avg('quality_score'),
            avg_productivity=Avg('productivity_score'),
            avg_collaboration=Avg('collaboration_score'),
            avg_goals=Avg('goals_achievement')
        )
        
        # Attendance correlation
        thirty_days_ago = date.today() - timedelta(days=30)
        recent_attendance = Attendance.objects.filter(
            employee=employee,
            date__gte=thirty_days_ago
        )
        
        attendance_stats = {
            'total_days': recent_attendance.count(),
            'present_days': recent_attendance.filter(status__in=['present', 'late']).count(),
            'late_days': recent_attendance.filter(status='late').count(),
            'absent_days': recent_attendance.filter(status='absent').count()
        }
        
        attendance_stats['attendance_rate'] = (
            attendance_stats['present_days'] / attendance_stats['total_days'] * 100
        ) if attendance_stats['total_days'] > 0 else 0
        
        return Response({
            'employee': {
                'name': employee.full_name,
                'employee_id': employee.employee_id,
                'department': employee.department.name,
                'designation': employee.designation.title
            },
            'performance_history': history_data,
            'average_performance': avg_performance,
            'attendance_stats': attendance_stats
        })
        
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)