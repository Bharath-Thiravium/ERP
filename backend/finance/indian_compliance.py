# Indian Compliance Enhancements for Existing Models
# Add these fields and methods to your existing models

"""
STEP 1: Add these fields to existing models via Django migrations

1. HSNCode model (enhance existing):
   - Add: live_gst_rate (DecimalField) - fetched from government API
   - Add: effective_from (DateField)
   - Add: is_rate_updated (BooleanField)

2. Customer model (enhance existing):
   - Add: state_code (CharField, max_length=2) - for GST calculation
   - Add: is_gst_registered (BooleanField)
   - Add: gst_registration_date (DateField)

3. Company model (enhance existing):
   - Add: company_state_code (CharField, max_length=2)
   - Add: gst_filing_frequency (CharField) - Monthly/Quarterly
   - Add: last_gstr1_filed (DateField)
   - Add: last_gstr3b_filed (DateField)

4. Invoice model (enhance existing):
   - Add: gst_transaction_id (CharField) - unique GST transaction ID
   - Add: is_filed_in_gstr1 (BooleanField, default=False)
   - Add: gstr1_filing_date (DateField, null=True)
   - Add: place_of_supply (CharField) - state code where supply is made
   - Add: reverse_charge_applicable (BooleanField, default=False)

5. Payment model (enhance existing):
   - Add: tds_section_code (CharField) - 194A, 194C, 194J, etc.
   - Add: tds_rate_applied (DecimalField)
   - Add: tds_certificate_issued (BooleanField, default=False)
   - Add: form16a_number (CharField, blank=True)
   - Add: tds_deposited_date (DateField, null=True)
"""

from decimal import Decimal
from django.db import models
from django.utils import timezone
from datetime import datetime, date


class IndianComplianceManager:
    """Manager class for Indian compliance calculations"""
    
    @staticmethod
    def calculate_gst_type(company_state_code, customer_state_code, customer_gstin):
        """
        Determine GST type based on state codes and GSTIN
        Returns: 'igst', 'cgst_sgst', or 'exempt'
        """
        if not customer_gstin:
            return 'exempt'
        
        if company_state_code == customer_state_code:
            return 'cgst_sgst'  # Same state - CGST + SGST
        else:
            return 'igst'  # Different state - IGST
    
    @staticmethod
    def calculate_gst_amounts(line_total, gst_rate, gst_type):
        """
        Calculate GST amounts based on type
        Returns: dict with cgst_amount, sgst_amount, igst_amount
        """
        if gst_type == 'exempt':
            return {'cgst_amount': 0, 'sgst_amount': 0, 'igst_amount': 0}
        
        total_gst = (line_total * gst_rate) / Decimal('100')
        
        if gst_type == 'cgst_sgst':
            half_gst = total_gst / Decimal('2')
            return {
                'cgst_amount': half_gst,
                'sgst_amount': half_gst,
                'igst_amount': Decimal('0')
            }
        else:  # igst
            return {
                'cgst_amount': Decimal('0'),
                'sgst_amount': Decimal('0'),
                'igst_amount': total_gst
            }
    
    @staticmethod
    def calculate_tds(payment_amount, tds_section):
        """
        Calculate TDS based on section
        Returns: dict with tds_amount, tds_rate
        """
        # Convert payment_amount to Decimal to avoid type mismatch
        payment_amount = Decimal(str(payment_amount))
        
        tds_rates = {
            '194A': Decimal('10.00'),  # Interest payments
            '194C': Decimal('1.00'),   # Contractor payments
            '194J': Decimal('10.00'),  # Professional services
            '194I': Decimal('10.00'),  # Rent payments
            '194H': Decimal('5.00'),   # Commission payments
        }
        
        rate = tds_rates.get(tds_section, Decimal('0'))
        tds_amount = (payment_amount * rate) / Decimal('100')
        
        return {
            'tds_amount': tds_amount,
            'tds_rate': rate,
            'net_amount': payment_amount - tds_amount
        }
    
    @staticmethod
    def get_state_code_from_gstin(gstin):
        """Extract state code from GSTIN"""
        if gstin and len(gstin) >= 2:
            return gstin[:2]
        return None
    
    @staticmethod
    def validate_gstin(gstin):
        """Basic GSTIN validation"""
        import re
        if not gstin:
            return False
        
        pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
        return bool(re.match(pattern, gstin))
    
    @staticmethod
    def generate_gstr1_data(company, start_date, end_date):
        """
        Generate GSTR-1 data for the given period
        Returns: dict with B2B, B2C, and other sections
        """
        from .models import Invoice
        
        invoices = Invoice.objects.filter(
            company=company,
            invoice_date__range=[start_date, end_date],
            status__in=['sent', 'paid', 'partially_paid']
        ).select_related('customer')
        
        b2b_data = []  # Business to Business
        b2c_data = []  # Business to Consumer
        
        for invoice in invoices:
            invoice_data = {
                'invoice_number': invoice.invoice_number,
                'invoice_date': invoice.invoice_date.strftime('%d-%m-%Y'),
                'taxable_amount': float(invoice.subtotal),
                'tax_amount': float(invoice.total_tax),
                'total_amount': float(invoice.total_amount),
                'place_of_supply': getattr(invoice, 'place_of_supply', ''),
                'gst_type': invoice.gst_type,
            }
            
            if invoice.customer.gstin:
                # B2B transaction
                invoice_data.update({
                    'customer_gstin': invoice.customer.gstin,
                    'customer_name': invoice.customer.name,
                })
                b2b_data.append(invoice_data)
            else:
                # B2C transaction
                b2c_data.append(invoice_data)
        
        return {
            'b2b_invoices': b2b_data,
            'b2c_invoices': b2c_data,
            'summary': {
                'total_b2b_amount': sum(inv['total_amount'] for inv in b2b_data),
                'total_b2c_amount': sum(inv['total_amount'] for inv in b2c_data),
                'total_tax_collected': sum(inv['tax_amount'] for inv in b2b_data + b2c_data),
            }
        }


