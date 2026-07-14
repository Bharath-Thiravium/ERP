from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count, Avg
from django.db import transaction

from common.viewsets import CompanyScopedModelViewSet
from .models import Employee, Department, Designation, JobPosting, JobApplication
from .serializers import (
    EmployeeListSerializer, EmployeeDetailSerializer, EmployeeCreateSerializer,
    DepartmentSerializer, DesignationSerializer, JobPostingSerializer, JobApplicationSerializer
)


class EmployeeViewSet(CompanyScopedModelViewSet):
    """Employee management with centralized tenant enforcement"""
    queryset = Employee.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return EmployeeCreateSerializer
        elif self.action == 'retrieve':
            return EmployeeDetailSerializer
        return EmployeeListSerializer

    def get_queryset(self):
        queryset = super().get_queryset().select_related(
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

    def create(self, request, *args, **kwargs):
        """Override create to handle skills processing"""
        # Handle skills - remove from FormData and process separately
        processed_skills = []
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        
        if 'skills' in data:
            skills_value = data['skills']
            del data['skills']
            
            if isinstance(skills_value, str):
                try:
                    import json
                    processed_skills = json.loads(skills_value)
                except json.JSONDecodeError:
                    skills_str = skills_value.strip()
                    if skills_str:
                        processed_skills = [skill.strip() for skill in skills_str.split(',') if skill.strip()]
                    else:
                        processed_skills = []
            else:
                processed_skills = skills_value if isinstance(skills_value, list) else []

        # Handle reporting manager service user case
        if 'reporting_manager' in data:
            manager_value = data['reporting_manager']
            if isinstance(manager_value, str) and (manager_value.startswith('service_user_') or manager_value == ''):
                data['reporting_manager'] = None
            elif manager_value == 'null' or manager_value == 'undefined':
                data['reporting_manager'] = None

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            self.perform_create(serializer)
            employee = serializer.instance
            
            # Set skills after saving
            employee.skills = processed_skills
            employee.save(update_fields=['skills'])

        # Return detailed response with image URLs
        response_data = {
            'id': employee.id,
            'employee_id': employee.employee_id,
            'first_name': employee.first_name,
            'last_name': employee.last_name,
            'full_name': employee.full_name,
            'email': employee.email,
            'phone': employee.phone,
            'department': employee.department_id,
            'department_name': employee.department.name,
            'designation': employee.designation_id,
            'designation_title': employee.designation.title,
            'skills': processed_skills,
            'profile_picture': employee.profile_picture.url if employee.profile_picture else None,
            'face_photo': employee.face_photo.url if employee.face_photo else None,
            'status': employee.status,
            'performance_score': employee.performance_score,
            'retention_risk': employee.retention_risk,
            'mobile_app_enabled': employee.mobile_app_enabled,
            'message': 'Employee created successfully'
        }
        return Response(response_data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Override update to handle skills processing"""
        # Handle skills - remove from FormData and process separately
        processed_skills = None
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        
        if 'skills' in data:
            skills_value = data['skills']
            del data['skills']
            
            if isinstance(skills_value, str):
                try:
                    import json
                    processed_skills = json.loads(skills_value)
                except json.JSONDecodeError:
                    skills_str = skills_value.strip()
                    if skills_str:
                        processed_skills = [skill.strip() for skill in skills_str.split(',') if skill.strip()]
                    else:
                        processed_skills = []
            else:
                processed_skills = skills_value if isinstance(skills_value, list) else []

        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Set skills after updating if provided
        if processed_skills is not None:
            instance.skills = processed_skills
            instance.save(update_fields=['skills'])

        # Return detailed response with image URLs
        response_data = {
            'id': instance.id,
            'employee_id': instance.employee_id,
            'first_name': instance.first_name,
            'last_name': instance.last_name,
            'full_name': instance.full_name,
            'email': instance.email,
            'phone': instance.phone,
            'department': instance.department_id,
            'department_name': instance.department.name,
            'designation': instance.designation_id,
            'designation_title': instance.designation.title,
            'skills': processed_skills if processed_skills is not None else instance.skills,
            'profile_picture': instance.profile_picture.url if instance.profile_picture else None,
            'face_photo': instance.face_photo.url if instance.face_photo else None,
            'status': instance.status,
            'performance_score': instance.performance_score,
            'retention_risk': instance.retention_risk,
            'mobile_app_enabled': instance.mobile_app_enabled,
            'message': 'Employee updated successfully'
        }
        return Response(response_data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get HR dashboard data with AI insights"""
        company = self.get_company()
        
        # Employee statistics
        total_employees = self.get_queryset().count()
        active_employees = self.get_queryset().filter(status='active').count()
        departments_count = Department.objects.filter(company=company, is_active=True).count()
        
        # Performance insights
        avg_performance = self.get_queryset().filter(
            status='active'
        ).aggregate(avg_score=Avg('performance_score'))['avg_score'] or 0
        
        # AI insights
        high_retention_risk = self.get_queryset().filter(
            retention_risk='high',
            status='active'
        ).count()

        dashboard_data = {
            'company': {
                'name': company.name,
                'logo': company.logo.url if company.logo else None,
            },
            'user': {
                'username': request.service_user.username,
                'email': request.service_user.email,
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
                'performance_trend': 'stable',
                'recruitment_efficiency': 85,
            }
        }

        return Response(dashboard_data)


class DepartmentViewSet(CompanyScopedModelViewSet):
    """Department management with centralized tenant enforcement"""
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)


class DesignationViewSet(CompanyScopedModelViewSet):
    """Designation management with centralized tenant enforcement"""
    queryset = Designation.objects.all()
    serializer_class = DesignationSerializer

    def get_queryset(self):
        queryset = super().get_queryset().filter(is_active=True)
        
        # Filter by department if provided
        department_id = self.request.query_params.get('department_id')
        if department_id:
            queryset = queryset.filter(department_id=department_id)
            
        return queryset.order_by('title')


class JobPostingViewSet(CompanyScopedModelViewSet):
    """Job Posting management with centralized tenant enforcement"""
    queryset = JobPosting.objects.all()
    serializer_class = JobPostingSerializer

    def get_queryset(self):
        queryset = super().get_queryset().select_related(
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


class JobApplicationViewSet(CompanyScopedModelViewSet):
    """Job Application management with centralized tenant enforcement"""
    queryset = JobApplication.objects.all()
    serializer_class = JobApplicationSerializer

    def get_queryset(self):
        queryset = JobApplication.objects.filter(
            job_posting__company=self.get_company()
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

    def perform_create(self, serializer):
        """Override to skip company injection since it's nested"""
        # Don't inject company for job applications as it's through job_posting
        serializer.save()
