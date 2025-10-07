from django.db import models
from django.core.validators import RegexValidator
from authentication.models import Company, CompanyServiceUser
from .models import Customer, Invoice, Payment
import json

class CustomerBankStatement(models.Model):
    """Customer Bank Statement model for bank integration"""
    
    TRANSACTION_TYPES = [
        ('credit', 'Credit'),
        ('debit', 'Debit'),
    ]
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='bank_statements')
    transaction_date = models.DateField()
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    description = models.TextField()
    reference_number = models.CharField(max_length=100, blank=True)
    
    # Matching with payments
    matched_payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True)
    is_matched = models.BooleanField(default=False)
    match_confidence = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    # Import metadata
    import_batch_id = models.CharField(max_length=50, blank=True)
    imported_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'finance_customer_bank_statements'
        ordering = ['-transaction_date']
        unique_together = ['customer', 'transaction_date', 'reference_number']
    
    def __str__(self):
        return f"{self.customer.name} - {self.transaction_date} - ₹{self.amount}"

class BankAccount(models.Model):
    """Bank Account model for integration"""
    
    ACCOUNT_TYPES = [
        ('savings', 'Savings Account'),
        ('current', 'Current Account'),
        ('cc', 'Cash Credit'),
        ('od', 'Overdraft'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='bank_accounts')
    account_name = models.CharField(max_length=200)
    account_number = models.CharField(max_length=20)
    bank_name = models.CharField(max_length=100)
    branch_name = models.CharField(max_length=100)
    ifsc_code = models.CharField(
        max_length=11,
        validators=[RegexValidator(
            regex=r'^[A-Z]{4}0[A-Z0-9]{6}$',
            message='Enter a valid IFSC code'
        )]
    )
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES)
    
    # Integration Settings
    is_active = models.BooleanField(default=True)
    auto_import_enabled = models.BooleanField(default=False)
    last_import_date = models.DateTimeField(null=True, blank=True)
    
    # API Credentials (encrypted)
    api_credentials = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['company', 'account_number']
    
    def __str__(self):
        return f"{self.bank_name} - {self.account_number}"

class BankStatement(models.Model):
    """Bank Statement model for imported transactions"""
    
    TRANSACTION_TYPES = [
        ('credit', 'Credit'),
        ('debit', 'Debit'),
    ]
    
    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='statements')
    transaction_date = models.DateField()
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    balance = models.DecimalField(max_digits=15, decimal_places=2)
    description = models.TextField()
    reference_number = models.CharField(max_length=100, blank=True)
    
    # Matching with finance records
    matched_payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True)
    is_matched = models.BooleanField(default=False)
    match_confidence = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    # Import metadata
    import_batch_id = models.CharField(max_length=50, blank=True)
    imported_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['bank_account', 'transaction_date', 'reference_number']
        ordering = ['-transaction_date']

class ERPIntegration(models.Model):
    """ERP Integration configuration"""
    
    ERP_TYPES = [
        ('sap', 'SAP'),
        ('oracle', 'Oracle'),
        ('tally', 'Tally'),
        ('quickbooks', 'QuickBooks'),
        ('other', 'Other'),
    ]
    
    SYNC_DIRECTIONS = [
        ('import', 'Import Only'),
        ('export', 'Export Only'),
        ('bidirectional', 'Bidirectional'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='erp_integrations')
    erp_type = models.CharField(max_length=20, choices=ERP_TYPES)
    erp_name = models.CharField(max_length=100)
    
    # Connection Settings
    server_url = models.URLField(blank=True)
    database_name = models.CharField(max_length=100, blank=True)
    username = models.CharField(max_length=100, blank=True)
    
    # Sync Configuration
    sync_direction = models.CharField(max_length=20, choices=SYNC_DIRECTIONS, default='import')
    sync_customers = models.BooleanField(default=True)
    sync_products = models.BooleanField(default=True)
    sync_invoices = models.BooleanField(default=True)
    sync_payments = models.BooleanField(default=True)
    
    # Schedule
    auto_sync_enabled = models.BooleanField(default=False)
    sync_frequency = models.CharField(max_length=20, default='daily')  # hourly, daily, weekly
    last_sync_date = models.DateTimeField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    connection_status = models.CharField(max_length=20, default='disconnected')
    
    # Encrypted credentials
    encrypted_credentials = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.erp_name} ({self.erp_type})"

