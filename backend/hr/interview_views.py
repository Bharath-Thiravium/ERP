from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from django.db.models import Q
from authentication.models import ServiceUserSession
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
            'created_at': interview.created_at.isoformat(),
            'updated_at': interview.updated_at.isoformat(),
        }

class InterviewListCreateView(ListCreateAPIView):
    """List and create interviews"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

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
                    pass

            # Create interview
            interview = Interview.objects.create(
                application=application,
                interviewer=interviewer,
                interview_date=request.data.get('interview_date'),
                interview_time=request.data.get('interview_time'),
                interview_type=request.data.get('interview_type', 'video'),
                interview_round=request.data.get('interview_round', 1),
                location=request.data.get('location', ''),
                meeting_link=request.data.get('meeting_link', ''),
                notes=request.data.get('notes', '')
            )

            return Response(InterviewSerializer.serialize(interview), status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except JobApplication.DoesNotExist:
            return Response({'error': 'Invalid application'}, status=status.HTTP_400_BAD_REQUEST)

class InterviewDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete interviews"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

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
            
            # Update fields
            for field in ['interview_date', 'interview_time', 'interview_type', 'location', 
                         'meeting_link', 'notes', 'feedback', 'technical_rating', 
                         'communication_rating', 'cultural_fit_rating', 'overall_rating', 
                         'recommendation', 'status']:
                if field in request.data:
                    setattr(interview, field, request.data[field])
            
            interview.save()
            return Response(InterviewSerializer.serialize(interview))

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)