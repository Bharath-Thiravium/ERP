from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework import permissions
from django.db.models import Sum, Q
from authentication.models import ServiceUserSession
from .models import Payment, Customer
from .serializers import WorldClassPaymentCreateSerializer
from decimal import Decimal


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def create_direct_payment(request):
    """Create a direct customer payment without invoice"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        # Get customer
        customer_id = request.data.get('customer_id')
        if not customer_id:
            return Response({'error': 'Customer ID required'}, status=400)
        
        try:
            customer = Customer.objects.get(id=customer_id, company=service_user.company)
        except Customer.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=404)
        
        # Extract payment data for direct payment
        payment_data = {
            'payment_type': 'direct',
            'customer': customer.id,
            'payment_purpose': request.data.get('payment_purpose', ''),
            'payment_date': request.data.get('payment_date'),
            'amount': request.data.get('amount'),
            'gross_payment_amount': request.data.get('amount'),
            'payment_method': request.data.get('payment_method', 'bank_transfer'),
            'reference_number': request.data.get('reference_number', ''),
            'transaction_id': request.data.get('transaction_id', ''),
            'bank_name': request.data.get('bank_name', ''),
            'notes': request.data.get('notes', ''),
            'status': 'completed',
            # TDS fields
            'tds_applicable': request.data.get('tds_applicable', False),
            'tds_amount': request.data.get('tds_amount', 0),
            'tds_rate': request.data.get('tds_rate', 0),
            'tds_section': request.data.get('tds_section', ''),
            'net_amount_received': request.data.get('net_amount_received', request.data.get('amount')),
        }
        
        # Create payment using serializer
        serializer = WorldClassPaymentCreateSerializer(data=payment_data, context={'request': request})
        if serializer.is_valid():
            payment = serializer.save(
                company=service_user.company,
                created_by=service_user
            )
            
            return Response({
                'message': 'Direct payment created successfully',
                'payment_id': payment.id,
                'payment_number': payment.payment_number,
                'amount': float(payment.amount),
                'net_amount_received': float(payment.net_amount_received)
            }, status=201)
        else:
            return Response({'errors': serializer.errors}, status=400)
            
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def list_direct_payments(request):
    """List all direct customer payments"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        # Get query parameters
        customer_id = request.query_params.get('customer_id')
        
        # Build query
        payments = Payment.objects.filter(
            company=service_user.company,
            payment_type='direct'
        ).select_related('customer', 'created_by')
        
        if customer_id:
            payments = payments.filter(customer_id=customer_id)
        
        # Order by date
        payments = payments.order_by('-payment_date', '-created_at')
        
        # Serialize data
        payment_list = []
        for payment in payments:
            payment_list.append({
                'id': payment.id,
                'payment_number': payment.payment_number,
                'payment_date': payment.payment_date.isoformat(),
                'customer_id': payment.customer.id,
                'customer_name': payment.customer.name,
                'customer_code': payment.customer.customer_code,
                'payment_purpose': payment.payment_purpose,
                'amount': float(payment.amount),
                'gross_payment_amount': float(payment.gross_payment_amount),
                'tds_applicable': payment.tds_applicable,
                'tds_amount': float(payment.tds_amount),
                'tds_rate': float(payment.tds_rate),
                'net_amount_received': float(payment.net_amount_received),
                'payment_method': payment.payment_method,
                'reference_number': payment.reference_number,
                'transaction_id': payment.transaction_id,
                'bank_name': payment.bank_name,
                'status': payment.status,
                'notes': payment.notes,
                'created_by': payment.created_by.user.get_full_name() if payment.created_by else None,
                'created_at': payment.created_at.isoformat(),
            })
        
        return Response({
            'payments': payment_list,
            'total_count': len(payment_list)
        })
            
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def get_direct_payment(request, payment_id):
    """Get details of a specific direct payment"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        try:
            payment = Payment.objects.select_related('customer', 'created_by').get(
                id=payment_id,
                company=service_user.company,
                payment_type='direct'
            )
        except Payment.DoesNotExist:
            return Response({'error': 'Direct payment not found'}, status=404)
        
        payment_data = {
            'id': payment.id,
            'payment_number': payment.payment_number,
            'payment_date': payment.payment_date.isoformat(),
            'customer_id': payment.customer.id,
            'customer_name': payment.customer.name,
            'customer_code': payment.customer.customer_code,
            'payment_purpose': payment.payment_purpose,
            'amount': float(payment.amount),
            'gross_payment_amount': float(payment.gross_payment_amount),
            'tds_applicable': payment.tds_applicable,
            'tds_amount': float(payment.tds_amount),
            'tds_rate': float(payment.tds_rate),
            'tds_section': payment.tds_section,
            'net_amount_received': float(payment.net_amount_received),
            'payment_method': payment.payment_method,
            'reference_number': payment.reference_number,
            'transaction_id': payment.transaction_id,
            'bank_name': payment.bank_name,
            'status': payment.status,
            'notes': payment.notes,
            'created_by': payment.created_by.user.get_full_name() if payment.created_by else None,
            'created_at': payment.created_at.isoformat(),
            'updated_at': payment.updated_at.isoformat(),
        }
        
        return Response(payment_data)
            
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['DELETE'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def delete_direct_payment(request, payment_id):
    """Delete a direct payment"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        try:
            payment = Payment.objects.get(
                id=payment_id,
                company=service_user.company,
                payment_type='direct'
            )
        except Payment.DoesNotExist:
            return Response({'error': 'Direct payment not found'}, status=404)
        
        payment_number = payment.payment_number
        payment.delete()
        
        return Response({
            'message': f'Direct payment {payment_number} deleted successfully'
        })
            
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def customer_payment_summary(request, customer_id):
    """Get payment summary for a customer including direct payments"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        try:
            customer = Customer.objects.get(id=customer_id, company=service_user.company)
        except Customer.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=404)
        
        # Get all payments for this customer
        all_payments = Payment.objects.filter(
            customer=customer,
            company=service_user.company,
            status='completed'
        )
        
        # Invoice payments
        invoice_payments = all_payments.filter(payment_type='invoice')
        invoice_total = invoice_payments.aggregate(total=Sum('net_amount_received'))['total'] or Decimal('0')
        
        # Direct payments, including legacy unallocated completed credits
        direct_payments = all_payments.filter(
            Q(payment_type='direct') |
            (Q(payment_type='invoice') & Q(invoice__isnull=True) & Q(proforma_invoice__isnull=True))
        ).exclude(payment_type='tds_only')
        direct_total = direct_payments.aggregate(total=Sum('net_amount_received'))['total'] or Decimal('0')
        
        # TDS summary
        total_tds = all_payments.aggregate(total=Sum('tds_amount'))['total'] or Decimal('0')
        
        return Response({
            'customer_id': customer.id,
            'customer_name': customer.name,
            'customer_code': customer.customer_code,
            'invoice_payments_total': float(invoice_total),
            'invoice_payments_count': invoice_payments.count(),
            'direct_payments_total': float(direct_total),
            'direct_payments_count': direct_payments.count(),
            'total_payments': float(invoice_total + direct_total),
            'total_tds_deducted': float(total_tds),
            'total_payments_count': all_payments.count(),
        })
            
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)
