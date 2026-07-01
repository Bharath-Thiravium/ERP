from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from django.db import transaction
from authentication.authentication import ServiceUserSessionAuthentication
from authentication.permissions import IsServiceUserAuthenticated
from .models import Invoice, ProformaInvoice, Payment
from .serializers import WorldClassPaymentCreateSerializer


@api_view(['POST'])
@authentication_classes([ServiceUserSessionAuthentication])
@permission_classes([IsServiceUserAuthenticated])
def update_invoice_payment(request, invoice_id):
    """Update payment for a specific invoice with TDS calculation - supports TDS-only payments"""
    service_user = request.service_user

    try:
        invoice = Invoice.objects.get(id=invoice_id, company=service_user.company)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=404)

    from decimal import Decimal

    amount_received = Decimal(str(request.data.get('amount_received', 0) or 0))
    tds_amount = Decimal(str(request.data.get('tds_amount', 0) or 0))
    tds_percentage = Decimal(str(request.data.get('tds_percentage', 0) or 0))
    net_amount = Decimal(str(request.data.get('net_amount', 0) or 0))

    is_tds_only = tds_amount > 0 and amount_received == 0 and net_amount == 0

    if is_tds_only:
        payment_data = {
            'invoice': invoice.id,
            'customer': invoice.customer.id,
            'purchase_order': invoice.purchase_order.id if invoice.purchase_order else None,
            'payment_date': request.data.get('payment_date'),
            'amount': Decimal('0'),
            'gross_payment_amount': Decimal('0'),
            'payment_method': request.data.get('payment_method', 'bank_transfer'),
            'reference_number': request.data.get('reference_number', ''),
            'notes': request.data.get('notes', 'TDS payment (advance)'),
            'status': 'completed',
            'tds_applicable': True,
            'tds_amount': tds_amount,
            'tds_rate': tds_percentage,
            'net_amount_received': Decimal('0'),
            'payment_type': 'tds_only',
        }
    else:
        payment_data = {
            'invoice': invoice.id,
            'customer': invoice.customer.id,
            'purchase_order': invoice.purchase_order.id if invoice.purchase_order else None,
            'payment_date': request.data.get('payment_date'),
            'amount': amount_received,
            'gross_payment_amount': amount_received,
            'payment_method': request.data.get('payment_method', 'bank_transfer'),
            'reference_number': request.data.get('reference_number', ''),
            'notes': request.data.get('notes', ''),
            'status': 'completed',
            'tds_applicable': tds_amount > 0,
            'tds_amount': tds_amount,
            'tds_rate': tds_percentage,
            'net_amount_received': net_amount,
        }

    serializer = WorldClassPaymentCreateSerializer(data=payment_data, context={'request': request})
    if serializer.is_valid():
        try:
            with transaction.atomic():
                payment = serializer.save(
                    company=service_user.company,
                    created_by=service_user
                )
                if is_tds_only:
                    from finance.models import TDSDeposit
                    TDSDeposit.objects.create(
                        payment=payment,
                        company=service_user.company,
                        deposit_date=payment.payment_date,
                        amount=tds_amount,
                        challan_number=request.data.get('reference_number', ''),
                        form16a_number='',
                        certificate_received=False,
                        notes=request.data.get('notes', 'TDS payment (advance)')
                    )
        except Exception as e:
            return Response({'error': str(e)}, status=500)

        invoice.refresh_from_db()
        return Response({
            'message': 'TDS payment recorded successfully' if is_tds_only else 'Payment updated successfully',
            'payment_id': payment.id,
            'payment_number': payment.payment_number,
            'is_tds_only': is_tds_only,
            'invoice_outstanding': float(invoice.outstanding_amount) if str(invoice.outstanding_amount).lower() != "nan" else 0.0
        })
    else:
        import logging
        logging.getLogger(__name__).error(
            f"TDS Payment validation failed for invoice {invoice_id}: {serializer.errors}"
        )
        return Response({'errors': serializer.errors, 'detail': 'Validation failed'}, status=400)


