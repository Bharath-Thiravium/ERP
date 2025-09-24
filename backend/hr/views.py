from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
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

            # Handle skills JSON parsing
            data = request.data.copy()
            if 'skills' in data and isinstance(data['skills'], str):
                try:
                    import json
                    data['skills'] = json.loads(data['skills'])
                except json.JSONDecodeError:
                    data['skills'] = []

            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)

            employee = serializer.save(
                company=service_user.company,
                created_by=service_user
            )

            detail_serializer = EmployeeDetailSerializer(employee)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

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
            
            # Handle skills JSON parsing
            data = request.data.copy()
            if 'skills' in data and isinstance(data['skills'], str):
                try:
                    import json
                    data['skills'] = json.loads(data['skills'])
                except json.JSONDecodeError:
                    data['skills'] = []

            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)

            return Response(serializer.data)

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
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        application = serializer.save(job_posting=job_posting)
        
        return Response(
            {
                'message': 'Application submitted successfully',
                'application_id': application.id
            },
            status=status.HTTP_201_CREATED
        )


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def get_managers(request):
    """Get all employees who can be managers"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        managers = Employee.objects.filter(
            company=session.service_user.company,
            status='active'
        ).select_related('designation')
        
        managers_data = []
        for manager in managers:
            managers_data.append({
                'id': manager.id,
                'employee_id': manager.employee_id,
                'first_name': manager.first_name,
                'last_name': manager.last_name,
                'full_name': manager.full_name,
                'designation__title': manager.designation.title
            })
        
        return Response(managers_data)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)