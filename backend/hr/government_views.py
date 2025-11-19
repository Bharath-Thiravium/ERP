from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from django.utils import timezone
from django.db import models
from datetime import datetime, date

from authentication.models import ServiceUserSession
from .security_utils import SecurityValidator, secure_session_check
from .error_handlers import handle_compliance_errors, safe_get_session, log_compliance_action, ComplianceError
from .government_integration import GovernmentPortalIntegration, PortalCredentials, SubmissionLog, ChallanGeneration
from .statutory_models import GovernmentReturn
from .government_serializers import (
    PortalCredentialsSerializer,
    SubmissionLogSerializer,
    ChallanGenerationSerializer,
    GovernmentSubmissionSerializer,
    StatusCheckSerializer
)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@handle_compliance_errors
def submit_to_government_portal(request):
    """Submit return to government portal with enhanced security"""
    session_key = secure_session_check(request)
    session = safe_get_session(session_key)
    company = session.service_user.company
    
    # Validate and sanitize input data
    serializer = GovernmentSubmissionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    return_id = int(data['return_id'])  # Ensure integer
    portal_type = SecurityValidator.sanitize_input(data['portal_type'])
    
    # Get government return
    try:
        gov_return = GovernmentReturn.objects.get(id=return_id, company=company)
    except GovernmentReturn.DoesNotExist:
        return Response({'error': 'Return not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Initialize portal integration
    portal_integration = GovernmentPortalIntegration(company)
    
    # Submit based on portal type
    if portal_type == 'epfo':
        response = portal_integration.submit_pf_ecr(gov_return.return_data)
    elif portal_type == 'esic':
        response = portal_integration.submit_esi_return(gov_return.return_data)
    elif portal_type == 'pt':
        response = portal_integration.submit_pt_return(gov_return.return_data)
    elif portal_type == 'income_tax':
        response = portal_integration.submit_tds_return(gov_return.return_data)
    else:
        return Response({'error': 'Invalid portal type'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create submission log
    submission_log = SubmissionLog.objects.create(
        company=company,
        government_return=gov_return,
        portal_name=portal_type.upper(),
        submission_method='api',
        acknowledgment_number=response.get('acknowledgment_number', ''),
        submission_status='submitted' if response['status'] == 'success' else 'error',
        response_data=response,
        error_message=response.get('message', '') if response['status'] == 'error' else '',
        submitted_at=timezone.now() if response['status'] == 'success' else None,
        submitted_by=session.service_user
    )
    
    # Update government return
    if response['status'] == 'success':
        gov_return.status = 'filed'
        gov_return.filed_date = date.today()
        gov_return.acknowledgment_number = response.get('acknowledgment_number', '')
        gov_return.save()
    
    return Response({
        'status': response['status'],
        'message': response.get('message', ''),
        'acknowledgment_number': response.get('acknowledgment_number', ''),
        'submission_log_id': submission_log.id
    })


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@handle_compliance_errors
def check_submission_status(request):
    """Check status of submitted return with enhanced security"""
    session_key = secure_session_check(request)
    session = safe_get_session(session_key)
    company = session.service_user.company
    
    # Validate and sanitize input data
    serializer = StatusCheckSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    acknowledgment_number = SecurityValidator.sanitize_input(data['acknowledgment_number'])
    return_type = SecurityValidator.sanitize_input(data['return_type'])
    
    # Initialize portal integration
    portal_integration = GovernmentPortalIntegration(company)
    
    # Check status
    response = portal_integration.check_submission_status(acknowledgment_number, return_type)
    
    # Update submission log if found
    try:
        submission_log = SubmissionLog.objects.get(
            company=company,
            acknowledgment_number=acknowledgment_number
        )
        submission_log.submission_status = response.get('status', 'pending')
        submission_log.response_data.update(response)
        if response.get('status') == 'processed':
            submission_log.processed_at = timezone.now()
        submission_log.save()
    except SubmissionLog.DoesNotExist:
        pass
    
    return Response(response)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@handle_compliance_errors
def generate_challan(request):
    """Generate payment challan with enhanced security"""
    session_key = secure_session_check(request)
    session = safe_get_session(session_key)
    company = session.service_user.company
    
    # Validate and sanitize input data
    return_id = request.data.get('return_id')
    challan_type = request.data.get('challan_type')
    
    if not return_id or not challan_type:
        return Response({'error': 'Return ID and challan type are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    return_id = int(return_id)  # Ensure integer
    challan_type = SecurityValidator.sanitize_input(challan_type)
    
    # Get government return
    try:
        gov_return = GovernmentReturn.objects.get(id=return_id, company=company)
    except GovernmentReturn.DoesNotExist:
        return Response({'error': 'Return not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Initialize portal integration
    portal_integration = GovernmentPortalIntegration(company)
    
    # Generate challan
    challan_data = portal_integration.download_challan(
        challan_type, 
        f"{gov_return.period_month:02d}/{gov_return.period_year}"
    )
    
    # Create challan record
    challan = ChallanGeneration.objects.create(
        company=company,
        government_return=gov_return,
        challan_number=challan_data['challan_number'],
        challan_type=challan_type,
        amount=gov_return.total_contribution,
        due_date=gov_return.due_date,
        bank_details=challan_data.get('bank_details', {})
    )
    
    return Response({
        'challan_id': challan.id,
        'challan_number': challan.challan_number,
        'amount': challan.amount,
        'due_date': challan.due_date,
        'bank_details': challan.bank_details
    })


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@handle_compliance_errors
def get_submission_history(request):
    """Get submission history with enhanced security"""
    session_key = secure_session_check(request)
    session = safe_get_session(session_key)
    company = session.service_user.company
    
    # Get submission logs with proper filtering
    submissions = SubmissionLog.objects.filter(company=company).select_related(
        'government_return'
    ).order_by('-created_at')
    
    # Sanitize filter parameters
    portal_name = request.query_params.get('portal_name')
    if portal_name:
        portal_name = SecurityValidator.sanitize_input(portal_name)
        submissions = submissions.filter(portal_name__iexact=portal_name)
    
    status_filter = request.query_params.get('status')
    if status_filter:
        status_filter = SecurityValidator.sanitize_input(status_filter)
        submissions = submissions.filter(submission_status=status_filter)
    
    submission_data = []
    for submission in submissions[:50]:  # Limit to 50 recent submissions
        submission_data.append({
            'id': submission.id,
            'portal_name': submission.portal_name,
            'return_type': submission.government_return.return_type,
            'period': f"{submission.government_return.period_month:02d}/{submission.government_return.period_year}",
            'acknowledgment_number': submission.acknowledgment_number,
            'status': submission.submission_status,
            'submitted_at': submission.submitted_at,
            'processed_at': submission.processed_at,
            'error_message': submission.error_message
        })
    
    return Response({
        'submissions': submission_data,
        'total_count': submissions.count()
    })


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@handle_compliance_errors
def get_challans(request):
    """Get generated challans with enhanced security"""
    session_key = secure_session_check(request)
    session = safe_get_session(session_key)
    company = session.service_user.company
    
    # Get challans with proper filtering
    challans = ChallanGeneration.objects.filter(company=company).select_related(
        'government_return'
    ).order_by('-created_at')
    
    # Sanitize filter parameters
    challan_type = request.query_params.get('challan_type')
    if challan_type:
        challan_type = SecurityValidator.sanitize_input(challan_type)
        challans = challans.filter(challan_type=challan_type)
    
    is_paid = request.query_params.get('is_paid')
    if is_paid is not None:
        is_paid = SecurityValidator.sanitize_input(is_paid)
        challans = challans.filter(is_paid=is_paid.lower() == 'true')
    
    challan_data = []
    for challan in challans[:50]:  # Limit to 50 recent challans
        challan_data.append({
            'id': challan.id,
            'challan_number': challan.challan_number,
            'challan_type': challan.challan_type,
            'amount': challan.amount,
            'due_date': challan.due_date,
            'is_paid': challan.is_paid,
            'payment_date': challan.payment_date,
            'payment_reference': challan.payment_reference,
            'created_at': challan.created_at
        })
    
    return Response({
        'challans': challan_data,
        'total_count': challans.count(),
        'total_pending_amount': challans.filter(is_paid=False).aggregate(
            total=models.Sum('amount')
        )['total'] or 0
    })


class PortalCredentialsViewSet(viewsets.ModelViewSet):
    """ViewSet for managing portal credentials"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = PortalCredentialsSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return PortalCredentials.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return PortalCredentials.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return PortalCredentials.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key