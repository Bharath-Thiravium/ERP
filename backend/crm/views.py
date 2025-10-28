from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import permissions
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum, Avg
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Lead, Contact, Account, Opportunity, Activity, Campaign, CampaignMember, SalesTarget
from .serializers import (
    LeadSerializer, ContactSerializer, AccountSerializer, OpportunitySerializer,
    ActivitySerializer, CampaignSerializer, CampaignMemberSerializer, SalesTargetSerializer,
    DashboardStatsSerializer, LeadsByStatusSerializer, OpportunitiesByStageSerializer
)
from authentication.models import Company, ServiceUserSession


class CRMBaseViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return self.queryset.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            return self.queryset.filter(company=company)
        except ServiceUserSession.DoesNotExist:
            return self.queryset.none()

    def list(self, request, *args, **kwargs):
        """Override list to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return super().list(request, *args, **kwargs)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    def create(self, request, *args, **kwargs):
        """Override create to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user
            
            # Add company and created_by to request data before serialization
            data = request.data.copy()
            data['company'] = service_user.company.id
            
            # CRITICAL FIX: Ensure created_by is always set properly
            user_id = None
            if hasattr(service_user, 'created_by') and service_user.created_by:
                user_id = service_user.created_by.id
            else:
                # Fallback to company admin user or superuser
                from django.contrib.auth.models import User
                admin_user = User.objects.filter(is_superuser=True).first()
                if admin_user:
                    user_id = admin_user.id
                else:
                    return Response({'error': 'No valid user found for created_by field'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Set model-specific required fields
            model_class = self.get_serializer().Meta.model
            
            # Set created_by only for models that have this field
            if hasattr(model_class, 'created_by'):
                data['created_by'] = user_id
            
            # For Activity model, also set assigned_to if not provided
            if hasattr(model_class, 'assigned_to') and ('assigned_to' not in data or not data['assigned_to']):
                data['assigned_to'] = user_id
                
            # For models with owner field (Opportunity, Deal), handle owner field
            if hasattr(model_class, 'owner'):
                if 'owner' not in data or not data['owner'] or data['owner'] == 'auto':
                    data['owner'] = user_id
                else:
                    # If a specific owner is provided, validate it exists
                    try:
                        from django.contrib.auth.models import User
                        User.objects.get(id=int(data['owner']))
                    except (User.DoesNotExist, ValueError):
                        # If invalid owner, use current user
                        data['owner'] = user_id
                
            # For Lead model, set assigned_to if not provided
            if hasattr(model_class, 'assigned_to') and model_class.__name__ == 'Lead' and ('assigned_to' not in data or not data['assigned_to']):
                data['assigned_to'] = user_id
            
            # For Deal model, ensure both created_by and owner are set
            if model_class.__name__ == 'Deal':
                data['created_by'] = user_id
                if 'owner' not in data or not data['owner']:
                    data['owner'] = user_id
            
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            
            # Explicitly pass created_by to save method
            from django.contrib.auth.models import User
            created_by_user = User.objects.get(id=user_id)
            instance = serializer.save(created_by=created_by_user)
            
            return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            import traceback
            print(f"CRM Create Error: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            return Response({'error': f'Creation failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return super().retrieve(request, *args, **kwargs)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    def update(self, request, *args, **kwargs):
        """Override update to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user
            
            # Add company to request data for update
            data = request.data.copy()
            data['company'] = service_user.company.id
            
            # Ensure created_by is set for update
            user_id = None
            if hasattr(service_user, 'created_by') and service_user.created_by:
                user_id = service_user.created_by.id
            else:
                from django.contrib.auth.models import User
                admin_user = User.objects.filter(is_superuser=True).first()
                if admin_user:
                    user_id = admin_user.id
            
            if user_id:
                data['created_by'] = user_id
                # For Opportunity updates, handle owner field
                if 'owner' in data and (not data['owner'] or data['owner'] == 'auto'):
                    data['owner'] = user_id
                elif 'owner' in data:
                    # Validate provided owner ID
                    try:
                        from django.contrib.auth.models import User
                        User.objects.get(id=int(data['owner']))
                    except (User.DoesNotExist, ValueError):
                        data['owner'] = user_id
            
            # Update request data
            request._full_data = data
            
            return super().update(request, *args, **kwargs)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    def destroy(self, request, *args, **kwargs):
        """Override destroy to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return super().destroy(request, *args, **kwargs)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class LeadViewSet(CRMBaseViewSet):
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer
    filterset_fields = ['status', 'priority', 'source', 'assigned_to']
    search_fields = ['first_name', 'last_name', 'email', 'company_name']
    ordering_fields = ['created_at', 'updated_at', 'last_contacted', 'estimated_value']
    ordering = ['-created_at']

    @action(detail=True, methods=['post'])
    def convert_to_opportunity(self, request, pk=None):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        
        lead = self.get_object()
        
        # Check if lead is already converted
        if lead.status == 'won':
            return Response({'error': 'Lead has already been converted to opportunity'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get or create a default user for this service user
        default_user = None
        if hasattr(service_user, 'created_by') and service_user.created_by:
            default_user = service_user.created_by
        else:
            # Fallback to company admin user or superuser
            from django.contrib.auth.models import User
            admin_user = User.objects.filter(is_superuser=True).first()
            if admin_user:
                default_user = admin_user
            else:
                return Response({'error': 'No valid user found for conversion'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create account using serializer
        account_data = {
            'company': lead.company.id,
            'name': lead.company_name or f"{lead.first_name} {lead.last_name}",
            'account_type': 'prospect',
            'email': lead.email,
            'created_by': default_user.id
        }
        account_serializer = AccountSerializer(data=account_data)
        if account_serializer.is_valid():
            account = account_serializer.save(created_by=default_user)
        else:
            return Response({'error': f'Failed to create account: {account_serializer.errors}'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create contact using serializer
        contact_data = {
            'company': lead.company.id,
            'first_name': lead.first_name,
            'last_name': lead.last_name,
            'email': lead.email,
            'phone': lead.phone,
            'job_title': lead.job_title,
            'created_by': default_user.id
        }
        contact_serializer = ContactSerializer(data=contact_data)
        if contact_serializer.is_valid():
            contact = contact_serializer.save(created_by=default_user)
        else:
            return Response({'error': f'Failed to create contact: {contact_serializer.errors}'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create opportunity using serializer
        opportunity_data = {
            'company': lead.company.id,
            'name': f"{lead.first_name} {lead.last_name} - Opportunity",
            'account': account.id,
            'contact': contact.id,
            'amount': lead.estimated_value or 0,
            'expected_close_date': lead.expected_close_date or timezone.now().date() + timedelta(days=30),
            'owner': lead.assigned_to.id if lead.assigned_to else default_user.id,
            'created_by': default_user.id,
            'description': lead.description
        }
        opportunity_serializer = OpportunitySerializer(data=opportunity_data)
        if opportunity_serializer.is_valid():
            opportunity = opportunity_serializer.save(created_by=default_user, owner_id=lead.assigned_to.id if lead.assigned_to else default_user.id)
        else:
            return Response({'error': f'Failed to create opportunity: {opportunity_serializer.errors}'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update lead status to converted
        lead.status = 'won'
        lead.save()
        
        return Response({
            'message': 'Lead converted successfully',
            'opportunity_id': opportunity.opportunity_id,
            'account_id': account.account_id,
            'contact_id': contact.contact_id,
            'lead_status': 'won'
        })

    @action(detail=False)
    def by_status(self, request):
        queryset = self.get_queryset()
        stats = queryset.values('status').annotate(count=Count('id')).order_by('status')
        serializer = LeadsByStatusSerializer(stats, many=True)
        return Response(serializer.data)


class ContactViewSet(CRMBaseViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    filterset_fields = ['is_active', 'department']
    search_fields = ['first_name', 'last_name', 'email', 'job_title', 'department']
    ordering_fields = ['first_name', 'last_name', 'created_at']
    ordering = ['first_name', 'last_name']


class AccountViewSet(CRMBaseViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    filterset_fields = ['account_type', 'industry', 'is_active']
    search_fields = ['name', 'email', 'website']
    ordering_fields = ['name', 'created_at', 'annual_revenue']
    ordering = ['name']

    @action(detail=True)
    def opportunities(self, request, pk=None):
        account = self.get_object()
        opportunities = account.opportunities.all()
        serializer = OpportunitySerializer(opportunities, many=True)
        return Response(serializer.data)

    @action(detail=True)
    def activities(self, request, pk=None):
        account = self.get_object()
        activities = account.activities.all()
        serializer = ActivitySerializer(activities, many=True)
        return Response(serializer.data)


class OpportunityViewSet(CRMBaseViewSet):
    queryset = Opportunity.objects.all()
    serializer_class = OpportunitySerializer
    filterset_fields = ['stage', 'probability', 'owner']
    search_fields = ['name', 'account__name', 'description']
    ordering_fields = ['created_at', 'expected_close_date', 'amount', 'probability']
    ordering = ['-created_at']

    @action(detail=False)
    def pipeline(self, request):
        queryset = self.get_queryset()
        pipeline = queryset.values('stage').annotate(
            count=Count('id'),
            total_value=Sum('amount')
        ).order_by('stage')
        serializer = OpportunitiesByStageSerializer(pipeline, many=True)
        return Response(serializer.data)

    @action(detail=False)
    def forecast(self, request):
        queryset = self.get_queryset().exclude(stage__in=['closed_won', 'closed_lost'])
        forecast_data = {
            'total_pipeline_value': queryset.aggregate(Sum('amount'))['amount__sum'] or 0,
            'weighted_pipeline_value': sum(opp.weighted_amount for opp in queryset),
            'opportunities_count': queryset.count(),
            'avg_deal_size': queryset.aggregate(Avg('amount'))['amount__avg'] or 0,
        }
        return Response(forecast_data)

    @action(detail=True, methods=['post'])
    def update_stage(self, request, pk=None):
        opportunity = self.get_object()
        new_stage = request.data.get('stage')
        
        if new_stage in dict(Opportunity.STAGE_CHOICES):
            opportunity.stage = new_stage
            if new_stage in ['closed_won', 'closed_lost']:
                opportunity.closed_date = timezone.now().date()
            opportunity.save()
            
            serializer = self.get_serializer(opportunity)
            return Response(serializer.data)
        
        return Response({'error': 'Invalid stage'}, status=status.HTTP_400_BAD_REQUEST)


class ActivityViewSet(CRMBaseViewSet):
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    filterset_fields = ['activity_type', 'status', 'assigned_to']
    search_fields = ['subject', 'description']
    ordering_fields = ['due_date', 'created_at']
    ordering = ['due_date']

    @action(detail=False)
    def today(self, request):
        today = timezone.now().date()
        queryset = self.get_queryset().filter(due_date__date=today)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False)
    def overdue(self, request):
        now = timezone.now()
        queryset = self.get_queryset().filter(
            due_date__lt=now,
            status__in=['planned', 'in_progress']
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        activity = self.get_object()
        activity.status = 'completed'
        activity.completed_at = timezone.now()
        activity.outcome = request.data.get('outcome', '')
        activity.save()
        
        serializer = self.get_serializer(activity)
        return Response(serializer.data)


class CampaignViewSet(CRMBaseViewSet):
    queryset = Campaign.objects.all()
    serializer_class = CampaignSerializer
    filterset_fields = ['campaign_type', 'status']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'start_date', 'end_date']
    ordering = ['-created_at']

    @action(detail=True)
    def members(self, request, pk=None):
        campaign = self.get_object()
        members = campaign.members.all()
        serializer = CampaignMemberSerializer(members, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_members(self, request, pk=None):
        campaign = self.get_object()
        lead_ids = request.data.get('lead_ids', [])
        contact_ids = request.data.get('contact_ids', [])
        
        added_count = 0
        
        # Add leads
        for lead_id in lead_ids:
            try:
                lead = Lead.objects.get(id=lead_id, company=campaign.company)
                CampaignMember.objects.get_or_create(
                    campaign=campaign,
                    lead=lead,
                    defaults={'sent_date': timezone.now()}
                )
                added_count += 1
            except Lead.DoesNotExist:
                continue
        
        # Add contacts
        for contact_id in contact_ids:
            try:
                contact = Contact.objects.get(id=contact_id, company=campaign.company)
                CampaignMember.objects.get_or_create(
                    campaign=campaign,
                    contact=contact,
                    defaults={'sent_date': timezone.now()}
                )
                added_count += 1
            except Contact.DoesNotExist:
                continue
        
        return Response({'message': f'{added_count} members added to campaign'})


class SalesTargetViewSet(CRMBaseViewSet):
    queryset = SalesTarget.objects.all()
    serializer_class = SalesTargetSerializer
    filterset_fields = ['period', 'year', 'user']
    ordering_fields = ['year', 'month', 'quarter', 'target_amount']
    ordering = ['-year', '-month', '-quarter']

    @action(detail=False)
    def current_performance(self, request):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        
        current_year = timezone.now().year
        current_month = timezone.now().month
        current_quarter = (current_month - 1) // 3 + 1
        
        # Get current targets
        monthly_target = SalesTarget.objects.filter(
            user=service_user,
            period='monthly',
            year=current_year,
            month=current_month
        ).first()
        
        quarterly_target = SalesTarget.objects.filter(
            user=service_user,
            period='quarterly',
            year=current_year,
            quarter=current_quarter
        ).first()
        
        yearly_target = SalesTarget.objects.filter(
            user=service_user,
            period='yearly',
            year=current_year
        ).first()
        
        performance_data = {
            'monthly': SalesTargetSerializer(monthly_target).data if monthly_target else None,
            'quarterly': SalesTargetSerializer(quarterly_target).data if quarterly_target else None,
            'yearly': SalesTargetSerializer(yearly_target).data if yearly_target else None,
        }
        
        return Response(performance_data)


class DashboardViewSet(viewsets.ViewSet):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get_session_key(self, request):
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.query_params.get('session_key')
        return session_key

    def list(self, request):
        """Override list to handle session authentication"""
        session_key = self.get_session_key(request)
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

        # Get dashboard statistics
        today = timezone.now().date()
        
        stats = {
            'total_leads': Lead.objects.filter(company=company).count(),
            'total_opportunities': Opportunity.objects.filter(company=company).count(),
            'total_accounts': Account.objects.filter(company=company).count(),
            'total_contacts': Contact.objects.filter(company=company).count(),
            'pipeline_value': Opportunity.objects.filter(
                company=company,
                stage__in=['prospecting', 'qualification', 'needs_analysis', 'proposal', 'negotiation']
            ).aggregate(Sum('amount'))['amount__sum'] or 0,
            'won_opportunities': Opportunity.objects.filter(
                company=company,
                stage='closed_won'
            ).count(),
            'activities_today': Activity.objects.filter(
                company=company,
                due_date__date=today
            ).count(),
            'overdue_activities': Activity.objects.filter(
                company=company,
                due_date__lt=timezone.now(),
                status__in=['planned', 'in_progress']
            ).count(),
        }
        
        serializer = DashboardStatsSerializer(stats)
        return Response(serializer.data)

    @action(detail=False)
    def recent_activities(self, request):
        session_key = self.get_session_key(request)
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        
        activities = Activity.objects.filter(company=company).order_by('-created_at')[:10]
        serializer = ActivitySerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=False)
    def sales_funnel(self, request):
        session_key = self.get_session_key(request)
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        
        funnel_data = []
        
        # Leads by status
        lead_stats = Lead.objects.filter(company=company).values('status').annotate(count=Count('id'))
        for stat in lead_stats:
            funnel_data.append({
                'stage': f"Leads - {stat['status'].title()}",
                'count': stat['count'],
                'type': 'lead'
            })
        
        # Opportunities by stage
        opp_stats = Opportunity.objects.filter(company=company).values('stage').annotate(count=Count('id'))
        for stat in opp_stats:
            funnel_data.append({
                'stage': f"Opportunities - {stat['stage'].replace('_', ' ').title()}",
                'count': stat['count'],
                'type': 'opportunity'
            })
        
        return Response(funnel_data)