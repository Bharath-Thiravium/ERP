from rest_framework import viewsets, status, permissions
from django.utils._os import safe_join
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView, ListAPIView, RetrieveAPIView, CreateAPIView
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count, Avg
from django.db import transaction
from authentication.models import ServiceUserSession
from .models import Employee, Department, Designation, JobPosting, JobApplication
from .serializers import (
    EmployeeListSerializer, EmployeeDetailSerializer, EmployeeCreateSerializer,
    DepartmentSerializer, DesignationSerializer, JobPostingSerializer, JobApplicationSerializer
)


class HRPagination(PageNumberPagination):
    """Custom pagination for HR views"""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class HRDashboardViewSet(viewsets.ViewSet):
    """HR Dashboard ViewSet for comprehensive HR operations"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]  # Uses session-based auth

    def list(self, request):
        """Get HR dashboard data with AI insights"""
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.query_params.get('session_key')

        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user
            company = service_user.company

            # Employee statistics
            total_employees = Employee.objects.filter(company=company).count()
            active_employees = Employee.objects.filter(company=company, status='active').count()
            departments_count = Department.objects.filter(company=company, is_active=True).count()
            
            # Performance insights
            avg_performance = Employee.objects.filter(
                company=company,
                status='active'
            ).aggregate(avg_score=Avg('performance_score'))['avg_score'] or 0
            
            # AI insights
            high_retention_risk = Employee.objects.filter(
                company=company,
                retention_risk='high',
                status='active'
            ).count()

            dashboard_data = {
                'company': {
                    'name': company.name,
                    'logo': company.logo.url if company.logo else None,
                },
                'user': {
                    'username': service_user.username,
                    'email': service_user.email,
                },
                'employee_stats': {
                    'total_employees': total_employees,
                    'active_employees': active_employees,
                    'departments': departments_count,
                    'avg_performance_score': round(float(avg_performance), 2),
                },
                'recruitment_stats': {
                    'active_job_postings': 0,
                    'pending_applications': 0,
                },
                'attendance_stats': {
                    'weekly_attendance': 0,
                },
                'ai_insights': {
                    'high_retention_risk_employees': high_retention_risk,
                    'performance_trend': 'stable',  # Can be enhanced with AI
                    'recruitment_efficiency': 85,  # Can be calculated based on data
                }
            }

            return Response(dashboard_data)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class EmployeeListCreateView(ListCreateAPIView):
    """List and create employees"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    pagination_class = HRPagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return EmployeeCreateSerializer
        return EmployeeListSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Employee.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            queryset = Employee.objects.filter(company=company).select_related(
                'department', 'designation', 'reporting_manager'
            )
            
            # Search functionality
            search = self.request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(
                    Q(first_name__icontains=search) |
                    Q(last_name__icontains=search) |
                    Q(employee_id__icontains=search) |
                    Q(email__icontains=search) |
                    Q(department__name__icontains=search) |
                    Q(designation__title__icontains=search)
                )
            
            # Filtering
            department_id = self.request.query_params.get('department')
            if department_id:
                queryset = queryset.filter(department_id=department_id)
                
            status_filter = self.request.query_params.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
                
            return queryset.order_by('-created_at')
            
        except ServiceUserSession.DoesNotExist:
            return Employee.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user

            # Create a mutable copy of request data
            if hasattr(request.data, '_mutable'):
                request.data._mutable = True
            
            # Handle reporting manager service user case
            if 'reporting_manager' in request.data:
                manager_value = request.data['reporting_manager']
                if isinstance(manager_value, str) and (manager_value.startswith('service_user_') or manager_value == ''):
                    request.data['reporting_manager'] = None
                elif manager_value == 'null' or manager_value == 'undefined':
                    request.data['reporting_manager'] = None
            
            # Handle skills JSON parsing
            if 'skills' in request.data and isinstance(request.data['skills'], str):
                try:
                    import json
                    request.data['skills'] = json.loads(request.data['skills'])
                except json.JSONDecodeError:
                    request.data['skills'] = []

            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            with transaction.atomic():
                employee = serializer.save(
                    company=service_user.company,
                    created_by=service_user
                )

            # Return simple response to avoid serialization issues
            return Response({
                'id': employee.id,
                'employee_id': employee.employee_id,
                'first_name': employee.first_name,
                'last_name': employee.last_name,
                'email': employee.email,
                'department': employee.department.name,
                'designation': employee.designation.title,
                'message': 'Employee created successfully'
            }, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class EmployeeDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete employee"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = EmployeeDetailSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Employee.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return Employee.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return Employee.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key

    def update(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            # Create a mutable copy of request data
            if hasattr(request.data, '_mutable'):
                request.data._mutable = True
            
            # Handle skills JSON parsing
            if 'skills' in request.data and isinstance(request.data['skills'], str):
                try:
                    import json
                    request.data['skills'] = json.loads(request.data['skills'])
                except json.JSONDecodeError:
                    request.data['skills'] = []

            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)

            return Response({
                'id': instance.id,
                'employee_id': instance.employee_id,
                'first_name': instance.first_name,
                'last_name': instance.last_name,
                'message': 'Employee updated successfully'
            })

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class JobPostingListCreateView(ListCreateAPIView):
    """List and create job postings"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = JobPostingSerializer
    pagination_class = HRPagination

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return JobPosting.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            queryset = JobPosting.objects.filter(company=company).select_related(
                'department', 'designation'
            )
            
            # Search functionality
            search = self.request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(
                    Q(title__icontains=search) |
                    Q(description__icontains=search) |
                    Q(department__name__icontains=search)
                )
            
            # Filtering
            status_filter = self.request.query_params.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
                
            return queryset.order_by('-created_at')
            
        except ServiceUserSession.DoesNotExist:
            return JobPosting.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user

            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            job_posting = serializer.save(
                company=service_user.company,
                created_by=service_user
            )

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class JobPostingDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete job postings"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = JobPostingSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return JobPosting.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return JobPosting.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return JobPosting.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['PUT', 'PATCH', 'DELETE']:
            session_key = self.request.data.get('session_key') if hasattr(self.request, 'data') else None
        return session_key

    def update(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    def destroy(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            instance = self.get_object()
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class JobApplicationListCreateView(ListCreateAPIView):
    """List and create job applications"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = JobApplicationSerializer
    pagination_class = HRPagination

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return JobApplication.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            queryset = JobApplication.objects.filter(
                job_posting__company=company
            ).select_related('job_posting')
            
            # Search functionality
            search = self.request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(
                    Q(first_name__icontains=search) |
                    Q(last_name__icontains=search) |
                    Q(email__icontains=search) |
                    Q(job_posting__title__icontains=search)
                )
            
            # Filtering
            status_filter = self.request.query_params.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
                
            job_filter = self.request.query_params.get('job_posting')
            if job_filter:
                queryset = queryset.filter(job_posting_id=job_filter)
                
            return queryset.order_by('-created_at')
            
        except ServiceUserSession.DoesNotExist:
            return JobApplication.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key


class DepartmentListCreateView(ListCreateAPIView):
    """List and create departments"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = DepartmentSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Department.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return Department.objects.filter(company=session.service_user.company, is_active=True)
        except ServiceUserSession.DoesNotExist:
            return Department.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(company=session.service_user.company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class DepartmentDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete departments"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = DepartmentSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Department.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return Department.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return Department.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['PUT', 'PATCH', 'DELETE']:
            session_key = self.request.data.get('session_key') if hasattr(self.request, 'data') else None
        return session_key


class DesignationListCreateView(ListCreateAPIView):
    """List and create designations"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = DesignationSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Designation.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return Designation.objects.filter(company=session.service_user.company, is_active=True)
        except ServiceUserSession.DoesNotExist:
            return Designation.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(company=session.service_user.company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class DesignationDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete designations"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = DesignationSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Designation.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return Designation.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return Designation.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['PUT', 'PATCH', 'DELETE']:
            session_key = self.request.data.get('session_key') if hasattr(self.request, 'data') else None
        return session_key


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def get_departments(request):
    """Get all departments for dropdown"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        departments = Department.objects.filter(
            company=session.service_user.company,
            is_active=True
        ).order_by('name')
        serializer = DepartmentSerializer(departments, many=True)
        return Response(serializer.data)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def get_designations(request):
    """Get designations by department"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        department_id = request.query_params.get('department_id')
        
        designations = Designation.objects.filter(
            company=session.service_user.company,
            is_active=True
        )
        
        if department_id:
            designations = designations.filter(department_id=department_id)
            
        designations = designations.order_by('title')
        serializer = DesignationSerializer(designations, many=True)
        return Response(serializer.data)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class PublicJobListView(ListAPIView):
    """Public job listings for candidates (no authentication required)"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = JobPostingSerializer
    pagination_class = HRPagination

    def get_queryset(self):
        queryset = JobPosting.objects.filter(
            status='active'
        ).select_related('department', 'designation', 'company')
        
        # Search functionality
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(department__name__icontains=search) |
                Q(company__name__icontains=search)
            )
        
        # Filter by company
        company_id = self.request.query_params.get('company')
        if company_id:
            queryset = queryset.filter(company_id=company_id)
            
        return queryset.order_by('-created_at')


class PublicJobDetailView(RetrieveAPIView):
    """Public job detail view for candidates"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = JobPostingSerializer
    
    def get_queryset(self):
        return JobPosting.objects.filter(status='active').select_related(
            'department', 'designation', 'company'
        )


class JobApplicationDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete job applications"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = JobApplicationSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return JobApplication.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return JobApplication.objects.filter(job_posting__company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return JobApplication.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['PUT', 'PATCH', 'DELETE']:
            session_key = self.request.data.get('session_key') if hasattr(self.request, 'data') else None
        return session_key

    def update(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class PublicJobApplicationView(CreateAPIView):
    """Public job application submission"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = JobApplicationSerializer

    def create(self, request, *args, **kwargs):
        job_id = kwargs.get('job_id')
        
        try:
            job_posting = JobPosting.objects.get(id=job_id, status='active')
        except JobPosting.DoesNotExist:
            return Response(
                {'error': 'Job posting not found or not active'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        data = request.data.copy()
        data['job_posting'] = job_posting.id
        
        # Determine application source from URL parameters
        utm_source = request.query_params.get('utm_source', 'direct')
        share_id = request.query_params.get('share_id', '')
        
        # Map UTM sources to application sources
        source_mapping = {
            'whatsapp': 'whatsapp',
            'linkedin': 'linkedin', 
            'gmail': 'gmail',
            'outlook': 'outlook',
            'facebook': 'facebook',
            'twitter': 'twitter',
            'instagram': 'instagram',
            'telegram': 'telegram',
            'other_email': 'other_email',
            'copy_link': 'copy_link'
        }
        
        data['application_source'] = source_mapping.get(utm_source, 'direct')
        data['share_id'] = share_id
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        application = serializer.save(job_posting=job_posting)
        
        # Calculate AI score for the application
        try:
            from .ai_scoring import calculate_ai_score
            ai_score, skill_match, screening_notes = calculate_ai_score(application)
            application.ai_score = ai_score
            application.skill_match_percentage = skill_match
            application.ai_screening_notes = screening_notes
            application.status = 'screening'  # Update status to screening
            application.save()
        except Exception as e:
            # If AI scoring fails, continue without it
            pass
        
        return Response(
            {
                'message': 'Application submitted successfully',
                'application_id': application.id
            },
            status=status.HTTP_201_CREATED
        )





# Mobile App Authentication APIs
@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def employee_mobile_login(request):
    """Employee login for mobile app"""
    employee_id = request.data.get('employee_id')
    password = request.data.get('password')
    device_id = request.data.get('device_id', '')
    
    if not employee_id or not password:
        return Response(
            {'error': 'Employee ID and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        employee = Employee.objects.select_related('company', 'department', 'designation').get(
            employee_id=employee_id,
            status='active',
            mobile_app_enabled=True
        )
        
        # Verify password with proper hashing
        from django.contrib.auth.hashers import check_password
        if not check_password(password, employee.mobile_app_password):
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Update last login and device
        from django.utils import timezone
        employee.last_mobile_login = timezone.now()
        employee.mobile_device_id = device_id
        employee.save()
        
        # Generate secure session key for mobile
        import secrets
        session_key = secrets.token_urlsafe(32)
        
        response_data = {
            'success': True,
            'session_key': session_key,
            'employee': {
                'id': employee.id,
                'employee_id': employee.employee_id,
                'first_name': employee.first_name,
                'last_name': employee.last_name,
                'email': employee.email,
                'phone': employee.phone,
                'department': employee.department.name,
                'designation': employee.designation.title,
                'profile_picture': employee.profile_picture.url if employee.profile_picture else None,
            },
            'company': {
                'id': employee.company.id,
                'name': employee.company.name,
                'company_code': employee.company.company_prefix,
                'logo': employee.company.logo.url if employee.company.logo else None,
            }
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Employee.DoesNotExist:
        return Response(
            {'error': 'Invalid credentials or mobile access not enabled'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def set_mobile_password(request):
    """Set mobile app password for employee"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    employee_id = request.data.get('employee_id')
    password = request.data.get('password')
    
    if not employee_id or not password:
        return Response(
            {'error': 'Employee ID and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        employee = Employee.objects.get(
            employee_id=employee_id,
            company=session.service_user.company
        )
        
        # Set mobile password with proper hashing and enable mobile access
        from django.contrib.auth.hashers import make_password
        employee.mobile_app_password = make_password(password)
        employee.mobile_app_enabled = True
        employee.save()
        
        return Response({
            'success': True,
            'message': 'Mobile app password set successfully',
            'employee_id': employee.employee_id,
            'mobile_enabled': True
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def download_mobile_credentials(request):
    """Download mobile credentials as text file"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    employee_id = request.query_params.get('employee_id')
    
    if not employee_id:
        return Response(
            {'error': 'Employee ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        employee = Employee.objects.get(
            employee_id=employee_id,
            company=session.service_user.company,
            mobile_app_enabled=True
        )
        
        from django.http import HttpResponse
        from django.utils import timezone
        
        # Create credentials text content
        credentials_content = f"""Employee Mobile App Credentials
========================================

Company: {employee.company.name}
Employee ID: {employee.employee_id}
Employee Name: {employee.full_name}
Department: {employee.department.name}
Designation: {employee.designation.title}

Mobile App Login Credentials:
----------------------------
Employee ID: {employee.employee_id}
Password: {employee.mobile_app_password}

App Download:
------------
Download the Employee Attendance App from your company's internal portal.

Support:
--------
For technical support, contact your HR department.

Generated on: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}

Note: Keep these credentials secure and do not share with others.
"""
        
        response = HttpResponse(credentials_content, content_type='text/plain')
        # Validate filename to prevent path traversal
        from authentication.utils import validate_filename
        safe_filename = validate_filename(f"{employee.employee_id}_mobile_credentials.txt")
        response['Content-Disposition'] = f'attachment; filename="{safe_filename}"'
        
        return response
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found or mobile access not enabled'}, status=status.HTTP_404_NOT_FOUND)