"""
Analytics and Reporting API Views
"""
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse, JsonResponse
from django.utils.dateparse import parse_date
from datetime import datetime, timedelta
from django.utils import timezone
from django.db import models
import json
import csv
from io import StringIO
from authentication.models import ServiceUserSession
from .report_generators import (
    GSTReportGenerator, 
    TDSReportGenerator, 
    ComplianceAnalytics, 
    AuditTrailGenerator
)
from .financial_reports import FinancialReportsGenerator
from .ai_features import PaymentPredictionEngine, FraudDetectionEngine
from .advanced_compliance import AdvancedComplianceEngine

def get_session_key(request):
    """Get session key from Authorization header or query params"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    return session_key

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def tax_analytics_summary(request):
    """Get tax analytics summary for dashboard widgets"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        # Current month data
        today = timezone.now().date()
        current_month_start = today.replace(day=1)
        current_month_end = today
        
        # Previous month data
        prev_month_end = current_month_start - timedelta(days=1)
        prev_month_start = prev_month_end.replace(day=1)
        
        analytics = ComplianceAnalytics(service_user.company)
        
        current_data = analytics.generate_compliance_dashboard(current_month_start, current_month_end)
        prev_data = analytics.generate_compliance_dashboard(prev_month_start, prev_month_end)
        
        # Calculate growth percentages
        current_gst = current_data['gst_analytics']['total_gst_collected']
        prev_gst = prev_data['gst_analytics']['total_gst_collected']
        gst_growth = ((current_gst - prev_gst) / prev_gst * 100) if prev_gst > 0 else 0
        
        current_tds = current_data['tds_analytics']['total_tds_deducted']
        prev_tds = prev_data['tds_analytics']['total_tds_deducted']
        tds_growth = ((current_tds - prev_tds) / prev_tds * 100) if prev_tds > 0 else 0
        
        return Response({
            'current_month': {
                'gst_collected': current_gst,
                'tds_deducted': current_tds,
                'compliance_score': current_data['overall_compliance_score'],
                'gst_growth': round(gst_growth, 2),
                'tds_growth': round(tds_growth, 2)
            },
            'gst_rate_breakdown': current_data['gst_analytics']['gst_rate_wise_breakdown'],
            'monthly_trends': {
                'gst_trend': current_data['gst_analytics']['monthly_gst_trend'],
                'tds_trend': current_data['tds_analytics']['monthly_tds_trend']
            },
            'top_customers': current_data['customer_analytics']['top_customers_by_tax'][:5]
        })
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def compliance_alerts(request):
    """Get compliance alerts and notifications"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        from .models import Invoice, Payment
        
        alerts = []
        
        # Check for pending GST filings
        current_month = timezone.now().date().replace(day=1)
        prev_month_start = (current_month - timedelta(days=1)).replace(day=1)
        prev_month_end = current_month - timedelta(days=1)
        
        pending_gst_invoices = Invoice.objects.filter(
            company=service_user.company,
            created_at__date__range=[prev_month_start, prev_month_end],
            gst_transaction_id__isnull=True
        ).count()
        
        if pending_gst_invoices > 0:
            alerts.append({
                'type': 'warning',
                'title': 'Pending GST Filing',
                'message': f'{pending_gst_invoices} invoices from previous month need GST filing',
                'action': 'file_gst',
                'priority': 'high'
            })
        
        # Check for pending TDS certificates
        pending_tds_certificates = Payment.objects.filter(
            company=service_user.company,
            tds_amount__gt=0,
            tds_certificate_issued=False
        ).count()
        
        if pending_tds_certificates > 0:
            alerts.append({
                'type': 'warning',
                'title': 'Pending TDS Certificates',
                'message': f'{pending_tds_certificates} TDS certificates need to be issued',
                'action': 'issue_certificates',
                'priority': 'medium'
            })
        
        # Check for upcoming filing deadlines
        today = timezone.now().date()
        gst_deadline = today.replace(day=11)  # GST filing due on 11th
        
        if today >= gst_deadline.replace(day=8):  # 3 days before deadline
            alerts.append({
                'type': 'info',
                'title': 'GST Filing Reminder',
                'message': f'GST filing due on {gst_deadline.strftime("%d %b %Y")}',
                'action': 'prepare_gst',
                'priority': 'medium'
            })
        
        return Response({
            'alerts': alerts,
            'total_alerts': len(alerts),
            'high_priority': len([a for a in alerts if a['priority'] == 'high']),
            'generated_at': timezone.now().isoformat()
        })
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def generate_gstr1_report(request):
    """Generate GSTR-1 report"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        start_date = parse_date(request.GET.get('start_date'))
        end_date = parse_date(request.GET.get('end_date'))
        
        if not start_date or not end_date:
            return Response({'error': 'start_date and end_date are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        generator = GSTReportGenerator(service_user.company)
        report_data = generator.generate_gstr1_report(start_date, end_date)
        
        return Response(report_data)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def generate_gstr3b_report(request):
    """Generate GSTR-3B report"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        start_date = parse_date(request.GET.get('start_date'))
        end_date = parse_date(request.GET.get('end_date'))
        
        if not start_date or not end_date:
            return Response({'error': 'start_date and end_date are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        generator = GSTReportGenerator(service_user.company)
        report_data = generator.generate_gstr3b_report(start_date, end_date)
        
        return Response(report_data)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def generate_tds_certificate(request, payment_id):
    """Generate TDS certificate for a payment"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        from .models import Payment
        payment = Payment.objects.get(id=payment_id, company=service_user.company)
        
        if payment.tds_amount <= 0:
            return Response({'error': 'No TDS deducted for this payment'}, status=status.HTTP_400_BAD_REQUEST)
        
        generator = TDSReportGenerator(service_user.company)
        certificate_data = generator.generate_tds_certificate(payment)
        
        return Response(certificate_data)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Payment.DoesNotExist:
        return Response({'error': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def generate_quarterly_tds_report(request):
    """Generate quarterly TDS report"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        quarter = request.GET.get('quarter')
        financial_year = request.GET.get('financial_year')
        
        if not quarter or not financial_year:
            return Response({'error': 'quarter and financial_year are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        generator = TDSReportGenerator(service_user.company)
        report_data = generator.generate_quarterly_tds_report(quarter, financial_year)
        
        return Response(report_data)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def compliance_analytics_dashboard(request):
    """Get comprehensive compliance analytics dashboard"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        start_date = parse_date(request.GET.get('start_date')) or timezone.now().date().replace(day=1)
        end_date = parse_date(request.GET.get('end_date')) or timezone.now().date()
        
        analytics = ComplianceAnalytics(service_user.company)
        dashboard_data = analytics.generate_compliance_dashboard(start_date, end_date)
        
        return Response(dashboard_data)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def audit_trail_report(request):
    """Generate audit trail report"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        start_date = parse_date(request.GET.get('start_date'))
        end_date = parse_date(request.GET.get('end_date'))
        
        if not start_date or not end_date:
            return Response({'error': 'start_date and end_date are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        generator = AuditTrailGenerator(service_user.company)
        audit_data = generator.generate_audit_report(start_date, end_date)
        
        return Response(audit_data)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def reconciliation_report(request):
    """Generate reconciliation report"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        start_date = parse_date(request.GET.get('start_date'))
        end_date = parse_date(request.GET.get('end_date'))
        
        if not start_date or not end_date:
            return Response({'error': 'start_date and end_date are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from .models import Invoice, Payment
        
        # Basic reconciliation data
        invoices = Invoice.objects.filter(
            company=service_user.company,
            created_at__date__range=[start_date, end_date]
        )
        
        payments = Payment.objects.filter(
            company=service_user.company,
            payment_date__range=[start_date, end_date]
        )
        
        total_invoiced = sum(inv.total_amount for inv in invoices)
        total_received = sum(pay.amount for pay in payments)
        outstanding = total_invoiced - total_received
        
        return Response({
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'summary': {
                'total_invoiced': float(total_invoiced),
                'total_received': float(total_received),
                'outstanding_amount': float(outstanding),
                'invoice_count': invoices.count(),
                'payment_count': payments.count()
            },
            'generated_at': timezone.now().isoformat()
        })
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def export_gstr1_csv(request):
    """Export GSTR-1 data as CSV"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        start_date = parse_date(request.GET.get('start_date'))
        end_date = parse_date(request.GET.get('end_date'))
        
        if not start_date or not end_date:
            return Response({'error': 'start_date and end_date are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        generator = GSTReportGenerator(service_user.company)
        report_data = generator.generate_gstr1_report(start_date, end_date)
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="GSTR1_{start_date}_{end_date}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Invoice Number', 'Date', 'Customer', 'GSTIN', 'Taxable Value', 'IGST', 'CGST', 'SGST', 'Total Tax', 'Invoice Value'])
        
        for supply in report_data['b2b_supplies']:
            writer.writerow([
                supply['invoice_number'],
                supply['invoice_date'],
                supply['customer_name'],
                supply['customer_gstin'],
                supply['taxable_value'],
                supply['igst_amount'],
                supply['cgst_amount'],
                supply['sgst_amount'],
                supply['total_tax'],
                supply['invoice_value']
            ])
        
        return response
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def export_tds_csv(request):
    """Export TDS data as CSV"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        quarter = request.GET.get('quarter')
        financial_year = request.GET.get('financial_year')
        
        if not quarter or not financial_year:
            return Response({'error': 'quarter and financial_year are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        generator = TDSReportGenerator(service_user.company)
        report_data = generator.generate_quarterly_tds_report(quarter, financial_year)
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="TDS_{quarter}_{financial_year}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Deductee Name', 'PAN', 'Total Amount Paid', 'TDS Deducted', 'Payment Count'])
        
        for deductee in report_data['deductee_wise_details']:
            writer.writerow([
                deductee['deductee_name'],
                deductee['deductee_pan'],
                deductee['total_amount_paid'],
                deductee['total_tds_deducted'],
                len(deductee['payments'])
            ])
        
        return response
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def bulk_generate_tds_certificates(request):
    """Bulk generate TDS certificates"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        payment_ids = request.data.get('payment_ids', [])
        if not payment_ids:
            return Response({'error': 'payment_ids are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from .models import Payment
        payments = Payment.objects.filter(
            id__in=payment_ids,
            company=service_user.company,
            tds_amount__gt=0
        )
        
        generator = TDSReportGenerator(service_user.company)
        certificates = []
        
        for payment in payments:
            try:
                certificate = generator.generate_tds_certificate(payment)
                certificates.append(certificate)
                payment.tds_certificate_issued = True
                payment.save()
            except Exception as e:
                continue
        
        return Response({
            'certificates_generated': len(certificates),
            'certificates': certificates,
            'generated_at': timezone.now().isoformat()
        })
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Financial Reports API Views
@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def generate_profit_loss_report(request):
    """Generate Profit & Loss Statement"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        start_date = parse_date(request.GET.get('start_date'))
        end_date = parse_date(request.GET.get('end_date'))
        
        if not start_date or not end_date:
            return Response({'error': 'start_date and end_date are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        generator = FinancialReportsGenerator(service_user.company)
        report_data = generator.generate_profit_loss_report(start_date, end_date)
        
        return Response(report_data)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def generate_balance_sheet(request):
    """Generate Balance Sheet"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        as_of_date = parse_date(request.GET.get('as_of_date')) or timezone.now().date()
        
        generator = FinancialReportsGenerator(service_user.company)
        report_data = generator.generate_balance_sheet(as_of_date)
        
        return Response(report_data)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def generate_cash_flow_statement(request):
    """Generate Cash Flow Statement"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        start_date = parse_date(request.GET.get('start_date'))
        end_date = parse_date(request.GET.get('end_date'))
        
        if not start_date or not end_date:
            return Response({'error': 'start_date and end_date are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        generator = FinancialReportsGenerator(service_user.company)
        report_data = generator.generate_cash_flow_statement(start_date, end_date)
        
        return Response(report_data)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# AI Features API Views
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def predict_payment_likelihood(request):
    """Predict payment likelihood for a customer and invoice amount"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        customer_id = request.data.get('customer_id')
        invoice_amount = request.data.get('invoice_amount')
        
        if not customer_id or not invoice_amount:
            return Response({'error': 'customer_id and invoice_amount are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        engine = PaymentPredictionEngine(service_user.company)
        prediction = engine.predict_payment_likelihood(customer_id, invoice_amount)
        
        return Response(prediction)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def generate_payment_insights(request):
    """Generate AI-powered payment insights"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        
        if start_date_str:
            start_date = parse_date(start_date_str)
        else:
            start_date = timezone.now().date() - timedelta(days=90)
            
        if end_date_str:
            end_date = parse_date(end_date_str)
        else:
            end_date = timezone.now().date()
        
        engine = PaymentPredictionEngine(service_user.company)
        insights = engine.generate_payment_insights(start_date, end_date)
        
        return Response(insights)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def detect_fraud_anomalies(request):
    """Detect fraud and anomalies using AI"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        
        if start_date_str:
            start_date = parse_date(start_date_str)
        else:
            start_date = timezone.now().date() - timedelta(days=30)
            
        if end_date_str:
            end_date = parse_date(end_date_str)
        else:
            end_date = timezone.now().date()
        
        engine = FraudDetectionEngine(service_user.company)
        anomalies = engine.detect_anomalies(start_date, end_date)
        
        return Response(anomalies)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Advanced Compliance API Views
@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def generate_complete_gstr3b_report(request):
    """Generate comprehensive GSTR-3B report"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        start_date = parse_date(request.GET.get('start_date'))
        end_date = parse_date(request.GET.get('end_date'))
        
        if not start_date or not end_date:
            return Response({'error': 'start_date and end_date are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        engine = AdvancedComplianceEngine(service_user.company)
        report_data = engine.generate_complete_gstr3b_report(start_date, end_date)
        
        return Response(report_data)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def generate_eway_bill_data(request, invoice_id):
    """Generate E-way bill data for an invoice"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        engine = AdvancedComplianceEngine(service_user.company)
        eway_data = engine.generate_eway_bill_data(invoice_id)
        
        return Response(eway_data)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def generate_compliance_checklist(request):
    """Generate monthly compliance checklist"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        month = int(request.GET.get('month', timezone.now().month))
        year = int(request.GET.get('year', timezone.now().year))
        
        engine = AdvancedComplianceEngine(service_user.company)
        checklist = engine.generate_compliance_checklist(month, year)
        
        return Response(checklist)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)