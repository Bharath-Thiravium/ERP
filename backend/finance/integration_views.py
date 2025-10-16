from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.exceptions import ValidationError
from django.db.models import Q, Sum
from django.db import transaction
from django.utils import timezone
from django.http import JsonResponse
from django.core.files.storage import default_storage
from datetime import timedelta
import json

from authentication.models import ServiceUserSession
from .integration_models import (
    BankAccount, BankStatement, ERPIntegration, PaymentGateway,
    AutomatedTaxPayment, EmailAutomation, MobileAppConfig, IntegrationLog
)
from .integration_services import (
    PaymentGatewayService, EmailAutomationService, MobileAppService
)
from .integration_serializers import (
    PaymentGatewaySerializer, EmailAutomationSerializer, MobileAppConfigSerializer,
    IntegrationLogSerializer
)

class IntegrationPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100





# Payment Gateway Views
class PaymentGatewayListCreateView(ListCreateAPIView):
    """List and create payment gateways"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = PaymentGatewaySerializer
    pagination_class = IntegrationPagination
    
    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return PaymentGateway.objects.none()
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return PaymentGateway.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return PaymentGateway.objects.none()
    
    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key
    
    def perform_create(self, serializer):
        session_key = self.get_session_key()
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            serializer.save(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            raise ValidationError({'session_key': 'Invalid session'})

class AutomatedTaxPaymentView(APIView):
    """Process automated tax payment"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        session_key = request.data.get('session_key')
        if not session_key:
            return Response({'error': 'Session key required'}, status=400)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            # Create tax payment record
            tax_payment = AutomatedTaxPayment.objects.create(
                company=session.service_user.company,
                payment_gateway_id=request.data.get('payment_gateway_id'),
                tax_type=request.data.get('tax_type'),
                tax_period=request.data.get('tax_period'),
                amount=request.data.get('amount'),
                payment_date=timezone.now(),
                due_date=request.data.get('due_date')
            )
            
            # Process payment
            result = PaymentGatewayService.process_automated_tax_payment(tax_payment)
            
            return Response({
                'message': 'Tax payment processed',
                'payment_id': tax_payment.id,
                'status': result.get('status'),
                'transaction_id': result.get('transaction_id')
            })
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=401)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

# Email Automation Views
class EmailAutomationListCreateView(ListCreateAPIView):
    """List and create email automations"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = EmailAutomationSerializer
    pagination_class = IntegrationPagination
    
    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return EmailAutomation.objects.none()
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return EmailAutomation.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return EmailAutomation.objects.none()
    
    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key
    
    def perform_create(self, serializer):
        session_key = self.get_session_key()
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            # Calculate next send time
            from django.utils import timezone
            from datetime import timedelta
            
            automation = serializer.save(company=session.service_user.company)
            
            # Set initial next_send time
            now = timezone.now()
            if automation.frequency == 'daily':
                next_send = now + timedelta(days=1)
            elif automation.frequency == 'weekly':
                next_send = now + timedelta(weeks=1)
            elif automation.frequency == 'monthly':
                next_send = now + timedelta(days=30)
            elif automation.frequency == 'quarterly':
                next_send = now + timedelta(days=90)
            else:
                next_send = now + timedelta(days=1)
            
            next_send = next_send.replace(
                hour=automation.send_time.hour,
                minute=automation.send_time.minute,
                second=0,
                microsecond=0
            )
            
            automation.next_send = next_send
            automation.save(update_fields=['next_send'])
            
        except ServiceUserSession.DoesNotExist:
            raise ValidationError({'session_key': 'Invalid session'})

class EmailAutomationDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete email automation"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = EmailAutomationSerializer
    
    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return EmailAutomation.objects.none()
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return EmailAutomation.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return EmailAutomation.objects.none()
    
    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key

# Mobile App Views
class MobileAppConfigView(APIView):
    """Get and update mobile app configuration"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        session_key = request.query_params.get('session_key')
        if not session_key:
            return Response({'error': 'Session key required'}, status=400)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            config, created = MobileAppConfig.objects.get_or_create(
                company=session.service_user.company
            )
            
            serializer = MobileAppConfigSerializer(config)
            return Response(serializer.data)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=401)
    
    def put(self, request):
        session_key = request.data.get('session_key')
        if not session_key:
            return Response({'error': 'Session key required'}, status=400)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            config, created = MobileAppConfig.objects.get_or_create(
                company=session.service_user.company
            )
            
            serializer = MobileAppConfigSerializer(config, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            
            return Response(serializer.errors, status=400)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=401)

