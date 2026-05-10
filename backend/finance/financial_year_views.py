"""
Financial Year Views - API endpoints for FY filtering
"""
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import status, permissions
from authentication.models import ServiceUserSession
from .financial_year_utils import (
    get_available_financial_years,
    get_current_financial_year,
    get_financial_year_dates,
    get_quarter_dates
)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def get_financial_years(request):
    """
    Get list of available financial years for filtering.
    
    Query params:
        - session_key: Required for authentication
        - start_year: Optional, default 2020
        - future_years: Optional, default 2
    
    Returns:
        List of financial years with dates
    """
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response(
            {'error': 'Session key required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        session = ServiceUserSession.objects.get(
            session_key=session_key,
            is_active=True
        )
        
        start_year = int(request.query_params.get('start_year', 2020))
        future_years = int(request.query_params.get('future_years', 2))
        
        financial_years = get_available_financial_years(start_year, future_years)
        current_fy = get_current_financial_year()
        
        return Response({
            'financial_years': financial_years,
            'current_financial_year': current_fy,
            'message': 'Financial years retrieved successfully'
        })
    
    except ServiceUserSession.DoesNotExist:
        return Response(
            {'error': 'Invalid session'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def get_financial_year_info(request):
    """
    Get detailed information about a specific financial year.
    
    Query params:
        - session_key: Required
        - financial_year: Required (e.g., "2026-27" or "2627")
    
    Returns:
        FY details with quarters and dates
    """
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response(
            {'error': 'Session key required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    financial_year = request.query_params.get('financial_year')
    if not financial_year:
        return Response(
            {'error': 'financial_year parameter required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        session = ServiceUserSession.objects.get(
            session_key=session_key,
            is_active=True
        )
        
        start_date, end_date = get_financial_year_dates(financial_year)
        
        quarters = []
        for quarter in ['Q1', 'Q2', 'Q3', 'Q4']:
            q_start, q_end = get_quarter_dates(quarter, financial_year)
            quarters.append({
                'quarter': quarter,
                'label': f'{quarter} ({q_start.strftime("%b %Y")} - {q_end.strftime("%b %Y")})',
                'start_date': q_start.isoformat(),
                'end_date': q_end.isoformat()
            })
        
        return Response({
            'financial_year': financial_year,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'quarters': quarters,
            'is_current': financial_year == get_current_financial_year()
        })
    
    except ServiceUserSession.DoesNotExist:
        return Response(
            {'error': 'Invalid session'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    except ValueError as e:
        return Response(
            {'error': f'Invalid financial year format: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def get_finance_summary_by_fy(request):
    """
    Get finance module summary grouped by financial year.
    
    Query params:
        - session_key: Required
        - module: Optional (quotation, purchase_order, proforma_invoice, invoice, payment)
        - financial_year: Optional (filter by specific FY)
    
    Returns:
        Summary statistics by FY
    """
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response(
            {'error': 'Session key required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        session = ServiceUserSession.objects.get(
            session_key=session_key,
            is_active=True
        )
        service_user = session.service_user
        company = service_user.company
        
        from .models import Quotation, PurchaseOrder, ProformaInvoice, Invoice, Payment
        from .financial_year_utils import apply_financial_year_filter, get_financial_year_from_date
        from django.db.models import Sum, Count
        
        module = request.query_params.get('module', 'all')
        financial_year = request.query_params.get('financial_year')
        
        summary = {}
        
        # Quotations
        if module in ['all', 'quotation']:
            quotations = Quotation.objects.filter(company=company)
            if financial_year:
                quotations = apply_financial_year_filter(quotations, 'quotation_date', financial_year)
            
            summary['quotations'] = {
                'count': quotations.count(),
                'total_amount': float(quotations.aggregate(total=Sum('total_amount'))['total'] or 0),
                'by_status': {
                    'draft': quotations.filter(status='draft').count(),
                    'sent': quotations.filter(status='sent').count(),
                    'approved': quotations.filter(status='approved').count(),
                    'rejected': quotations.filter(is_rejected=True).count(),
                }
            }
        
        # Purchase Orders
        if module in ['all', 'purchase_order']:
            pos = PurchaseOrder.objects.filter(company=company)
            if financial_year:
                pos = apply_financial_year_filter(pos, 'po_date', financial_year)
            
            summary['purchase_orders'] = {
                'count': pos.count(),
                'total_amount': float(pos.aggregate(total=Sum('total_amount'))['total'] or 0),
                'by_status': {
                    'draft': pos.filter(status='draft').count(),
                    'active': pos.filter(status='active').count(),
                    'confirmed': pos.filter(status='confirmed').count(),
                    'completed': pos.filter(status='completed').count(),
                }
            }
        
        # Proforma Invoices
        if module in ['all', 'proforma_invoice']:
            proformas = ProformaInvoice.objects.filter(company=company, is_rejected=False)
            if financial_year:
                proformas = apply_financial_year_filter(proformas, 'proforma_date', financial_year)
            
            summary['proforma_invoices'] = {
                'count': proformas.count(),
                'total_amount': float(proformas.aggregate(total=Sum('total_amount'))['total'] or 0),
                'paid_amount': float(proformas.aggregate(total=Sum('paid_amount'))['total'] or 0),
                'outstanding_amount': float(proformas.aggregate(total=Sum('outstanding_amount'))['total'] or 0),
                'by_payment_status': {
                    'unpaid': proformas.filter(payment_status='unpaid').count(),
                    'partially_paid': proformas.filter(payment_status='partially_paid').count(),
                    'paid': proformas.filter(payment_status='paid').count(),
                }
            }
        
        # Tax Invoices
        if module in ['all', 'invoice']:
            invoices = Invoice.objects.filter(company=company, is_rejected=False)
            if financial_year:
                invoices = apply_financial_year_filter(invoices, 'invoice_date', financial_year)
            
            summary['invoices'] = {
                'count': invoices.count(),
                'total_amount': float(invoices.aggregate(total=Sum('total_amount'))['total'] or 0),
                'paid_amount': float(invoices.aggregate(total=Sum('paid_amount'))['total'] or 0),
                'outstanding_amount': float(invoices.aggregate(total=Sum('outstanding_amount'))['total'] or 0),
                'by_payment_status': {
                    'unpaid': invoices.filter(payment_status='unpaid').count(),
                    'partially_paid': invoices.filter(payment_status='partially_paid').count(),
                    'paid': invoices.filter(payment_status='paid').count(),
                    'overdue': invoices.filter(payment_status='overdue').count(),
                }
            }
        
        # Payments
        if module in ['all', 'payment']:
            payments = Payment.objects.filter(company=company, status='completed')
            if financial_year:
                payments = apply_financial_year_filter(payments, 'payment_date', financial_year)
            
            summary['payments'] = {
                'count': payments.count(),
                'total_amount': float(payments.aggregate(total=Sum('amount'))['total'] or 0),
                'by_method': {
                    'cash': payments.filter(payment_method='cash').count(),
                    'bank_transfer': payments.filter(payment_method='bank_transfer').count(),
                    'cheque': payments.filter(payment_method='cheque').count(),
                    'upi': payments.filter(payment_method='upi').count(),
                    'card': payments.filter(payment_method='card').count(),
                }
            }
        
        return Response({
            'financial_year': financial_year or 'all',
            'company': company.name,
            'summary': summary
        })
    
    except ServiceUserSession.DoesNotExist:
        return Response(
            {'error': 'Invalid session'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
