from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from datetime import date, time, datetime
from authentication.models import ServiceUserSession
from authentication.authentication import ServiceUserSessionAuthentication
from authentication.permissions import IsServiceUserAuthenticated
from .interview_models import Interview, InterviewFeedback
from .models import JobApplication, Employee
from .serializers import JobApplicationSerializer
import json

class InterviewSerializer:
    """Simple serializer for Interview model"""
    @staticmethod
    def serialize(interview):
        return {
            'id': interview.id,
            'application_id': interview.application.id,
            'candidate_name': interview.application.full_name,
            'job_title': interview.application.job_posting.title,
            'interviewer_id': interview.interviewer.id if interview.interviewer else None,
            'interviewer_name': interview.interviewer.full_name if interview.interviewer else 'Current User',
            'interview_date': interview.interview_date.isoformat() if hasattr(interview.interview_date, 'isoformat') else interview.interview_date,
            'interview_time': interview.interview_time.strftime('%H:%M') if hasattr(interview.interview_time, 'strftime') else interview.interview_time,
            'interview_type': interview.interview_type,
            'interview_round': interview.interview_round,
            'location': interview.location,
            'meeting_link': interview.meeting_link,
            'status': interview.status,
            'notes': interview.notes,
            'feedback': interview.feedback,
            'technical_rating': interview.technical_rating,
            'communication_rating': interview.communication_rating,
            'cultural_fit_rating': interview.cultural_fit_rating,
            'overall_rating': interview.overall_rating,
            'recommendation': interview.recommendation,
            'email_sent': interview.email_sent,
            'email_sent_at': interview.email_sent_at.isoformat() if interview.email_sent_at else None,
            'created_at': interview.created_at.isoformat(),
            'updated_at': interview.updated_at.isoformat(),
        }

