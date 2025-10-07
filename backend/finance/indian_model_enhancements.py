# Indian Compliance Model Enhancements
# Add these methods to your existing models

"""
STEP 2: Add these methods to your existing models

Copy these methods into your existing models.py file
"""

# Add to Customer model
def get_state_code_from_gstin(self):
    """Extract state code from GSTIN"""
    if self.gstin and len(self.gstin) >= 2:
        return self.gstin[:2]
    return self.state_code

def is_interstate_customer(self, company_state_code):
    """Check if customer is from different state"""
    customer_state = self.get_state_code_from_gstin()
    return customer_state != company_state_code if customer_state else False

def get_gst_type_for_transaction(self, company_state_code):
    """Determine GST type for transaction with this customer"""
    if not self.gstin:
        return 'exempt'
    
    if self.is_interstate_customer(company_state_code):
        return 'igst'
    else:
        return 'cgst_sgst'

# Add to Invoice model
def calculate_indian_gst(self):
    """Calculate GST amounts based on Indian compliance rules"""
    from .indian_compliance import IndianComplianceManager
    
    # Get company state code (you'll need to add this to Company model)
    company_state_code = getattr(self.company, 'state_code', '27')  # Default to Maharashtra
    customer_state_code = self.customer.get_state_code_from_gstin()
    
    # Determine GST type
    self.gst_type = IndianComplianceManager.calculate_gst_type(
        company_state_code, customer_state_code, self.customer.gstin
    )
    
    # Set place of supply
    self.place_of_supply = customer_state_code or company_state_code
    
    # Calculate GST amounts for each line item
    total_cgst = total_sgst = total_igst = 0
    
    for item in self.invoice_items.all():
        gst_amounts = IndianComplianceManager.calculate_gst_amounts(
            item.line_total, item.gst_rate, self.gst_type
        )
        total_cgst += gst_amounts['cgst_amount']
        total_sgst += gst_amounts['sgst_amount']
        total_igst += gst_amounts['igst_amount']
    
    self.cgst_amount = total_cgst
    self.sgst_amount = total_sgst
    self.igst_amount = total_igst
    self.total_tax = total_cgst + total_sgst + total_igst

def generate_gst_transaction_id(self):
    """Generate unique GST transaction ID"""
    import uuid
    from datetime import datetime
    
    if not self.gst_transaction_id:
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        unique_id = str(uuid.uuid4())[:8].upper()
        self.gst_transaction_id = f"GST{timestamp}{unique_id}"

def get_gstr1_data(self):
    """Get GSTR-1 formatted data for this invoice"""
    return {
        'invoice_number': self.invoice_number,
        'invoice_date': self.invoice_date.strftime('%d-%m-%Y'),
        'customer_gstin': self.customer.gstin or '',
        'customer_name': self.customer.name,
        'place_of_supply': self.place_of_supply,
        'reverse_charge': 'Y' if self.reverse_charge_applicable else 'N',
        'invoice_type': 'Regular',
        'taxable_amount': float(self.subtotal),
        'cgst_amount': float(self.cgst_amount),
        'sgst_amount': float(self.sgst_amount),
        'igst_amount': float(self.igst_amount),
        'total_tax': float(self.total_tax),
        'total_amount': float(self.total_amount),
    }

# Add to Payment model
def calculate_tds_automatically(self):
    """Calculate TDS based on section and amount"""
    from .indian_compliance import IndianComplianceManager
    
    if self.tds_section_code:
        tds_data = IndianComplianceManager.calculate_tds(
            self.amount, self.tds_section_code
        )
        self.tds_amount = tds_data['tds_amount']
        self.tds_rate_applied = tds_data['tds_rate']
        self.net_amount_received = tds_data['net_amount']

def generate_form16a_data(self):
    """Generate Form 16A data for TDS certificate"""
    if not self.tds_amount or self.tds_amount <= 0:
        return None
    
    return {
        'certificate_number': self.form16a_number,
        'deductee_name': self.customer.name,
        'deductee_pan': self.customer.pan_number,
        'deductor_name': self.company.name,
        'deductor_tan': getattr(self.company, 'tan_number', ''),
        'payment_date': self.payment_date.strftime('%d-%m-%Y'),
        'amount_paid': float(self.amount),
        'tds_amount': float(self.tds_amount),
        'tds_rate': float(self.tds_rate_applied),
        'section_code': self.tds_section_code,
        'challan_number': self.tds_challan_number,
        'deposit_date': self.tds_deposited_date.strftime('%d-%m-%Y') if self.tds_deposited_date else '',
    }

def is_tds_applicable(self):
    """Check if TDS is applicable for this payment"""
    from .indian_compliance import TDS_SECTIONS
    
    if not self.tds_section_code:
        return False
    
    section_data = TDS_SECTIONS.get(self.tds_section_code)
    if not section_data:
        return False
    
    return self.amount >= section_data['threshold']

# Add to Company model (you'll need to add these fields via migration)
def get_gst_filing_status(self):
    """Get GST filing status for current month"""
    from datetime import datetime, date
    
    current_date = date.today()
    current_month = current_date.strftime('%m-%Y')
    
    # Check if GSTR-1 is filed for current month
    gstr1_filed = hasattr(self, 'last_gstr1_filed') and \
                  self.last_gstr1_filed and \
                  self.last_gstr1_filed.strftime('%m-%Y') == current_month
    
    # Check if GSTR-3B is filed for current month
    gstr3b_filed = hasattr(self, 'last_gstr3b_filed') and \
                   self.last_gstr3b_filed and \
                   self.last_gstr3b_filed.strftime('%m-%Y') == current_month
    
    return {
        'current_period': current_month,
        'gstr1_status': 'Filed' if gstr1_filed else 'Pending',
        'gstr3b_status': 'Filed' if gstr3b_filed else 'Pending',
        'last_gstr1_filed': self.last_gstr1_filed.strftime('%d-%m-%Y') if hasattr(self, 'last_gstr1_filed') and self.last_gstr1_filed else 'Never',
        'last_gstr3b_filed': self.last_gstr3b_filed.strftime('%d-%m-%Y') if hasattr(self, 'last_gstr3b_filed') and self.last_gstr3b_filed else 'Never',
    }

# Add to HSNCode model
def update_live_gst_rate(self):
    """Update GST rate from government API (placeholder for future implementation)"""
    # This will be implemented when government APIs are available
    # For now, manually update rates
    if not self.is_rate_updated:
        self.live_gst_rate = self.gst_rate
        self.is_rate_updated = True
        self.save()

# Add to SACCode model  
def update_live_gst_rate(self):
    """Update GST rate from government API (placeholder for future implementation)"""
    # This will be implemented when government APIs are available
    # For now, manually update rates
    if not self.is_rate_updated:
        self.live_gst_rate = self.gst_rate
        self.is_rate_updated = True
        self.save()


# Utility functions for Indian compliance
def get_financial_year(date_obj):
    """Get financial year for Indian accounting (April to March)"""
    if date_obj.month >= 4:
        return f"{date_obj.year}-{date_obj.year + 1}"
    else:
        return f"{date_obj.year - 1}-{date_obj.year}"

def get_gst_period(date_obj):
    """Get GST period in MM-YYYY format"""
    return date_obj.strftime('%m-%Y')

def validate_indian_pan(pan):
    """Validate Indian PAN number format"""
    import re
    if not pan:
        return False
    pattern = r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$'
    return bool(re.match(pattern, pan.upper()))

def validate_indian_gstin(gstin):
    """Validate Indian GSTIN format"""
    import re
    if not gstin:
        return False
    pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
    return bool(re.match(pattern, gstin.upper()))