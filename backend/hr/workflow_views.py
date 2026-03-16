from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from authentication.models import ServiceUserSession
from .models import Employee
from .workflow_models import (
    EmployeeWorkflowStatus, 
    EmployeeProfileCompletion, 
    InductionTraining, 
    EmployeeInductionProgress,
    EmployeeAccessLog
)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def create_employee_with_workflow(request):
    """Create employee and initialize workflow"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        with transaction.atomic():
            # Create employee (basic details only)
            employee_data = {
                'first_name': request.data.get('first_name'),
                'last_name': request.data.get('last_name'),
                'email': request.data.get('email'),
                'phone': request.data.get('phone'),
                'department': request.data.get('department'),
                'designation': request.data.get('designation'),
                'date_of_joining': request.data.get('date_of_joining'),
                'base_salary': request.data.get('base_salary', 0),
                'employment_type': request.data.get('employment_type', 'full_time'),
                'work_mode': request.data.get('work_mode', 'office'),
                'company': service_user.company,
                'created_by': service_user,
                'status': 'inactive'  # Start as inactive until workflow complete
            }
            
            # Create employee
            from .serializers import EmployeeCreateSerializer
            serializer = EmployeeCreateSerializer(data=employee_data)
            if serializer.is_valid():
                employee = serializer.save()
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            # Initialize workflow status
            workflow_status = EmployeeWorkflowStatus.objects.create(
                employee=employee,
                current_stage='basic_details_created',
                access_level='none',
                basic_details_completed_at=timezone.now()
            )
            
            # Initialize profile completion tracking
            profile_completion = EmployeeProfileCompletion.objects.create(
                employee=employee
            )
            
            # Generate temporary password and share credentials
            import secrets
            import string
            temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
            
            # Set mobile password (will be reset by employee)
            from django.contrib.auth.hashers import make_password
            employee.mobile_app_password = make_password(temp_password)
            employee.mobile_app_enabled = True
            employee.save()
            
            # Advance to credentials shared stage
            workflow_status.advance_to_stage('credentials_shared')
            
            return Response({
                'employee': {
                    'id': employee.id,
                    'employee_id': employee.employee_id,
                    'full_name': employee.full_name,
                    'email': employee.email,
                    'workflow_stage': workflow_status.current_stage,
                    'access_level': workflow_status.access_level
                },
                'credentials': {
                    'employee_id': employee.employee_id,
                    'temporary_password': temp_password,
                    'message': 'Employee created. Share these credentials with the employee.'
                }
            }, status=status.HTTP_201_CREATED)
            
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def employee_reset_password(request):
    """Employee resets their password (first login)"""
    employee_id = request.data.get('employee_id')
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    
    if not all([employee_id, old_password, new_password]):
        return Response({
            'error': 'Employee ID, old password, and new password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        employee = Employee.objects.get(
            employee_id=employee_id,
            mobile_app_enabled=True
        )
        
        # Verify old password
        from django.contrib.auth.hashers import check_password, make_password
        if not check_password(old_password, employee.mobile_app_password):
            return Response({'error': 'Invalid old password'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Update password
        employee.mobile_app_password = make_password(new_password)
        employee.save()
        
        # Update workflow status
        workflow_status = employee.workflow_status
        workflow_status.advance_to_stage('password_reset_completed')
        
        return Response({
            'message': 'Password reset successfully',
            'next_step': 'Please complete your profile information',
            'workflow_stage': workflow_status.current_stage
        })
        
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def get_employee_workflow_status(request):
    """Get employee workflow status"""
    employee_id = request.query_params.get('employee_id')
    
    if not employee_id:
        return Response({'error': 'Employee ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        employee = Employee.objects.get(employee_id=employee_id)
        workflow_status = employee.workflow_status
        profile_completion = getattr(employee, 'profile_completion', None)
        
        return Response({
            'employee': {
                'id': employee.id,
                'employee_id': employee.employee_id,
                'full_name': employee.full_name,
                'email': employee.email,
                'status': employee.status
            },
            'workflow': {
                'current_stage': workflow_status.current_stage,
                'access_level': workflow_status.access_level,
                'stage_display': workflow_status.get_current_stage_display(),
                'access_level_display': workflow_status.get_access_level_display()
            },
            'profile_completion': {
                'percentage': profile_completion.completion_percentage if profile_completion else 0,
                'is_complete': profile_completion.is_complete if profile_completion else False,
                'submitted': profile_completion.submitted_for_approval if profile_completion else False
            } if profile_completion else None,
            'next_steps': get_next_steps(workflow_status)
        })
        
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)


def get_next_steps(workflow_status):
    """Get next steps for employee based on current workflow stage"""
    stage = workflow_status.current_stage
    
    if stage == 'basic_details_created':
        return ['Wait for credentials to be shared by HR']
    elif stage == 'credentials_shared':
        return ['Login with provided credentials', 'Reset your password']
    elif stage == 'password_reset_completed':
        return ['Complete your profile information', 'Upload required documents']
    elif stage == 'profile_submitted':
        return ['Wait for profile approval from project admin']
    elif stage == 'profile_approved':
        return ['Complete mandatory induction training modules']
    elif stage == 'induction_completed':
        return ['Full access granted - you can now use all system modules']
    elif stage == 'profile_rejected':
        return ['Review rejection reason', 'Update profile and resubmit']
    else:
        return []