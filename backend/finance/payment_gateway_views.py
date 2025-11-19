from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from django.db.models import Q, Sum, Count
from django.utils import timezone
from decimal import Decimal
import json

from authentication.models import ServiceUserSession
from .integration_models import PaymentGateway, AutomatedTaxPayment, IntegrationLog
from .models import Invoice, ProformaInvoice, Payment
from .integration_serializers import PaymentGatewaySerializer
from .payment_gateway_service import PaymentGatewayService

class EnhancedPaymentGatewayListCreateView(ListCreateAPIView):
    """Enhanced Payment Gateway management with testing capabilities"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = PaymentGatewaySerializer
    
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
            
            # Handle encrypted credentials
            credentials = self.request.data.get('credentials', {})
            gateway = serializer.save(
                company=session.service_user.company,
                encrypted_credentials=credentials
            )
            
            # Test connection after creation
            test_result = PaymentGatewayService.test_gateway_connection(gateway)
            if test_result.get('success'):
                gateway.is_verified = True
                gateway.save()
            
        except ServiceUserSession.DoesNotExist:
            raise ValidationError({'session_key': 'Invalid session'})

class PaymentGatewayDetailView(RetrieveUpdateDestroyAPIView):
    """Enhanced Payment Gateway detail view"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = PaymentGatewaySerializer
    
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
        if not session_key and self.request.method in ['PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key
    
    def perform_update(self, serializer):
        # Handle credentials update
        credentials = self.request.data.get('credentials', {})
        if credentials:
            serializer.save(encrypted_credentials=credentials)
        else:
            serializer.save()

@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def test_payment_gateway(request, gateway_id):
    """Test payment gateway connection"""
    session_key = request.data.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        
        try:
            gateway = PaymentGateway.objects.get(
                id=gateway_id,
                company=session.service_user.company
            )
        except PaymentGateway.DoesNotExist:
            return Response({'error': 'Payment gateway not found'}, status=404)
        
        # Test connection
        result = PaymentGatewayService.test_gateway_connection(gateway)
        
        # Update verification status
        if result.get('success'):
            gateway.is_verified = True
            gateway.save()
            
            # Log successful test
            IntegrationLog.objects.create(
                company=session.service_user.company,
                log_type='payment_gateway',
                status='success',
                message=f'Gateway test successful: {gateway.gateway_name}'
            )
        else:
            gateway.is_verified = False
            gateway.save()
            
            # Log failed test
            IntegrationLog.objects.create(
                company=session.service_user.company,
                log_type='payment_gateway',
                status='error',
                message=f'Gateway test failed: {gateway.gateway_name} - {result.get("message")}'
            )
        
        return Response(result)
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def process_invoice_payment(request):
    """Process payment for invoice through gateway"""
    session_key = request.data.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        
        gateway_id = request.data.get('gateway_id')
        invoice_id = request.data.get('invoice_id')
        amount = Decimal(str(request.data.get('amount', 0)))
        payment_method = request.data.get('payment_method', 'online')
        
        if not all([gateway_id, invoice_id, amount]):
            return Response({'error': 'Gateway ID, Invoice ID, and Amount are required'}, status=400)
        
        try:
            gateway = PaymentGateway.objects.get(
                id=gateway_id,
                company=session.service_user.company,
                is_active=True
            )
        except PaymentGateway.DoesNotExist:
            return Response({'error': 'Payment gateway not found or inactive'}, status=404)
        
        # Process payment
        result = PaymentGatewayService.process_invoice_payment(
            gateway, invoice_id, amount, payment_method
        )
        
        return Response(result)
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def generate_payment_link(request):
    """Generate payment link for invoice"""
    session_key = request.data.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        
        gateway_id = request.data.get('gateway_id')
        invoice_id = request.data.get('invoice_id')
        amount = Decimal(str(request.data.get('amount', 0)))
        
        if not all([gateway_id, invoice_id, amount]):
            return Response({'error': 'Gateway ID, Invoice ID, and Amount are required'}, status=400)
        
        try:
            gateway = PaymentGateway.objects.get(
                id=gateway_id,
                company=session.service_user.company,
                is_active=True
            )
        except PaymentGateway.DoesNotExist:
            return Response({'error': 'Payment gateway not found or inactive'}, status=404)
        
        # Generate payment link
        result = PaymentGatewayService.get_payment_link(gateway, invoice_id, amount)
        
        if result.get('success'):
            # Log payment link generation
            IntegrationLog.objects.create(
                company=session.service_user.company,
                log_type='payment_gateway',
                status='success',
                message=f'Payment link generated for invoice ID: {invoice_id}',
                details=result
            )
        
        return Response(result)
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def payment_gateway_dashboard(request):
    """Payment Gateway dashboard with analytics"""
    session_key = request.query_params.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        # Gateway statistics
        gateways = PaymentGateway.objects.filter(company=company)
        gateway_stats = {
            'total_gateways': gateways.count(),
            'active_gateways': gateways.filter(is_active=True).count(),
            'verified_gateways': gateways.filter(is_verified=True).count(),
            'auto_gst_enabled': gateways.filter(auto_gst_payment=True).count(),
            'auto_tds_enabled': gateways.filter(auto_tds_payment=True).count()
        }
        
        # Payment statistics (last 30 days)
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        recent_payments = Payment.objects.filter(
            company=company,
            created_at__gte=thirty_days_ago
        )
        
        payment_stats = {
            'total_payments': recent_payments.count(),
            'total_amount': recent_payments.aggregate(
                total=Sum('amount')
            )['total'] or 0,
            'online_payments': recent_payments.filter(
                payment_method__in=['online', 'upi', 'card']
            ).count(),
            'successful_payments': recent_payments.filter(status='completed').count()
        }
        
        # Gateway-wise payment breakdown
        gateway_payments = []
        for gateway in gateways.filter(is_active=True):
            gateway_payment_count = recent_payments.filter(
                notes__icontains=gateway.gateway_name
            ).count()
            
            gateway_payments.append({
                'gateway_name': gateway.gateway_name,
                'gateway_type': gateway.gateway_type,
                'payment_count': gateway_payment_count,
                'is_verified': gateway.is_verified
            })
        
        # Recent payment gateway logs
        recent_logs = IntegrationLog.objects.filter(
            company=company,
            log_type='payment_gateway'
        ).order_by('-created_at')[:10]
        
        logs_data = [{
            'id': log.id,
            'status': log.status,
            'message': log.message,
            'created_at': log.created_at.isoformat()
        } for log in recent_logs]
        
        return Response({
            'gateway_stats': gateway_stats,
            'payment_stats': payment_stats,
            'gateway_payments': gateway_payments,
            'recent_logs': logs_data
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def get_invoices_for_payment(request):
    """Get invoices available for payment processing"""
    session_key = request.query_params.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        # Get unpaid/partially paid invoices
        invoices = Invoice.objects.filter(
            company=company,
            payment_status__in=['unpaid', 'partially_paid']
        ).select_related('customer').order_by('-created_at')[:50]
        
        invoice_data = []
        for invoice in invoices:
            invoice_data.append({
                'id': invoice.id,
                'invoice_number': invoice.invoice_number,
                'customer_name': invoice.customer.name,
                'customer_id': invoice.customer.id,
                'total_amount': str(invoice.total_amount),
                'outstanding_amount': str(invoice.outstanding_amount),
                'payment_status': invoice.payment_status,
                'due_date': invoice.due_date.isoformat() if invoice.due_date else None,
                'created_at': invoice.created_at.isoformat()
            })
        
        # Also get proforma invoices
        proforma_invoices = ProformaInvoice.objects.filter(
            company=company,
            payment_status__in=['unpaid', 'partially_paid']
        ).select_related('customer').order_by('-created_at')[:50]
        
        proforma_data = []
        for proforma in proforma_invoices:
            proforma_data.append({
                'id': proforma.id,
                'proforma_number': proforma.proforma_number,
                'customer_name': proforma.customer.name,
                'customer_id': proforma.customer.id,
                'total_amount': str(proforma.total_amount),
                'outstanding_amount': str(proforma.outstanding_amount),
                'payment_status': proforma.payment_status,
                'due_date': proforma.due_date.isoformat() if proforma.due_date else None,
                'created_at': proforma.created_at.isoformat()
            })
        
        return Response({
            'invoices': invoice_data,
            'proforma_invoices': proforma_data
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)