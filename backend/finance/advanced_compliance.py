"""
Advanced Compliance Features - GSTR-3B, E-way Bills, Enhanced Reporting
"""
from django.db.models import Sum, Q, Count
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from .models import Invoice, Payment, Customer, Product
import json

class AdvancedComplianceEngine:
    """Enhanced compliance features for Indian regulations"""
    
    def __init__(self, company):
        self.company = company
    
    def generate_complete_gstr3b_report(self, start_date, end_date):
        """Generate comprehensive GSTR-3B report with all sections"""
        invoices = Invoice.objects.filter(
            company=self.company,
            invoice_date__range=[start_date, end_date]
        )
        
        # Section 3.1 - Outward taxable supplies
        outward_supplies = self._calculate_outward_supplies(invoices)
        
        # Section 3.2 - Outward taxable supplies (zero rated, exempted and non GST outward supplies)
        zero_rated_supplies = self._calculate_zero_rated_supplies(invoices)
        
        # Section 4 - Eligible ITC (Input Tax Credit) - Estimated
        eligible_itc = self._calculate_eligible_itc(invoices)
        
        # Section 5 - Values of exempt, Nil rated and non-GST inward supplies
        exempt_supplies = self._calculate_exempt_supplies(invoices)
        
        # Section 6 - Interest and late fee
        interest_late_fee = self._calculate_interest_late_fee()
        
        # Section 7 - Tax payable
        tax_payable = self._calculate_tax_payable(outward_supplies, eligible_itc)
        
        return {
            'period': {
                'start_date': start_date.strftime('%Y-%m-%d'),
                'end_date': end_date.strftime('%Y-%m-%d'),
                'month': start_date.strftime('%B %Y'),
                'return_period': start_date.strftime('%m%Y')
            },
            'section_3_1_outward_supplies': outward_supplies,
            'section_3_2_zero_rated_supplies': zero_rated_supplies,
            'section_4_eligible_itc': eligible_itc,
            'section_5_exempt_supplies': exempt_supplies,
            'section_6_interest_late_fee': interest_late_fee,
            'section_7_tax_payable': tax_payable,
            'summary': {
                'total_turnover': float(outward_supplies['total_taxable_value']),
                'total_tax_liability': float(tax_payable['total_tax_payable']),
                'total_itc_available': float(eligible_itc['total_itc']),
                'net_tax_payable': float(tax_payable['total_tax_payable'] - eligible_itc['total_itc'])
            },
            'generated_at': timezone.now().isoformat()
        }
    
    def _calculate_outward_supplies(self, invoices):
        """Calculate Section 3.1 - Outward taxable supplies"""
        # Registered customers (B2B)
        b2b_invoices = invoices.filter(customer__is_gst_registered=True)
        
        # Unregistered customers (B2C)
        b2c_invoices = invoices.filter(customer__is_gst_registered=False)
        
        # Calculate totals
        b2b_taxable = b2b_invoices.aggregate(Sum('subtotal'))['subtotal__sum'] or 0
        b2b_igst = b2b_invoices.aggregate(Sum('igst_amount'))['igst_amount__sum'] or 0
        b2b_cgst = b2b_invoices.aggregate(Sum('cgst_amount'))['cgst_amount__sum'] or 0
        b2b_sgst = b2b_invoices.aggregate(Sum('sgst_amount'))['sgst_amount__sum'] or 0
        
        b2c_taxable = b2c_invoices.aggregate(Sum('subtotal'))['subtotal__sum'] or 0
        b2c_igst = b2c_invoices.aggregate(Sum('igst_amount'))['igst_amount__sum'] or 0
        b2c_cgst = b2c_invoices.aggregate(Sum('cgst_amount'))['cgst_amount__sum'] or 0
        b2c_sgst = b2c_invoices.aggregate(Sum('sgst_amount'))['sgst_amount__sum'] or 0
        
        return {
            'b2b_supplies': {
                'taxable_value': float(b2b_taxable),
                'igst': float(b2b_igst),
                'cgst': float(b2b_cgst),
                'sgst': float(b2b_sgst),
                'cess': 0
            },
            'b2c_large_supplies': {  # B2C > 2.5 lakhs
                'taxable_value': float(b2c_invoices.filter(total_amount__gt=250000).aggregate(Sum('subtotal'))['subtotal__sum'] or 0),
                'igst': float(b2c_invoices.filter(total_amount__gt=250000).aggregate(Sum('igst_amount'))['igst_amount__sum'] or 0),
                'cgst': float(b2c_invoices.filter(total_amount__gt=250000).aggregate(Sum('cgst_amount'))['cgst_amount__sum'] or 0),
                'sgst': float(b2c_invoices.filter(total_amount__gt=250000).aggregate(Sum('sgst_amount'))['sgst_amount__sum'] or 0),
                'cess': 0
            },
            'b2c_other_supplies': {  # B2C <= 2.5 lakhs
                'taxable_value': float(b2c_invoices.filter(total_amount__lte=250000).aggregate(Sum('subtotal'))['subtotal__sum'] or 0),
                'igst': float(b2c_invoices.filter(total_amount__lte=250000).aggregate(Sum('igst_amount'))['igst_amount__sum'] or 0),
                'cgst': float(b2c_invoices.filter(total_amount__lte=250000).aggregate(Sum('cgst_amount'))['cgst_amount__sum'] or 0),
                'sgst': float(b2c_invoices.filter(total_amount__lte=250000).aggregate(Sum('sgst_amount'))['sgst_amount__sum'] or 0),
                'cess': 0
            },
            'total_taxable_value': float(b2b_taxable + b2c_taxable),
            'total_igst': float(b2b_igst + b2c_igst),
            'total_cgst': float(b2b_cgst + b2c_cgst),
            'total_sgst': float(b2b_sgst + b2c_sgst),
            'total_cess': 0
        }
    
    def _calculate_zero_rated_supplies(self, invoices):
        """Calculate Section 3.2 - Zero rated, exempted and non-GST supplies"""
        # For now, assume no zero-rated supplies (exports)
        return {
            'zero_rated_supplies': {
                'taxable_value': 0,
                'igst': 0,
                'cgst': 0,
                'sgst': 0,
                'cess': 0
            },
            'exempted_supplies': {
                'taxable_value': 0,
                'igst': 0,
                'cgst': 0,
                'sgst': 0,
                'cess': 0
            },
            'non_gst_supplies': {
                'taxable_value': 0,
                'igst': 0,
                'cgst': 0,
                'sgst': 0,
                'cess': 0
            }
        }
    
    def _calculate_eligible_itc(self, invoices):
        """Calculate Section 4 - Eligible Input Tax Credit (estimated)"""
        # Estimate ITC as 60% of output tax (typical for service companies)
        total_output_tax = invoices.aggregate(
            total_tax=Sum('igst_amount') + Sum('cgst_amount') + Sum('sgst_amount')
        )['total_tax'] or 0
        
        estimated_itc = float(total_output_tax) * 0.6
        
        return {
            'itc_on_inputs': {
                'igst': estimated_itc * 0.4,
                'cgst': estimated_itc * 0.3,
                'sgst': estimated_itc * 0.3,
                'cess': 0
            },
            'itc_on_input_services': {
                'igst': estimated_itc * 0.3,
                'cgst': estimated_itc * 0.2,
                'sgst': estimated_itc * 0.2,
                'cess': 0
            },
            'itc_on_capital_goods': {
                'igst': estimated_itc * 0.1,
                'cgst': 0,
                'sgst': 0,
                'cess': 0
            },
            'total_itc': estimated_itc
        }
    
    def _calculate_exempt_supplies(self, invoices):
        """Calculate Section 5 - Exempt, Nil rated and non-GST supplies"""
        return {
            'from_registered_person': 0,
            'from_unregistered_person': 0,
            'total': 0
        }
    
    def _calculate_interest_late_fee(self):
        """Calculate Section 6 - Interest and late fee"""
        return {
            'interest_on_delayed_payment': 0,
            'late_fee': 0,
            'penalty': 0,
            'total': 0
        }
    
    def _calculate_tax_payable(self, outward_supplies, eligible_itc):
        """Calculate Section 7 - Tax payable"""
        gross_igst = outward_supplies['total_igst']
        gross_cgst = outward_supplies['total_cgst']
        gross_sgst = outward_supplies['total_sgst']
        
        itc_igst = eligible_itc['itc_on_inputs']['igst'] + eligible_itc['itc_on_input_services']['igst'] + eligible_itc['itc_on_capital_goods']['igst']
        itc_cgst = eligible_itc['itc_on_inputs']['cgst'] + eligible_itc['itc_on_input_services']['cgst']
        itc_sgst = eligible_itc['itc_on_inputs']['sgst'] + eligible_itc['itc_on_input_services']['sgst']
        
        net_igst = max(0, gross_igst - itc_igst)
        net_cgst = max(0, gross_cgst - itc_cgst)
        net_sgst = max(0, gross_sgst - itc_sgst)
        
        return {
            'igst_payable': float(net_igst),
            'cgst_payable': float(net_cgst),
            'sgst_payable': float(net_sgst),
            'cess_payable': 0,
            'total_tax_payable': float(net_igst + net_cgst + net_sgst)
        }
    
    def generate_eway_bill_data(self, invoice_id):
        """Generate E-way bill data for an invoice"""
        try:
            invoice = Invoice.objects.get(id=invoice_id, company=self.company)
            
            # Check if E-way bill is required (>50,000 for goods)
            if invoice.total_amount < 50000:
                return {
                    'required': False,
                    'reason': 'Invoice amount below ₹50,000 threshold'
                }
            
            # Generate E-way bill data
            eway_bill_data = {
                'required': True,
                'invoice_details': {
                    'invoice_number': invoice.invoice_number,
                    'invoice_date': invoice.invoice_date.strftime('%d/%m/%Y'),
                    'invoice_value': float(invoice.total_amount),
                    'place_of_supply': invoice.place_of_supply or invoice.customer.state_code
                },
                'supplier_details': {
                    'gstin': getattr(self.company, 'gst_number', ''),
                    'legal_name': self.company.name,
                    'trade_name': self.company.name,
                    'address': getattr(self.company, 'address', ''),
                    'location': getattr(self.company, 'city', ''),
                    'pincode': getattr(self.company, 'pincode', ''),
                    'state_code': getattr(self.company, 'state_code', '')
                },
                'recipient_details': {
                    'gstin': invoice.customer.gstin or '',
                    'legal_name': invoice.customer.name,
                    'trade_name': invoice.customer.name,
                    'address': invoice.customer.billing_address_line1 or '',
                    'location': invoice.customer.billing_city or '',
                    'pincode': invoice.customer.billing_pincode or '',
                    'state_code': invoice.customer.state_code or ''
                },
                'shipment_details': {
                    'transporter_id': '',
                    'transporter_name': '',
                    'transport_mode': '1',  # Road
                    'vehicle_number': '',
                    'vehicle_type': 'R',  # Regular
                    'approximate_distance': 100  # Default 100 km
                },
                'item_details': [],
                'tax_details': {
                    'taxable_value': float(invoice.subtotal),
                    'igst_amount': float(invoice.igst_amount or 0),
                    'cgst_amount': float(invoice.cgst_amount or 0),
                    'sgst_amount': float(invoice.sgst_amount or 0),
                    'cess_amount': 0,
                    'total_tax': float(invoice.total_tax),
                    'total_value': float(invoice.total_amount)
                }
            }
            
            # Add item details
            for item in invoice.invoice_items.all():
                eway_bill_data['item_details'].append({
                    'product_name': item.product_name,
                    'description': item.description or item.product_name,
                    'hsn_code': item.hsn_sac_code or '9999',
                    'quantity': float(item.quantity),
                    'unit': item.unit,
                    'taxable_value': float(item.line_total),
                    'tax_rate': float(item.gst_rate)
                })
            
            return eway_bill_data
            
        except Invoice.DoesNotExist:
            return {
                'required': False,
                'error': 'Invoice not found'
            }
    
    def generate_compliance_checklist(self, month, year):
        """Generate monthly compliance checklist"""
        start_date = datetime(year, month, 1).date()
        if month == 12:
            end_date = datetime(year + 1, 1, 1).date() - timedelta(days=1)
        else:
            end_date = datetime(year, month + 1, 1).date() - timedelta(days=1)
        
        invoices = Invoice.objects.filter(
            company=self.company,
            invoice_date__range=[start_date, end_date]
        )
        
        payments = Payment.objects.filter(
            company=self.company,
            payment_date__range=[start_date, end_date]
        )
        
        checklist = []
        
        # GSTR-1 Filing
        gstr1_due = datetime(year, month + 1 if month < 12 else 1, 11 if month < 12 else 11).date()
        if month == 12:
            gstr1_due = datetime(year + 1, 1, 11).date()
        
        checklist.append({
            'task': 'GSTR-1 Filing',
            'due_date': gstr1_due.strftime('%d/%m/%Y'),
            'status': 'pending',  # Would check actual filing status
            'description': f'File GSTR-1 for {start_date.strftime("%B %Y")}',
            'priority': 'high',
            'invoice_count': invoices.count(),
            'total_value': float(invoices.aggregate(Sum('total_amount'))['total_amount__sum'] or 0)
        })
        
        # GSTR-3B Filing
        gstr3b_due = datetime(year, month + 1 if month < 12 else 1, 20 if month < 12 else 20).date()
        if month == 12:
            gstr3b_due = datetime(year + 1, 1, 20).date()
        
        checklist.append({
            'task': 'GSTR-3B Filing',
            'due_date': gstr3b_due.strftime('%d/%m/%Y'),
            'status': 'pending',
            'description': f'File GSTR-3B for {start_date.strftime("%B %Y")}',
            'priority': 'high',
            'tax_liability': float(invoices.aggregate(
                total_tax=Sum('igst_amount') + Sum('cgst_amount') + Sum('sgst_amount')
            )['total_tax'] or 0)
        })
        
        # TDS Return (Quarterly)
        if month in [6, 9, 12, 3]:  # Quarter ends
            quarter = 'Q1' if month == 6 else 'Q2' if month == 9 else 'Q3' if month == 12 else 'Q4'
            tds_due = datetime(year, month + 1 if month < 12 else 1, 31 if month < 12 else 31).date()
            if month == 12:
                tds_due = datetime(year + 1, 1, 31).date()
            
            tds_payments = payments.filter(tds_amount__gt=0)
            
            checklist.append({
                'task': f'TDS Return Filing ({quarter})',
                'due_date': tds_due.strftime('%d/%m/%Y'),
                'status': 'pending',
                'description': f'File quarterly TDS return for {quarter}',
                'priority': 'medium',
                'tds_payments': tds_payments.count(),
                'total_tds': float(tds_payments.aggregate(Sum('tds_amount'))['tds_amount__sum'] or 0)
            })
        
        # TDS Certificates
        pending_certificates = payments.filter(
            tds_amount__gt=0,
            tds_certificate_issued=False
        )
        
        if pending_certificates.exists():
            checklist.append({
                'task': 'Issue TDS Certificates',
                'due_date': 'Ongoing',
                'status': 'pending',
                'description': 'Issue Form 16A certificates for TDS deductions',
                'priority': 'medium',
                'pending_count': pending_certificates.count(),
                'total_amount': float(pending_certificates.aggregate(Sum('tds_amount'))['tds_amount__sum'] or 0)
            })
        
        return {
            'period': {
                'month': start_date.strftime('%B %Y'),
                'start_date': start_date.strftime('%Y-%m-%d'),
                'end_date': end_date.strftime('%Y-%m-%d')
            },
            'checklist': checklist,
            'summary': {
                'total_tasks': len(checklist),
                'high_priority': len([t for t in checklist if t['priority'] == 'high']),
                'medium_priority': len([t for t in checklist if t['priority'] == 'medium']),
                'pending_tasks': len([t for t in checklist if t['status'] == 'pending'])
            },
            'generated_at': timezone.now().isoformat()
        }