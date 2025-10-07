"""
Indian Finance Compliance Notifications System
Provides real-time compliance alerts and notifications
"""

from datetime import datetime, timedelta
from django.db.models import Q, Sum
from .models import Invoice, Payment, Customer
from .indian_compliance import get_indian_states, get_tds_sections

def get_compliance_alerts(company):
    """Get all compliance alerts for a company"""
    alerts = []
    
    # GST Filing Alerts
    gst_alerts = get_gst_filing_alerts(company)
    alerts.extend(gst_alerts)
    
    # TDS Alerts
    tds_alerts = get_tds_compliance_alerts(company)
    alerts.extend(tds_alerts)
    
    # Customer Compliance Alerts
    customer_alerts = get_customer_compliance_alerts(company)
    alerts.extend(customer_alerts)
    
    return alerts

def get_gst_filing_alerts(company):
    """Get GST filing related alerts"""
    alerts = []
    current_date = datetime.now().date()
    
    # Check for invoices without GST transaction ID
    invoices_without_gst = Invoice.objects.filter(
        company=company,
        customer__is_gst_registered=True,
        gst_transaction_id__isnull=True
    ).count()
    
    if invoices_without_gst > 0:
        alerts.append({
            'type': 'warning',
            'category': 'GST',
            'title': 'Missing GST Transaction IDs',
            'message': f'{invoices_without_gst} invoices are missing GST transaction IDs',
            'action': 'Update invoice GST details',
            'priority': 'medium'
        })
    
    # Check for unfiled GSTR-1 invoices
    unfiled_gstr1 = Invoice.objects.filter(
        company=company,
        customer__is_gst_registered=True,
        is_filed_in_gstr1=False,
        invoice_date__lt=current_date - timedelta(days=10)  # 10 days old
    ).count()
    
    if unfiled_gstr1 > 0:
        alerts.append({
            'type': 'error',
            'category': 'GST',
            'title': 'GSTR-1 Filing Pending',
            'message': f'{unfiled_gstr1} invoices need to be filed in GSTR-1',
            'action': 'File GSTR-1 return',
            'priority': 'high'
        })
    
    return alerts

def get_tds_compliance_alerts(company):
    """Get TDS compliance related alerts"""
    alerts = []
    current_date = datetime.now().date()
    
    # Check for payments without TDS certificates
    payments_without_certificates = Payment.objects.filter(
        customer__company=company,
        tds_amount__gt=0,
        tds_certificate_issued=False,
        payment_date__lt=current_date - timedelta(days=30)  # 30 days old
    ).count()
    
    if payments_without_certificates > 0:
        alerts.append({
            'type': 'warning',
            'category': 'TDS',
            'title': 'TDS Certificates Pending',
            'message': f'{payments_without_certificates} payments need TDS certificates',
            'action': 'Issue TDS certificates',
            'priority': 'medium'
        })
    
    # Check for TDS deposits pending
    pending_tds_amount = Payment.objects.filter(
        customer__company=company,
        tds_amount__gt=0,
        tds_deposited_date__isnull=True,
        payment_date__lt=current_date - timedelta(days=7)  # 7 days old
    ).aggregate(total=Sum('tds_amount'))['total'] or 0
    
    if pending_tds_amount > 0:
        alerts.append({
            'type': 'error',
            'category': 'TDS',
            'title': 'TDS Deposit Pending',
            'message': f'₹{pending_tds_amount:,.2f} TDS amount pending deposit',
            'action': 'Deposit TDS with government',
            'priority': 'high'
        })
    
    return alerts