class MobileSyncView(APIView):
    """Mobile app data synchronization"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        session_key = request.data.get('session_key')
        if not session_key:
            return Response({'error': 'Session key required'}, status=400)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            last_sync_time = request.data.get('last_sync_time')
            
            # Sync mobile data
            sync_data = MobileAppService.sync_mobile_data(
                company=session.service_user.company,
                last_sync_time=last_sync_time
            )
            
            return Response(sync_data)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=401)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

# Integration Dashboard
@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def integration_dashboard(request):
    """Integration dashboard with analytics"""
    session_key = request.query_params.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        # Bank Integration Stats (Customer-focused)
        from .models import Customer
        from .integration_models import CustomerBankStatement
        from django.db.models import Q
        
        customers_with_bank = Customer.objects.filter(
            company=company
        ).exclude(
            Q(bank_account_number='') | Q(bank_ifsc_code='')
        )
        
        bank_stats = {
            'total_customers': customers_with_bank.count(),
            'verified_customers': customers_with_bank.filter(bank_verification_status='verified').count(),
            'pending_customers': customers_with_bank.filter(bank_verification_status='pending').count(),
            'total_statements': CustomerBankStatement.objects.filter(customer__company=company).count(),
            'matched_statements': CustomerBankStatement.objects.filter(
                customer__company=company, is_matched=True
            ).count()
        }
        
        # ERP Integration Stats (New System)
        erp_integrations = ERPIntegration.objects.filter(company=company)
        erp_stats = {
            'total_integrations': erp_integrations.count(),
            'active_integrations': erp_integrations.filter(is_active=True).count(),
            'connected_integrations': erp_integrations.filter(connection_status='connected').count(),
            'auto_sync_enabled': erp_integrations.filter(auto_sync_enabled=True).count(),
            'recent_syncs': IntegrationLog.objects.filter(
                company=company,
                log_type='erp_sync',
                created_at__gte=timezone.now() - timezone.timedelta(days=7)
            ).count()
        }
        
        # Payment Gateway Stats
        payment_gateways = PaymentGateway.objects.filter(company=company)
        payment_stats = {
            'total_gateways': payment_gateways.count(),
            'active_gateways': payment_gateways.filter(is_active=True).count(),
            'verified_gateways': payment_gateways.filter(is_verified=True).count(),
            'auto_payments_enabled': payment_gateways.filter(
                Q(auto_gst_payment=True) | Q(auto_tds_payment=True)
            ).count()
        }
        
        # Email Automation Stats
        email_automations = EmailAutomation.objects.filter(company=company)
        email_stats = {
            'total_automations': email_automations.count(),
            'active_automations': email_automations.filter(is_active=True).count(),
            'emails_sent_today': IntegrationLog.objects.filter(
                company=company,
                log_type='email_automation',
                status='success',
                created_at__date=timezone.now().date()
            ).count()
        }
        
        # Recent Integration Logs
        recent_logs = IntegrationLog.objects.filter(company=company).order_by('-created_at')[:10]
        logs_data = IntegrationLogSerializer(recent_logs, many=True).data
        
        return Response({
            'bank_integration': bank_stats,
            'erp_integration': erp_stats,
            'payment_gateway': payment_stats,
            'email_automation': email_stats,
            'recent_logs': logs_data
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def test_email_automation(request, automation_id):
    """Test email automation by sending a test email"""
    session_key = request.data.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        automation = EmailAutomation.objects.get(
            id=automation_id,
            company=company
        )
        
        from .email_automation_service import EmailAutomationService
        service = EmailAutomationService(company)
        
        # Get test recipients (just the current user's email)
        test_recipients = [session.service_user.email] if session.service_user.email else []
        if not test_recipients:
            return Response({'error': 'No email address found for current user'}, status=400)
        
        # Create test context
        context = {
            'company_name': company.name,
            'automation_title': f"[TEST] {automation.title}",
            'current_date': timezone.now().strftime('%d %B %Y'),
            'due_date': (timezone.now().date() + timezone.timedelta(days=7)).strftime('%d %B %Y'),
            'days_remaining': 7,
            'invoice_count': 5,
            'total_outstanding': '₹50,000.00'
        }
        
        subject = service._render_template(automation.subject_template, context)
        body = service._render_template(automation.body_template, context)
        
        success = service.email_service.send_email(
            to_emails=test_recipients,
            subject=f"[TEST] {subject}",
            html_content=service._create_html_email(body, context),
            text_content=body
        )
        
        return Response({
            'success': success,
            'message': 'Test email sent successfully!' if success else 'Failed to send test email',
            'recipients': test_recipients
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except EmailAutomation.DoesNotExist:
        return Response({'error': 'Email automation not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def trigger_email_automation(request, automation_id):
    """Manually trigger email automation"""
    session_key = request.data.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        automation = EmailAutomation.objects.get(
            id=automation_id,
            company=company
        )
        
        from .email_automation_service import EmailAutomationService
        service = EmailAutomationService(company)
        
        # Process the automation
        service.process_automation(automation)
        
        return Response({
            'success': True,
            'message': f"Email automation '{automation.title}' triggered successfully",
            'last_sent': automation.last_sent,
            'next_send': automation.next_send
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except EmailAutomation.DoesNotExist:
        return Response({'error': 'Email automation not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)