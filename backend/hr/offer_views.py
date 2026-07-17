from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
import uuid
from authentication.models import ServiceUserSession
from authentication.authentication import ServiceUserSessionAuthentication
from authentication.permissions import IsServiceUserAuthenticated
from company_dashboard.models import CompanyNotification
from .offer_models import JobOffer
from .models import JobApplication
from .serializers import EmployeeCreateSerializer, EmployeeListSerializer

class OfferSerializer:
    """Simple serializer for JobOffer model"""
    @staticmethod
    def serialize(offer):
        return {
            'id': offer.id,
            'application_id': offer.application.id,
            'candidate_name': offer.application.full_name,
            'job_title': offer.application.job_posting.title,
            'salary_offered': float(offer.salary_offered),
            'joining_date': offer.joining_date.isoformat() if hasattr(offer.joining_date, 'isoformat') else offer.joining_date,
            'offer_valid_until': offer.offer_valid_until.isoformat() if hasattr(offer.offer_valid_until, 'isoformat') else offer.offer_valid_until,
            'benefits': offer.benefits,
            'terms_conditions': offer.terms_conditions,
            'notes': offer.notes,
            'status': offer.status,
            'sent_at': offer.sent_at.isoformat() if offer.sent_at else None,
            'responded_at': offer.responded_at.isoformat() if offer.responded_at else None,
            'candidate_response': offer.candidate_response,
            'negotiation_notes': offer.negotiation_notes,
            'created_at': offer.created_at.isoformat(),
            'updated_at': offer.updated_at.isoformat(),
        }

