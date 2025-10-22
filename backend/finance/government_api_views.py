"""
Government API Views
API endpoints for government integration features
"""
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework import permissions, status
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from authentication.models import ServiceUserSession
from .government_api import gst_service, tds_service, einvoice_service, get_company_services
from .models import Invoice, Payment, Customer
import json

@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def validate_gstin(request):
    """Validate GSTIN with government database"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        gstin = request.data.get('gstin')
        if not gstin:
            return Response({'error': 'GSTIN is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Use company-specific GST service
        company_services = get_company_services(company)
        result = company_services['gst'].validate_gstin(gstin)
        return Response(result)
    
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def validate_pan(request):
    """Validate PAN with income tax database"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        pan = request.data.get('pan')
        if not pan:
            return Response({'error': 'PAN is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Use company-specific TDS service
        company_services = get_company_services(company)
        result = company_services['tds'].validate_pan(pan)
        return Response(result)
    
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def get_gst_rates(request):
    """Get current GST rates for HSN code"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        hsn_code = request.GET.get('hsn_code')
        if not hsn_code:
            return Response({'error': 'HSN code is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Use company-specific GST service
        company_services = get_company_services(company)
        rates = company_services['gst'].get_gst_rates(hsn_code)
        if rates:
            return Response(rates)
        else:
            return Response({'error': 'HSN code not found'}, status=status.HTTP_404_NOT_FOUND)
    
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def get_tds_rates(request):
    """Get current TDS rates for section"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        section_code = request.GET.get('section_code')
        assessment_year = request.GET.get('assessment_year', '2024-25')
        
        if not section_code:
            return Response({'error': 'Section code is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Use company-specific TDS service
        company_services = get_company_services(company)
        rates = company_services['tds'].get_tds_rates(section_code, assessment_year)
        if rates:
            return Response(rates)
        else:
            return Response({'error': 'Section code not found'}, status=status.HTTP_404_NOT_FOUND)
    
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def file_gstr1(request):
    """File GSTR-1 return"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        gstin = request.data.get('gstin')
        return_period = request.data.get('return_period')
        
        if not gstin or not return_period:
            return Response({'error': 'GSTIN and return period are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get invoices for the period
        invoices = Invoice.objects.filter(
            company=service_user.company,
            gst_transaction_id__isnull=False,
            created_at__month=int(return_period.split('-')[1]),
            created_at__year=int(return_period.split('-')[0])
        )
        
        # Format invoice data for GSTR-1
        b2b_data = []
        for invoice in invoices:
            if invoice.customer.is_gst_registered:
                b2b_data.append({
                    'ctin': invoice.customer.gstin,
                    'inv': [{
                        'inum': invoice.invoice_number,
                        'idt': invoice.created_at.strftime('%d-%m-%Y'),
                        'val': float(invoice.total_amount),
                        'pos': invoice.place_of_supply,
                        'rchrg': 'Y' if invoice.reverse_charge_applicable else 'N',
                        'itms': [{
                            'num': 1,
                            'itm_det': {
                                'txval': float(invoice.subtotal),
                                'rt': 18.0,  # Default GST rate
                                'iamt': float(invoice.igst_amount) if invoice.igst_amount else 0,
                                'camt': float(invoice.cgst_amount) if invoice.cgst_amount else 0,
                                'samt': float(invoice.sgst_amount) if invoice.sgst_amount else 0
                            }
                        }]
                    }]
                })
        
        invoice_data = {'b2b': b2b_data}
        
        # Use company-specific GST service
        company_services = get_company_services(service_user.company)
        result = company_services['gst'].file_gstr1(gstin, return_period, invoice_data)
        return Response(result)
    
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def file_tds_return(request):
    """File TDS return"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        quarter = request.data.get('quarter')
        financial_year = request.data.get('financial_year')
        
        if not quarter or not financial_year:
            return Response({'error': 'Quarter and financial year are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get TDS payments for the quarter
        payments = Payment.objects.filter(
            company=service_user.company,
            tds_amount__gt=0,
            created_at__year=int(financial_year.split('-')[0])
        )
        
        # Format TDS data
        deductees = []
        total_tax = 0
        
        for payment in payments:
            if payment.tds_amount:
                deductees.append({
                    'pan': payment.invoice.customer.pan_number,
                    'name': payment.invoice.customer.name,
                    'amount_paid': float(payment.amount),
                    'tds_amount': float(payment.tds_amount),
                    'section_code': payment.tds_section_code,
                    'rate': payment.tds_rate_applied
                })
                total_tax += float(payment.tds_amount)
        
        tds_data = {
            'deductees': deductees,
            'total_tax': total_tax,
            'total_deposited': total_tax
        }
        
        # Use company-specific TDS service
        company_services = get_company_services(service_user.company)
        result = company_services['tds'].file_tds_return(quarter, financial_year, tds_data)
        return Response(result)
    
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def generate_einvoice(request):
    """Generate e-invoice IRN"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        invoice_id = request.data.get('invoice_id')
        if not invoice_id:
            return Response({'error': 'Invoice ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            invoice = Invoice.objects.get(id=invoice_id, company=service_user.company)
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Format invoice data for e-invoice
        invoice_data = {
        'Version': '1.1',
        'TranDtls': {
            'TaxSch': 'GST',
            'SupTyp': 'B2B',
            'RegRev': 'Y' if invoice.reverse_charge_applicable else 'N'
        },
        'DocDtls': {
            'Typ': 'INV',
            'No': invoice.invoice_number,
            'Dt': invoice.created_at.strftime('%d/%m/%Y')
        },
        'SellerDtls': {
            'Gstin': service_user.company.gstin,
            'LglNm': service_user.company.name,
            'Addr1': service_user.company.address,
            'Loc': service_user.company.city,
            'Pin': service_user.company.pincode,
            'Stcd': service_user.company.state_code
        },
        'BuyerDtls': {
            'Gstin': invoice.customer.gstin,
            'LglNm': invoice.customer.name,
            'Pos': invoice.place_of_supply,
            'Addr1': invoice.customer.address,
            'Loc': invoice.customer.city,
            'Pin': invoice.customer.pincode,
            'Stcd': invoice.customer.state_code
        },
        'ItemList': [{
            'SlNo': '1',
            'PrdDesc': 'Services',
            'IsServc': 'Y',
            'HsnCd': '998314',
            'Qty': 1,
            'Unit': 'NOS',
            'UnitPrice': float(invoice.subtotal),
            'TotAmt': float(invoice.subtotal),
            'AssAmt': float(invoice.subtotal),
            'GstRt': 18.0,  # Default GST rate
            'IgstAmt': float(invoice.igst_amount) if invoice.igst_amount else 0,
            'CgstAmt': float(invoice.cgst_amount) if invoice.cgst_amount else 0,
            'SgstAmt': float(invoice.sgst_amount) if invoice.sgst_amount else 0,
            'TotItemVal': float(invoice.total_amount)
        }],
        'ValDtls': {
            'AssVal': float(invoice.subtotal),
            'CgstVal': float(invoice.cgst_amount) if invoice.cgst_amount else 0,
            'SgstVal': float(invoice.sgst_amount) if invoice.sgst_amount else 0,
            'IgstVal': float(invoice.igst_amount) if invoice.igst_amount else 0,
            'TotInvVal': float(invoice.total_amount)
        }
        }
        
        # Use company-specific E-Invoice service
        company_services = get_company_services(service_user.company)
        result = company_services['einvoice'].generate_irn(invoice_data)
        
        if result.get('success'):
            # Update invoice with IRN details
            invoice.irn = result.get('irn')
            invoice.ack_no = result.get('ack_no')
            invoice.qr_code = result.get('qr_code')
            invoice.save()
        
        return Response(result)
    
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def get_compliance_status(request):
    """Get overall compliance status"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        # Check GST compliance
        gst_pending = Invoice.objects.filter(
            company=company,
            gst_transaction_id__isnull=True,
            total_amount__gt=0
        ).count()
        
        # Check TDS compliance
        tds_pending = Payment.objects.filter(
            company=company,
            tds_amount__gt=0,
            tds_certificate_issued=False
        ).count()
        
        # Check e-invoice compliance
        einvoice_pending = Invoice.objects.filter(
            company=company,
            total_amount__gte=50000,  # E-invoice mandatory for invoices >= 5 lakhs
            irn__isnull=True
        ).count()
        
        return Response({
            'gst_compliance': {
                'pending_filings': gst_pending,
                'status': 'compliant' if gst_pending == 0 else 'pending'
            },
            'tds_compliance': {
                'pending_certificates': tds_pending,
                'status': 'compliant' if tds_pending == 0 else 'pending'
            },
            'einvoice_compliance': {
                'pending_irn': einvoice_pending,
                'status': 'compliant' if einvoice_pending == 0 else 'pending'
            },
            'overall_status': 'compliant' if (gst_pending + tds_pending + einvoice_pending) == 0 else 'pending'
        })
    
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def bulk_validate_customers(request):
    """Bulk validate customer GST and PAN details"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        customer_ids = request.data.get('customer_ids', [])
        if not customer_ids:
            return Response({'error': 'Customer IDs are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        results = []
        customers = Customer.objects.filter(id__in=customer_ids, company=service_user.company)
        
        # Use company-specific services
        company_services = get_company_services(service_user.company)
        
        for customer in customers:
            result = {'customer_id': customer.id, 'name': customer.name}
            
            # Validate GSTIN if present
            if customer.gstin:
                gst_result = company_services['gst'].validate_gstin(customer.gstin)
                result['gstin_validation'] = gst_result
            
            # Validate PAN if present
            if customer.pan_number:
                pan_result = company_services['tds'].validate_pan(customer.pan_number)
                result['pan_validation'] = pan_result
            
            results.append(result)
        
        return Response({'results': results})
    
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)