# State Code Master Data
INDIAN_STATE_CODES = {
    '01': 'Jammu and Kashmir',
    '02': 'Himachal Pradesh',
    '03': 'Punjab',
    '04': 'Chandigarh',
    '05': 'Uttarakhand',
    '06': 'Haryana',
    '07': 'Delhi',
    '08': 'Rajasthan',
    '09': 'Uttar Pradesh',
    '10': 'Bihar',
    '11': 'Sikkim',
    '12': 'Arunachal Pradesh',
    '13': 'Nagaland',
    '14': 'Manipur',
    '15': 'Mizoram',
    '16': 'Tripura',
    '17': 'Meghalaya',
    '18': 'Assam',
    '19': 'West Bengal',
    '20': 'Jharkhand',
    '21': 'Odisha',
    '22': 'Chhattisgarh',
    '23': 'Madhya Pradesh',
    '24': 'Gujarat',
    '25': 'Daman and Diu',
    '26': 'Dadra and Nagar Haveli',
    '27': 'Maharashtra',
    '28': 'Andhra Pradesh',
    '29': 'Karnataka',
    '30': 'Goa',
    '31': 'Lakshadweep',
    '32': 'Kerala',
    '33': 'Tamil Nadu',
    '34': 'Puducherry',
    '35': 'Andaman and Nicobar Islands',
    '36': 'Telangana',
    '37': 'Andhra Pradesh (New)',
}

# TDS Section Master Data
TDS_SECTIONS = {
    '194A': {
        'description': 'Interest other than Interest on Securities',
        'rate': 10.00,
        'threshold': 5000,
    },
    '194C': {
        'description': 'Payment to Contractors',
        'rate': 1.00,
        'threshold': 30000,
    },
    '194J': {
        'description': 'Professional or Technical Services',
        'rate': 10.00,
        'threshold': 30000,
    },
    '194I': {
        'description': 'Rent',
        'rate': 10.00,
        'threshold': 180000,
    },
    '194H': {
        'description': 'Commission or Brokerage',
        'rate': 5.00,
        'threshold': 15000,
    },
}

# Standalone functions for backward compatibility
def calculate_gst_for_invoice(invoice_data):
    """Calculate GST for invoice - wrapper function"""
    manager = IndianComplianceManager()
    
    company_state = invoice_data.get('company_state_code', '27')
    customer_state = invoice_data.get('customer_state_code', '27')
    customer_gstin = invoice_data.get('customer_gstin', '')
    line_total = invoice_data.get('subtotal', Decimal('0'))
    gst_rate = invoice_data.get('gst_rate', Decimal('18'))
    
    gst_type = manager.calculate_gst_type(company_state, customer_state, customer_gstin)
    gst_amounts = manager.calculate_gst_amounts(line_total, gst_rate, gst_type)
    
    return {
        'gst_type': gst_type,
        **gst_amounts,
        'total_gst': gst_amounts['cgst_amount'] + gst_amounts['sgst_amount'] + gst_amounts['igst_amount']
    }

def calculate_tds_for_payment(payment_data):
    """Calculate TDS for payment - wrapper function with threshold check"""
    manager = IndianComplianceManager()
    
    payment_amount = Decimal(str(payment_data.get('amount', 0)))
    tds_section = payment_data.get('tds_section', '194J')
    
    # Get section details
    section_info = TDS_SECTIONS.get(tds_section, {})
    threshold = Decimal(str(section_info.get('threshold', 0)))
    
    # Check if payment is above threshold
    if payment_amount >= threshold:
        tds_result = manager.calculate_tds(payment_amount, tds_section)
        tds_result['is_above_threshold'] = True
        return tds_result
    else:
        return {
            'tds_amount': Decimal('0'),
            'tds_rate': Decimal('0'),
            'net_amount': payment_amount,
            'is_above_threshold': False
        }

def get_indian_states():
    """Get list of Indian states"""
    return INDIAN_STATE_CODES

def get_tds_sections():
    """Get list of TDS sections"""
    return TDS_SECTIONS