class InterviewListCreateView(ListCreateAPIView):
    """List and create interviews"""
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Interview.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return Interview.objects.filter(
                application__job_posting__company=session.service_user.company
            ).select_related('application', 'interviewer', 'application__job_posting')
        except ServiceUserSession.DoesNotExist:
            return Interview.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        interviews = [InterviewSerializer.serialize(interview) for interview in queryset]
        return Response({'results': interviews, 'count': len(interviews)})

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            # Get application and interviewer
            application = JobApplication.objects.get(
                id=request.data.get('application_id'),
                job_posting__company=session.service_user.company
            )
            
            interviewer = None
            interviewer_id = request.data.get('interviewer_id')
            if interviewer_id:
                try:
                    interviewer = Employee.objects.get(
                        id=interviewer_id,
                        company=session.service_user.company
                    )
                except Employee.DoesNotExist:
                    return Response({'interviewer_id': ['Interviewer not found or access denied.']}, status=status.HTTP_400_BAD_REQUEST)

            try:
                interview_date = date.fromisoformat(request.data.get('interview_date', ''))
                interview_time = time.fromisoformat(request.data.get('interview_time', ''))
            except (TypeError, ValueError):
                return Response({'detail': 'A valid interview date and time are required.'}, status=status.HTTP_400_BAD_REQUEST)

            scheduled_at = timezone.make_aware(
                datetime.combine(interview_date, interview_time),
                timezone.get_current_timezone(),
            )
            if scheduled_at <= timezone.now():
                return Response({'interview_date': ['Interview must be scheduled in the future.']}, status=status.HTTP_400_BAD_REQUEST)

            interview_type = request.data.get('interview_type', 'video')
            location = (request.data.get('location') or '').strip()
            meeting_link = (request.data.get('meeting_link') or '').strip()
            if interview_type == 'video' and not meeting_link:
                return Response({'meeting_link': ['Meeting link is required for a video interview.']}, status=status.HTTP_400_BAD_REQUEST)
            if interview_type == 'in_person' and not location:
                return Response({'location': ['Location is required for an in-person interview.']}, status=status.HTTP_400_BAD_REQUEST)
            if application.status not in {'shortlisted', 'interviewed', 'interview_scheduled'}:
                return Response({'application_id': [f'Cannot schedule an interview while application is {application.status}.']}, status=status.HTTP_400_BAD_REQUEST)
            if interviewer and Interview.objects.filter(
                interviewer=interviewer,
                interview_date=interview_date,
                interview_time=interview_time,
                status__in=['scheduled', 'rescheduled'],
            ).exists():
                return Response({'interviewer_id': ['Interviewer already has an interview at this time.']}, status=status.HTTP_400_BAD_REQUEST)

            # Create interview
            with transaction.atomic():
                interview = Interview(
                    application=application,
                    interviewer=interviewer,
                    interview_date=interview_date,
                    interview_time=interview_time,
                    interview_type=interview_type,
                    interview_round=request.data.get('interview_round', 1),
                    location=location,
                    meeting_link=meeting_link,
                    notes=request.data.get('notes', '')
                )
                interview.full_clean()
                interview.save()
                application.status = 'interview_scheduled'
                application.interview_date = scheduled_at
                application.interviewer = interviewer
                application.save(update_fields=['status', 'interview_date', 'interviewer', 'updated_at'])
            
            # Ensure interview is saved before sending email
            interview.refresh_from_db()
            
            # Send interview invitation email
            email_result = interview.send_interview_invitation()
            
            response_data = InterviewSerializer.serialize(interview)
            if isinstance(email_result, dict):
                if email_result['success']:
                    response_data['email_success'] = email_result['message']
                else:
                    response_data['email_warning'] = email_result['error']
            else:
                # Backward compatibility for boolean return
                if not email_result:
                    response_data['email_warning'] = 'Interview scheduled but invitation email not sent. Please check company email settings.'

            return Response(response_data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except JobApplication.DoesNotExist:
            return Response({'error': 'Invalid application'}, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError as exc:
            return Response({'detail': exc.message_dict if hasattr(exc, 'message_dict') else exc.messages}, status=status.HTTP_400_BAD_REQUEST)

class InterviewDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete interviews"""
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Interview.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return Interview.objects.filter(
                application__job_posting__company=session.service_user.company
            )
        except ServiceUserSession.DoesNotExist:
            return Interview.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['PUT', 'PATCH', 'DELETE']:
            session_key = self.request.data.get('session_key') if hasattr(self.request, 'data') else None
        return session_key

    def retrieve(self, request, *args, **kwargs):
        interview = self.get_object()
        return Response(InterviewSerializer.serialize(interview))

    def update(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            interview = self.get_object()
            
            # Check if resend invitation is requested
            if request.data.get('resend_invitation'):
                email_result = interview.send_interview_invitation()
                response_data = InterviewSerializer.serialize(interview)
                if isinstance(email_result, dict):
                    if email_result['success']:
                        response_data['email_success'] = email_result['message']
                    else:
                        response_data['email_warning'] = email_result['error']
                else:
                    # Backward compatibility
                    if not email_result:
                        response_data['email_warning'] = 'Failed to resend invitation email. Please check company email settings.'
                    else:
                        response_data['email_success'] = 'Interview invitation resent successfully.'
                return Response(response_data)
            
            old_status = interview.status
            requested_status = request.data.get('status', old_status)
            allowed_statuses = {
                'scheduled': {'scheduled', 'rescheduled', 'completed', 'cancelled', 'no_show'},
                'rescheduled': {'rescheduled', 'completed', 'cancelled', 'no_show'},
                'no_show': {'no_show', 'rescheduled', 'cancelled'},
                'completed': {'completed'},
                'cancelled': {'cancelled'},
            }
            if requested_status not in allowed_statuses.get(old_status, {old_status}):
                return Response(
                    {'status': [f'Cannot move interview from {old_status} to {requested_status}.']},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if 'interview_date' in request.data:
                try:
                    interview.interview_date = date.fromisoformat(request.data['interview_date'])
                except (TypeError, ValueError):
                    return Response({'interview_date': ['Enter a valid date.']}, status=status.HTTP_400_BAD_REQUEST)
            if 'interview_time' in request.data:
                try:
                    interview.interview_time = time.fromisoformat(request.data['interview_time'])
                except (TypeError, ValueError):
                    return Response({'interview_time': ['Enter a valid time.']}, status=status.HTTP_400_BAD_REQUEST)

            if 'interviewer_id' in request.data:
                interviewer_id = request.data.get('interviewer_id')
                if interviewer_id:
                    try:
                        interview.interviewer = Employee.objects.get(
                            id=interviewer_id,
                            company=session.service_user.company,
                        )
                    except Employee.DoesNotExist:
                        return Response({'interviewer_id': ['Interviewer not found or access denied.']}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    interview.interviewer = None

            # Update scalar fields after date/time conversion.
            for field in ['interview_type', 'location',
                         'meeting_link', 'notes', 'feedback', 'technical_rating', 
                         'communication_rating', 'cultural_fit_rating', 'overall_rating', 
                         'recommendation', 'status']:
                if field in request.data:
                    setattr(interview, field, request.data[field])

            if interview.status in {'scheduled', 'rescheduled'}:
                scheduled_at = timezone.make_aware(
                    datetime.combine(interview.interview_date, interview.interview_time),
                    timezone.get_current_timezone(),
                )
                if scheduled_at <= timezone.now():
                    return Response({'interview_date': ['Interview must be scheduled in the future.']}, status=status.HTTP_400_BAD_REQUEST)
                if interview.interview_type == 'video' and not interview.meeting_link:
                    return Response({'meeting_link': ['Meeting link is required for a video interview.']}, status=status.HTTP_400_BAD_REQUEST)
                if interview.interview_type == 'in_person' and not interview.location:
                    return Response({'location': ['Location is required for an in-person interview.']}, status=status.HTTP_400_BAD_REQUEST)
                if interview.interviewer and Interview.objects.filter(
                    interviewer=interview.interviewer,
                    interview_date=interview.interview_date,
                    interview_time=interview.interview_time,
                    status__in=['scheduled', 'rescheduled'],
                ).exclude(pk=interview.pk).exists():
                    return Response({'interviewer_id': ['Interviewer already has an interview at this time.']}, status=status.HTTP_400_BAD_REQUEST)
            
            interview.full_clean()
            with transaction.atomic():
                if request.data.get('status') == 'completed':
                    interview.status = 'completed'
                    interview.completed_at = timezone.now()
                    interview.application.status = 'interviewed'
                    interview.application.save(update_fields=['status', 'updated_at'])

                if interview.status in {'scheduled', 'rescheduled'}:
                    interview.application.interview_date = scheduled_at
                    interview.application.interviewer = interview.interviewer
                    interview.application.status = 'interview_scheduled'
                    interview.application.save(update_fields=['status', 'interview_date', 'interviewer', 'updated_at'])

                recommendation = request.data.get('recommendation')
                if recommendation == 'hire':
                    interview.application.status = 'interviewed'
                    interview.application.save(update_fields=['status', 'updated_at'])
                elif recommendation == 'reject':
                    interview.application.status = 'rejected'
                    interview.application.save(update_fields=['status', 'updated_at'])
                interview.save()
            return Response(InterviewSerializer.serialize(interview))

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except ValidationError as exc:
            return Response({'detail': exc.message_dict if hasattr(exc, 'message_dict') else exc.messages}, status=status.HTTP_400_BAD_REQUEST)
    
    def test_email(self, request, pk=None):
        """Test interview email functionality"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            interview = self.get_object()
            
            email_sent = interview.send_interview_invitation()
            
            return Response({
                'success': email_sent,
                'message': 'Test email sent!' if email_sent else 'Email failed. Check settings.'
            })

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
