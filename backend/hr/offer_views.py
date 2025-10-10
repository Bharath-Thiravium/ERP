from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from authentication.models import ServiceUserSession
from .offer_models import JobOffer
from .models import JobApplication

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
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

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

            # Check if offer already exists
            existing_offer = JobOffer.objects.filter(application=application).first()
            if existing_offer:
                # Update existing offer
                existing_offer.salary_offered = request.data.get('salary_offered')
                existing_offer.joining_date = request.data.get('joining_date')
                existing_offer.offer_valid_until = request.data.get('offer_valid_until')
                existing_offer.benefits = request.data.get('benefits', '')
                existing_offer.terms_conditions = request.data.get('terms_conditions', '')
                existing_offer.notes = request.data.get('notes', '')
                existing_offer.save()
                
                # Send updated offer
                email_sent = existing_offer.send_offer()
                
                response_data = OfferSerializer.serialize(existing_offer)
                if not email_sent:
                    response_data['email_warning'] = 'Offer updated but email not sent. Please configure company email settings.'
                
                return Response(response_data, status=status.HTTP_200_OK)
            
            # Create new offer
            offer = JobOffer.objects.create(
                application=application,
                salary_offered=request.data.get('salary_offered'),
                joining_date=request.data.get('joining_date'),
                offer_valid_until=request.data.get('offer_valid_until'),
                benefits=request.data.get('benefits', ''),
                terms_conditions=request.data.get('terms_conditions', ''),
                notes=request.data.get('notes', '')
            )
            
            # Send offer
            email_sent = offer.send_offer()
            
            response_data = OfferSerializer.serialize(offer)
            if not email_sent:
                response_data['email_warning'] = 'Offer created but email not sent. Please configure company email settings.'

            return Response(response_data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except JobApplication.DoesNotExist:
            return Response({'error': 'Invalid application'}, status=status.HTTP_400_BAD_REQUEST)

class OfferDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete job offers"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

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
            
            # Update fields
            for field in ['salary_offered', 'joining_date', 'offer_valid_until', 
                         'benefits', 'terms_conditions', 'notes', 'status',
                         'candidate_response', 'negotiation_notes']:
                if field in request.data:
                    setattr(offer, field, request.data[field])
            
            offer.save()
            return Response(OfferSerializer.serialize(offer))

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)