class PaymentGateway(models.Model):
    """Payment Gateway integration for automated tax payments"""
    
    GATEWAY_TYPES = [
        ('razorpay', 'Razorpay'),
        ('payu', 'PayU'),
        ('ccavenue', 'CCAvenue'),
        ('hdfc', 'HDFC Payment Gateway'),
        ('icici', 'ICICI Payment Gateway'),
        ('sbi', 'SBI ePay'),
        ('government', 'Government Portal'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='payment_gateways')
    gateway_type = models.CharField(max_length=20, choices=GATEWAY_TYPES)
    gateway_name = models.CharField(max_length=100)
    
    # Configuration
    merchant_id = models.CharField(max_length=100, blank=True)
    api_key = models.CharField(max_length=200, blank=True)
    webhook_url = models.URLField(blank=True)
    
    # Tax Payment Settings
    auto_gst_payment = models.BooleanField(default=False)
    auto_tds_payment = models.BooleanField(default=False)
    payment_threshold = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    
    # Encrypted credentials
    encrypted_credentials = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.gateway_name} ({self.gateway_type})"

class AutomatedTaxPayment(models.Model):
    """Automated Tax Payment records"""
    
    TAX_TYPES = [
        ('gst', 'GST'),
        ('tds', 'TDS'),
        ('income_tax', 'Income Tax'),
        ('professional_tax', 'Professional Tax'),
    ]
    
    PAYMENT_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    payment_gateway = models.ForeignKey(PaymentGateway, on_delete=models.CASCADE)
    
    tax_type = models.CharField(max_length=20, choices=TAX_TYPES)
    tax_period = models.CharField(max_length=20)  # e.g., "2025-01", "Q1-2025"
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Payment Details
    payment_date = models.DateTimeField()
    due_date = models.DateField()
    challan_number = models.CharField(max_length=50, blank=True)
    transaction_id = models.CharField(max_length=100, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    payment_response = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class EmailAutomation(models.Model):
    """Email Automation for compliance reminders"""
    
    EMAIL_TYPES = [
        ('gst_filing', 'GST Filing Reminder'),
        ('tds_filing', 'TDS Filing Reminder'),
        ('payment_due', 'Payment Due Reminder'),
        ('compliance_alert', 'Compliance Alert'),
        ('invoice_overdue', 'Invoice Overdue'),
        ('custom', 'Custom Reminder'),
    ]
    
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('custom', 'Custom'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='email_automations')
    email_type = models.CharField(max_length=20, choices=EMAIL_TYPES)
    title = models.CharField(max_length=200)
    
    # Recipients
    recipient_emails = models.JSONField(default=list)
    include_company_admin = models.BooleanField(default=True)
    include_finance_users = models.BooleanField(default=True)
    
    # Schedule
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    send_days_before = models.IntegerField(default=3)  # Days before due date
    send_time = models.TimeField(default='09:00:00')
    
    # Content
    subject_template = models.CharField(max_length=200)
    body_template = models.TextField()
    
    # Status
    is_active = models.BooleanField(default=True)
    last_sent = models.DateTimeField(null=True, blank=True)
    next_send = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.title} ({self.email_type})"

class MobileAppConfig(models.Model):
    """Mobile App Configuration for compliance management"""
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='mobile_configs')
    
    # Push Notifications
    push_notifications_enabled = models.BooleanField(default=True)
    gst_filing_alerts = models.BooleanField(default=True)
    payment_due_alerts = models.BooleanField(default=True)
    invoice_alerts = models.BooleanField(default=True)
    
    # Mobile Features
    offline_mode_enabled = models.BooleanField(default=True)
    biometric_auth_enabled = models.BooleanField(default=False)
    quick_invoice_enabled = models.BooleanField(default=True)
    expense_capture_enabled = models.BooleanField(default=True)
    
    # Sync Settings
    auto_sync_enabled = models.BooleanField(default=True)
    sync_frequency = models.CharField(max_length=20, default='hourly')
    wifi_only_sync = models.BooleanField(default=False)
    
    # Security
    session_timeout = models.IntegerField(default=30)  # minutes
    require_pin = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Mobile Config - {self.company.name}"

class IntegrationLog(models.Model):
    """Integration activity logs"""
    
    LOG_TYPES = [
        ('bank_import', 'Bank Statement Import'),
        ('erp_sync', 'ERP Synchronization'),
        ('payment_gateway', 'Payment Gateway'),
        ('email_automation', 'Email Automation'),
        ('mobile_sync', 'Mobile Sync'),
    ]
    
    STATUS_CHOICES = [
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('info', 'Info'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    log_type = models.CharField(max_length=20, choices=LOG_TYPES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    
    message = models.TextField()
    details = models.JSONField(default=dict, blank=True)
    
    # Metrics
    records_processed = models.IntegerField(default=0)
    records_success = models.IntegerField(default=0)
    records_failed = models.IntegerField(default=0)
    processing_time = models.DecimalField(max_digits=10, decimal_places=3, default=0.000)  # seconds
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.log_type} - {self.status} - {self.created_at}"