class OfferListCreateView(ListCreateAPIView):
    """List and create job offers"""
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return JobOffer.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return JobOffer.objects.filter(
                application__job_posting__company=session.service_user.company
            ).select_related('application', 'application__job_posting')
        except ServiceUserSession.DoesNotExist:
            return JobOffer.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        offers = [OfferSerializer.serialize(offer) for offer in queryset]
        return Response({'results': offers, 'count': len(offers)})

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            # Get application
            application = JobApplication.objects.get(
                id=request.data.get('application_id'),
                job_posting__company=session.service_user.company
            )

            existing_offer = JobOffer.objects.filter(application=application).first()
            if application.converted_employee_id:
                return Response(
                    {'application_id': ['This candidate is already converted to an employee.']},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if existing_offer and existing_offer.status == 'accepted':
                return Response(
                    {'application_id': ['The candidate has already accepted this offer.']},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Legacy applications could be marked offer_sent without a JobOffer row.
            # Reissuing them moves them into the current tracked offer flow.
            if not existing_offer and application.status not in {
                'interviewed', 'offer_rejected', 'offer_sent',
            }:
                return Response(
                    {'application_id': [f'Offer cannot be sent while application is {application.status}.']},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if existing_offer:
                previous_values = {
                    field: getattr(existing_offer, field)
                    for field in (
                        'salary_offered', 'joining_date', 'offer_valid_until',
                        'benefits', 'terms_conditions', 'notes', 'status',
                        'sent_at', 'responded_at', 'candidate_response',
                        'response_ip', 'response_user_agent', 'response_token',
                    )
                }

                existing_offer.salary_offered = request.data.get('salary_offered')
                existing_offer.joining_date = request.data.get('joining_date')
                existing_offer.offer_valid_until = request.data.get('offer_valid_until')
                existing_offer.benefits = request.data.get('benefits', '')
                existing_offer.terms_conditions = request.data.get('terms_conditions', '')
                existing_offer.notes = request.data.get('notes', '')
                existing_offer.status = 'draft'
                existing_offer.sent_at = None
                existing_offer.responded_at = None
                existing_offer.candidate_response = ''
                existing_offer.response_ip = None
                existing_offer.response_user_agent = ''
                existing_offer.response_token = uuid.uuid4()
                existing_offer.full_clean()
                existing_offer.save()
                
                # Send updated offer
                email_sent = existing_offer.send_offer()
                if not email_sent:
                    for field, value in previous_values.items():
                        setattr(existing_offer, field, value)
                    existing_offer.save(update_fields=[*previous_values.keys(), 'updated_at'])

                    response_data = OfferSerializer.serialize(existing_offer)
                    response_data['detail'] = 'Offer saved as draft, but email was not sent. Check company email settings.'
                    return Response(response_data, status=status.HTTP_502_BAD_GATEWAY)

                response_data = OfferSerializer.serialize(existing_offer)
                return Response(response_data, status=status.HTTP_200_OK)
            
            # Create new offer
            offer = JobOffer(
                application=application,
                salary_offered=request.data.get('salary_offered'),
                joining_date=request.data.get('joining_date'),
                offer_valid_until=request.data.get('offer_valid_until'),
                benefits=request.data.get('benefits', ''),
                terms_conditions=request.data.get('terms_conditions', ''),
                notes=request.data.get('notes', '')
            )
            offer.full_clean()
            offer.save()
            
            # Send offer
            email_sent = offer.send_offer()
            
            response_data = OfferSerializer.serialize(offer)
            if not email_sent:
                response_data['detail'] = 'Offer saved as draft, but email was not sent. Check company email settings.'
                return Response(response_data, status=status.HTTP_502_BAD_GATEWAY)

            return Response(response_data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except JobApplication.DoesNotExist:
            return Response({'error': 'Invalid application'}, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError as exc:
            return Response(
                {'detail': exc.message_dict if hasattr(exc, 'message_dict') else exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )


def _public_offer_data(offer, request=None):
    application = offer.application
    job = application.job_posting
    company = job.company
    company_logo = company.logo.url if getattr(company, 'logo', None) else None
    if company_logo and request:
        company_logo = request.build_absolute_uri(company_logo)

    return {
        'candidate_name': application.full_name,
        'job_title': job.title,
        'company_name': company.name,
        'company_logo': company_logo,
        'salary_offered': float(offer.salary_offered),
        'joining_date': offer.joining_date.isoformat(),
        'offer_valid_until': offer.offer_valid_until.isoformat(),
        'benefits': offer.benefits,
        'terms_conditions': offer.terms_conditions,
        'notes': offer.notes,
        'status': 'expired' if offer.is_expired else offer.status,
        'candidate_response': offer.candidate_response,
        'responded_at': offer.responded_at.isoformat() if offer.responded_at else None,
    }


class PublicOfferView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            offer = JobOffer.objects.select_related(
                'application__job_posting__company'
            ).get(response_token=token)
        except JobOffer.DoesNotExist:
            return Response({'detail': 'Offer not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(_public_offer_data(offer, request))


class PublicOfferResponseView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, token):
        decision = str(request.data.get('decision', '')).strip().lower()
        if decision not in {'accept', 'reject'}:
            return Response(
                {'decision': ['Choose accept or reject.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            try:
                offer = JobOffer.objects.select_for_update().select_related(
                    'application__job_posting__company'
                ).get(response_token=token)
            except JobOffer.DoesNotExist:
                return Response({'detail': 'Offer not found.'}, status=status.HTTP_404_NOT_FOUND)

            expected_status = 'accepted' if decision == 'accept' else 'rejected'
            if offer.status == expected_status:
                return Response(_public_offer_data(offer, request))
            if offer.is_expired:
                offer.status = 'expired'
                offer.save(update_fields=['status', 'updated_at'])
                return Response({'detail': 'This offer has expired.'}, status=status.HTTP_410_GONE)
            if offer.status != 'sent':
                return Response(
                    {'detail': f'This offer is already {offer.status}.'},
                    status=status.HTTP_409_CONFLICT,
                )

            forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '')
            offer.response_ip = (
                forwarded_for.split(',')[0].strip()
                if forwarded_for else request.META.get('REMOTE_ADDR')
            )
            offer.response_user_agent = request.META.get('HTTP_USER_AGENT', '')[:1000]
            offer.candidate_response = str(request.data.get('response', '')).strip()[:5000]
            offer.status = expected_status
            offer.responded_at = timezone.now()
            offer.save(update_fields=[
                'status', 'responded_at', 'candidate_response', 'response_ip',
                'response_user_agent', 'updated_at',
            ])

            application = offer.application
            application.status = 'offer_accepted' if decision == 'accept' else 'offer_rejected'
            application.save(update_fields=['status', 'updated_at'])

            company = application.job_posting.company
            notification_exists = CompanyNotification.objects.filter(
                company=company,
                metadata__event='offer_response',
                metadata__offer_id=offer.id,
            ).exists()
            if not notification_exists:
                accepted = decision == 'accept'
                CompanyNotification.objects.create(
                    company=company,
                    type='user_activity',
                    service_type='hr',
                    title=f"Offer {'accepted' if accepted else 'declined'}: {application.full_name}",
                    message=(
                        f'{application.full_name} has accepted the {application.job_posting.title} offer. '
                        'Review the candidate and create the employee profile.'
                        if accepted else
                        f'{application.full_name} has declined the {application.job_posting.title} offer.'
                    ),
                    priority='high' if accepted else 'medium',
                    metadata={
                        'event': 'offer_response',
                        'decision': decision,
                        'offer_id': offer.id,
                        'application_id': application.id,
                        'navigate_to': 'hr-candidate-onboarding' if accepted else 'hr-recruitment',
                    },
                )

        return Response(_public_offer_data(offer, request))


class CandidateOnboardingView(APIView):
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]

    def _application(self, request, application_id, lock=False):
        queryset = JobApplication.objects.select_related(
            'job_posting__company', 'job_posting__department',
            'job_posting__designation', 'converted_employee', 'offer',
        )
        if lock:
            queryset = queryset.select_for_update()
        return queryset.get(
            id=application_id,
            job_posting__company=request.service_user.company,
        )

    @staticmethod
    def _preview(application, request):
        job = application.job_posting
        offer = getattr(application, 'offer', None)
        if not offer:
            return None
        annual_salary = offer.salary_offered
        converted = application.converted_employee
        return {
            'application_id': application.id,
            'application_number': application.application_number,
            'candidate_name': application.full_name,
            'job_title': job.title,
            'offer_status': offer.status,
            'annual_salary_offered': float(annual_salary),
            'already_converted': converted is not None,
            'employee': (
                EmployeeListSerializer(converted, context={'request': request}).data
                if converted else None
            ),
            'resume_url': request.build_absolute_uri(application.resume.url) if application.resume else None,
            'initial_data': {
                'first_name': application.first_name,
                'last_name': application.last_name,
                'email': application.email,
                'phone': application.phone,
                'department': job.department_id,
                'designation': job.designation_id,
                'employment_type': job.employment_type,
                'work_mode': job.work_mode,
                'date_of_joining': offer.joining_date.isoformat(),
                'base_salary': str(round(annual_salary / 12, 2)),
                'city': application.current_location,
                'skills': application.skills or [],
            },
        }

    def get(self, request, application_id):
        try:
            application = self._application(request, application_id)
        except JobApplication.DoesNotExist:
            return Response({'detail': 'Candidate not found.'}, status=status.HTTP_404_NOT_FOUND)
        offer = getattr(application, 'offer', None)
        if not offer or offer.status != 'accepted':
            return Response(
                {'detail': 'Candidate must accept the offer before onboarding.'},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(self._preview(application, request))

    def post(self, request, application_id):
        with transaction.atomic():
            try:
                application = self._application(request, application_id, lock=True)
            except JobApplication.DoesNotExist:
                return Response({'detail': 'Candidate not found.'}, status=status.HTTP_404_NOT_FOUND)

            offer = getattr(application, 'offer', None)
            if not offer or offer.status != 'accepted':
                return Response(
                    {'detail': 'Candidate must accept the offer before onboarding.'},
                    status=status.HTTP_409_CONFLICT,
                )
            if application.converted_employee_id:
                return Response(
                    {'detail': 'This candidate is already an employee.'},
                    status=status.HTTP_409_CONFLICT,
                )

            serializer = EmployeeCreateSerializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            employee = serializer.save(
                company=request.service_user.company,
                created_by=request.service_user,
            )
            application.converted_employee = employee
            application.converted_at = timezone.now()
            application.converted_by = request.service_user
            application.status = 'selected'
            application.save(update_fields=[
                'converted_employee', 'converted_at', 'converted_by', 'status', 'updated_at',
            ])

        return Response(
            EmployeeListSerializer(employee, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

class OfferDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete job offers"""
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return JobOffer.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return JobOffer.objects.filter(
                application__job_posting__company=session.service_user.company
            )
        except ServiceUserSession.DoesNotExist:
            return JobOffer.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['PUT', 'PATCH', 'DELETE']:
            session_key = self.request.data.get('session_key') if hasattr(self.request, 'data') else None
        return session_key

    def retrieve(self, request, *args, **kwargs):
        offer = self.get_object()
        return Response(OfferSerializer.serialize(offer))

    def update(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            offer = self.get_object()

            requested_status = request.data.get('status')
            if requested_status and requested_status != offer.status:
                allowed_transitions = {
                    'draft': {'withdrawn'},
                    'sent': {'accepted', 'rejected', 'withdrawn'},
                    'accepted': set(),
                    'rejected': set(),
                    'withdrawn': set(),
                    'expired': set(),
                }
                if requested_status not in allowed_transitions.get(offer.status, set()):
                    return Response(
                        {'status': [f'Cannot move offer from {offer.status} to {requested_status}.']},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # Update fields
            for field in ['salary_offered', 'joining_date', 'offer_valid_until', 
                         'benefits', 'terms_conditions', 'notes',
                         'candidate_response', 'negotiation_notes']:
                if field in request.data:
                    setattr(offer, field, request.data[field])

            offer.full_clean()
            with transaction.atomic():
                offer.save()
                if requested_status == 'accepted':
                    offer.accept_offer()
                elif requested_status == 'rejected':
                    offer.reject_offer()
                elif requested_status == 'withdrawn':
                    offer.status = 'withdrawn'
                    offer.save(update_fields=['status', 'updated_at'])
                    if offer.application.status == 'offer_sent':
                        offer.application.status = 'interviewed'
                        offer.application.save(update_fields=['status', 'updated_at'])
            return Response(OfferSerializer.serialize(offer))

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except ValidationError as exc:
            return Response(
                {'detail': exc.message_dict if hasattr(exc, 'message_dict') else exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )
