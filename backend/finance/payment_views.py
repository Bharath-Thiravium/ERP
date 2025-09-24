from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework import permissions
from django.db.models import Sum
from authentication.models import ServiceUserSession
from .models import Invoice, ProformaInvoice, Payment
from .serializers import WorldClassPaymentCreateSerializer


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def update_invoice_payment(request, invoice_id):
    """Update payment for a specific invoice with TDS calculation"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        # Get the invoice
        try:
            invoice = Invoice.objects.get(id=invoice_id, company=service_user.company)
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=404)
        
        # Extract payment data
        payment_data = {
            'invoice': invoice.id,
            'customer': invoice.customer.id,
            'purchase_order': invoice.purchase_order.id if invoice.purchase_order else None,
            'payment_date': request.data.get('payment_date'),
            'amount': request.data.get('amount_received'),
            'payment_method': request.data.get('payment_method', 'bank_transfer'),
            'reference_number': request.data.get('reference_number', ''),
            'notes': request.data.get('notes', ''),
            'status': 'completed',
            # TDS fields
            'tds_amount': request.data.get('tds_amount', 0),
            'tds_percentage': request.data.get('tds_percentage', 0),
            'net_amount_received': request.data.get('net_amount', 0),
        }
        
        # Create payment using serializer
        serializer = WorldClassPaymentCreateSerializer(data=payment_data)
        if serializer.is_valid():
            payment = serializer.save(
                company=service_user.company,
                created_by=service_user
            )
            
            return Response({
                'message': 'Payment updated successfully',
                'payment_id': payment.id,
                'payment_number': payment.payment_number,
                'invoice_outstanding': float(invoice.outstanding_amount)
            })
        else:
            return Response({'errors': serializer.errors}, status=400)
            
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def update_proforma_payment(request, proforma_id):
    """Update payment for a specific proforma invoice with TDS calculation"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        # Get the proforma invoice
        try:
            proforma = ProformaInvoice.objects.get(id=proforma_id, company=service_user.company)
        except ProformaInvoice.DoesNotExist:
            return Response({'error': 'Proforma invoice not found'}, status=404)
        
        # Extract payment data
        payment_data = {
            'proforma_invoice': proforma.id,
            'customer': proforma.customer.id,
            'purchase_order': proforma.purchase_order.id if proforma.purchase_order else None,
            'payment_date': request.data.get('payment_date'),
            'amount': request.data.get('amount_received'),
            'payment_method': request.data.get('payment_method', 'bank_transfer'),
            'reference_number': request.data.get('reference_number', ''),
            'notes': request.data.get('notes', ''),
            'status': 'completed',
            # TDS fields
            'tds_amount': request.data.get('tds_amount', 0),
            'tds_percentage': request.data.get('tds_percentage', 0),
            'net_amount_received': request.data.get('net_amount', 0),
        }
        
        # Create payment using serializer
        serializer = WorldClassPaymentCreateSerializer(data=payment_data)
        if serializer.is_valid():
            payment = serializer.save(
                company=service_user.company,
                created_by=service_user
            )
            
            return Response({
                'message': 'Payment updated successfully',
                'payment_id': payment.id,
                'payment_number': payment.payment_number,
                'proforma_outstanding': float(proforma.outstanding_amount)
            })
        else:
            return Response({'errors': serializer.errors}, status=400)
            
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def unified_payment_update(request, invoice_id):
    """Unified payment update that handles both invoices and proforma invoices"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        # Try to find as invoice first
        try:
            invoice = Invoice.objects.get(id=invoice_id, company=service_user.company)
            payment_data = {
                'invoice': invoice.id,
                'customer': invoice.customer.id,
                'purchase_order': invoice.purchase_order.id if invoice.purchase_order else None,
                'payment_date': request.data.get('payment_date'),
                'amount': request.data.get('amount_received'),
                'payment_method': request.data.get('payment_method', 'bank_transfer'),
                'reference_number': request.data.get('reference_number', ''),
                'notes': request.data.get('notes', ''),
                'status': 'completed',
                'tds_amount': request.data.get('tds_amount', 0),
                'tds_percentage': request.data.get('tds_percentage', 0),
                'net_amount_received': request.data.get('net_amount', 0),
            }
            
            serializer = WorldClassPaymentCreateSerializer(data=payment_data)
            if serializer.is_valid():
                payment = serializer.save(company=service_user.company, created_by=service_user)
                return Response({
                    'message': 'Payment updated successfully',
                    'payment_id': payment.id,
                    'payment_number': payment.payment_number,
                    'invoice_outstanding': float(invoice.outstanding_amount)
                })
            else:
                return Response({'errors': serializer.errors}, status=400)
                
        except Invoice.DoesNotExist:
            pass
        
        # Try to find as proforma invoice
        try:
            proforma = ProformaInvoice.objects.get(id=invoice_id, company=service_user.company)
            payment_data = {
                'proforma_invoice': proforma.id,
                'customer': proforma.customer.id,
                'purchase_order': proforma.purchase_order.id if proforma.purchase_order else None,
                'payment_date': request.data.get('payment_date'),
                'amount': request.data.get('amount_received'),
                'payment_method': request.data.get('payment_method', 'bank_transfer'),
                'reference_number': request.data.get('reference_number', ''),
                'notes': request.data.get('notes', ''),
                'status': 'completed',
                'tds_amount': request.data.get('tds_amount', 0),
                'tds_percentage': request.data.get('tds_percentage', 0),
                'net_amount_received': request.data.get('net_amount', 0),
            }
            
            serializer = WorldClassPaymentCreateSerializer(data=payment_data)
            if serializer.is_valid():
                payment = serializer.save(company=service_user.company, created_by=service_user)
                return Response({
                    'message': 'Payment updated successfully',
                    'payment_id': payment.id,
                    'payment_number': payment.payment_number,
                    'proforma_outstanding': float(proforma.outstanding_amount)
                })
            else:
                return Response({'errors': serializer.errors}, status=400)
                
        except ProformaInvoice.DoesNotExist:
            pass
        
        return Response({'error': 'Document not found'}, status=404)
            
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)