@api_view(['POST'])
@authentication_classes([ServiceUserSessionAuthentication])
@permission_classes([IsServiceUserAuthenticated])
def update_proforma_payment(request, proforma_id):
    """Update payment for a specific proforma invoice with TDS calculation - supports TDS-only payments"""
    service_user = request.service_user

    try:
        proforma = ProformaInvoice.objects.get(id=proforma_id, company=service_user.company)
    except ProformaInvoice.DoesNotExist:
        return Response({'error': 'Proforma invoice not found'}, status=404)

    from decimal import Decimal

    amount_received = Decimal(str(request.data.get('amount_received', 0) or 0))
    tds_amount = Decimal(str(request.data.get('tds_amount', 0) or 0))
    tds_percentage = Decimal(str(request.data.get('tds_percentage', 0) or 0))
    net_amount = Decimal(str(request.data.get('net_amount', 0) or 0))

    is_tds_only = tds_amount > 0 and amount_received == 0 and net_amount == 0

    if is_tds_only:
        payment_data = {
            'proforma_invoice': proforma.id,
            'customer': proforma.customer.id,
            'purchase_order': proforma.purchase_order.id if proforma.purchase_order else None,
            'payment_date': request.data.get('payment_date'),
            'amount': Decimal('0'),
            'gross_payment_amount': Decimal('0'),
            'payment_method': request.data.get('payment_method', 'bank_transfer'),
            'reference_number': request.data.get('reference_number', ''),
            'notes': request.data.get('notes', 'TDS payment (advance)'),
            'status': 'completed',
            'tds_applicable': True,
            'tds_amount': tds_amount,
            'tds_rate': tds_percentage,
            'net_amount_received': Decimal('0'),
            'payment_type': 'tds_only',
        }
    else:
        payment_data = {
            'proforma_invoice': proforma.id,
            'customer': proforma.customer.id,
            'purchase_order': proforma.purchase_order.id if proforma.purchase_order else None,
            'payment_date': request.data.get('payment_date'),
            'amount': amount_received,
            'gross_payment_amount': amount_received,
            'payment_method': request.data.get('payment_method', 'bank_transfer'),
            'reference_number': request.data.get('reference_number', ''),
            'notes': request.data.get('notes', ''),
            'status': 'completed',
            'tds_applicable': tds_amount > 0,
            'tds_amount': tds_amount,
            'tds_rate': tds_percentage,
            'net_amount_received': net_amount,
        }

    serializer = WorldClassPaymentCreateSerializer(data=payment_data, context={'request': request})
    if serializer.is_valid():
        try:
            with transaction.atomic():
                payment = serializer.save(
                    company=service_user.company,
                    created_by=service_user
                )
                if is_tds_only:
                    from finance.models import TDSDeposit
                    TDSDeposit.objects.create(
                        payment=payment,
                        company=service_user.company,
                        deposit_date=payment.payment_date,
                        amount=tds_amount,
                        challan_number=request.data.get('reference_number', ''),
                        form16a_number='',
                        certificate_received=False,
                        notes=request.data.get('notes', 'TDS payment (advance)')
                    )
        except Exception as e:
            return Response({'error': str(e)}, status=500)

        return Response({
            'message': 'TDS payment recorded successfully' if is_tds_only else 'Payment updated successfully',
            'payment_id': payment.id,
            'payment_number': payment.payment_number,
            'is_tds_only': is_tds_only,
            'proforma_outstanding': float(proforma.outstanding_amount) if str(proforma.outstanding_amount).lower() != "nan" else 0.0
        })
    else:
        return Response({'errors': serializer.errors}, status=400)


@api_view(['POST'])
@authentication_classes([ServiceUserSessionAuthentication])
@permission_classes([IsServiceUserAuthenticated])
def unified_payment_update(request, invoice_id):
    """Unified payment update that handles both invoices and proforma invoices"""
    service_user = request.service_user

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
        serializer = WorldClassPaymentCreateSerializer(data=payment_data, context={'request': request})
        if serializer.is_valid():
            with transaction.atomic():
                payment = serializer.save(company=service_user.company, created_by=service_user)
            return Response({
                'message': 'Payment updated successfully',
                'payment_id': payment.id,
                'payment_number': payment.payment_number,
                'invoice_outstanding': float(invoice.outstanding_amount) if str(invoice.outstanding_amount).lower() != "nan" else 0.0
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
        serializer = WorldClassPaymentCreateSerializer(data=payment_data, context={'request': request})
        if serializer.is_valid():
            with transaction.atomic():
                payment = serializer.save(company=service_user.company, created_by=service_user)
            return Response({
                'message': 'Payment updated successfully',
                'payment_id': payment.id,
                'payment_number': payment.payment_number,
                'proforma_outstanding': float(proforma.outstanding_amount) if str(proforma.outstanding_amount).lower() != "nan" else 0.0
            })
        else:
            return Response({'errors': serializer.errors}, status=400)
    except ProformaInvoice.DoesNotExist:
        pass

    return Response({'error': 'Invoice or Proforma Invoice not found'}, status=404)