def get_customer_compliance_alerts(company):
    """Get customer compliance related alerts"""
    alerts = []
    
    # Check for customers without state codes
    customers_without_state = Customer.objects.filter(
        company=company,
        is_gst_registered=True,
        state_code__isnull=True
    ).count()
    
    if customers_without_state > 0:
        alerts.append({
            'type': 'info',
            'category': 'Customer',
            'title': 'Missing Customer State Codes',
            'message': f'{customers_without_state} GST-registered customers missing state codes',
            'action': 'Update customer state information',
            'priority': 'low'
        })
    
    # Check for invalid GSTIN formats
    invalid_gstin_customers = Customer.objects.filter(
        company=company,
        is_gst_registered=True
    ).exclude(
        Q(gstin__regex=r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$') |
        Q(gstin__isnull=True) |
        Q(gstin='')
    ).count()
    
    if invalid_gstin_customers > 0:
        alerts.append({
            'type': 'warning',
            'category': 'Customer',
            'title': 'Invalid GSTIN Formats',
            'message': f'{invalid_gstin_customers} customers have invalid GSTIN formats',
            'action': 'Validate and correct GSTIN numbers',
            'priority': 'medium'
        })
    
    return alerts

def get_compliance_summary(company):
    """Get overall compliance summary"""
    current_date = datetime.now().date()
    current_month_start = current_date.replace(day=1)
    
    # GST Summary
    gst_invoices = Invoice.objects.filter(
        company=company,
        customer__is_gst_registered=True,
        invoice_date__gte=current_month_start
    )
    
    gst_summary = {
        'total_invoices': gst_invoices.count(),
        'total_taxable_amount': gst_invoices.aggregate(
            total=Sum('subtotal')
        )['total'] or 0,
        'total_tax_collected': gst_invoices.aggregate(
            total=Sum('total_tax')
        )['total'] or 0,
        'gstr1_filed': gst_invoices.filter(is_filed_in_gstr1=True).count(),
        'gstr1_pending': gst_invoices.filter(is_filed_in_gstr1=False).count()
    }
    
    # TDS Summary
    tds_payments = Payment.objects.filter(
        customer__company=company,
        tds_amount__gt=0,
        payment_date__gte=current_month_start
    )
    
    tds_summary = {
        'total_tds_payments': tds_payments.count(),
        'total_tds_deducted': tds_payments.aggregate(
            total=Sum('tds_amount')
        )['total'] or 0,
        'certificates_issued': tds_payments.filter(tds_certificate_issued=True).count(),
        'certificates_pending': tds_payments.filter(tds_certificate_issued=False).count(),
        'deposits_completed': tds_payments.filter(tds_deposited_date__isnull=False).count(),
        'deposits_pending': tds_payments.filter(tds_deposited_date__isnull=True).count()
    }
    
    # Overall Status
    alerts = get_compliance_alerts(company)
    high_priority_alerts = [a for a in alerts if a['priority'] == 'high']
    
    if high_priority_alerts:
        overall_status = 'action_required'
    elif any(a['priority'] == 'medium' for a in alerts):
        overall_status = 'attention_needed'
    else:
        overall_status = 'compliant'
    
    return {
        'period': f"{current_month_start.strftime('%B %Y')}",
        'gst_compliance': gst_summary,
        'tds_compliance': tds_summary,
        'overall_status': overall_status,
        'alerts_count': len(alerts),
        'high_priority_alerts': len(high_priority_alerts)
    }

def generate_compliance_report(company, start_date, end_date):
    """Generate detailed compliance report for a period"""
    
    # GST Report Data
    gst_invoices = Invoice.objects.filter(
        company=company,
        customer__is_gst_registered=True,
        invoice_date__range=[start_date, end_date]
    )
    
    gst_data = []
    for invoice in gst_invoices:
        gst_data.append({
            'invoice_number': invoice.invoice_number,
            'invoice_date': invoice.invoice_date,
            'customer_name': invoice.customer.name,
            'customer_gstin': invoice.customer_gstin,
            'place_of_supply': invoice.place_of_supply or 'Not specified',
            'taxable_amount': float(invoice.subtotal),
            'tax_amount': float(invoice.total_tax),
            'gst_transaction_id': invoice.gst_transaction_id or 'Not assigned',
            'gstr1_filed': invoice.is_filed_in_gstr1
        })
    
    # TDS Report Data
    tds_payments = Payment.objects.filter(
        customer__company=company,
        tds_amount__gt=0,
        payment_date__range=[start_date, end_date]
    )
    
    tds_data = []
    for payment in tds_payments:
        tds_data.append({
            'payment_number': payment.payment_number,
            'payment_date': payment.payment_date,
            'customer_name': payment.customer.name,
            'payment_amount': float(payment.amount),
            'tds_section': payment.tds_section_code or 'Not specified',
            'tds_rate': float(payment.tds_rate_applied or 0),
            'tds_amount': float(payment.tds_amount),
            'certificate_issued': payment.tds_certificate_issued,
            'certificate_number': payment.tds_certificate_number or 'Not issued',
            'deposited': payment.tds_deposited_date is not None
        })
    
    return {
        'period': {
            'start_date': start_date,
            'end_date': end_date
        },
        'gst_data': gst_data,
        'tds_data': tds_data,
        'summary': {
            'total_gst_invoices': len(gst_data),
            'total_taxable_amount': sum(item['taxable_amount'] for item in gst_data),
            'total_tax_collected': sum(item['tax_amount'] for item in gst_data),
            'total_tds_payments': len(tds_data),
            'total_tds_deducted': sum(item['tds_amount'] for item in tds_data)
        }
    }