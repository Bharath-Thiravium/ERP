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
    """Reject direct filing until a verified government API is configured."""
    session_key = secure_session_check(request)
    safe_get_session(session_key)
    return Response({
        'error': 'Direct government portal filing is not configured.',
        'detail': 'File on the official portal, then record the official acknowledgment number and filed date under Government Returns.',
    }, status=status.HTTP_501_NOT_IMPLEMENTED)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@handle_compliance_errors
def check_submission_status(request):
    """Reject remote status checks until a verified portal API is configured."""
    session_key = secure_session_check(request)
    safe_get_session(session_key)
    return Response({
        'error': 'Government portal status integration is not configured.',
        'detail': 'Verify the status on the official portal and update the return with its official filing details.',
    }, status=status.HTTP_501_NOT_IMPLEMENTED)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@handle_compliance_errors
def generate_challan(request):
    """Reject synthetic challans until official generation is integrated."""
    session_key = secure_session_check(request)
    safe_get_session(session_key)
    return Response({
        'error': 'Official challan generation is not configured.',
        'detail': 'Generate the challan on the official portal and retain its official reference as filing evidence.',
    }, status=status.HTTP_501_NOT_IMPLEMENTED)


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
