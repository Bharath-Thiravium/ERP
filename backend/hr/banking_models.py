from django.db import models
from authentication.models import Company
from .models import Employee, PayrollCycle


class BankVerification(models.Model):
    """Bank account verification tracking"""
    VERIFICATION_STATUS = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('failed', 'Failed'),
    ]
    
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='bank_verification')
    verification_status = models.CharField(max_length=20, choices=VERIFICATION_STATUS, default='pending')
    verification_method = models.CharField(max_length=50, default='penny_drop')
    verification_reference = models.CharField(max_length=100, blank=True)
    verified_date = models.DateTimeField(null=True, blank=True)
    verification_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.verification_status}"


class SalaryPayment(models.Model):
    """Salary payment transaction tracking"""
    PAYMENT_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    PAYMENT_METHOD = [
        ('neft', 'NEFT'),
        ('rtgs', 'RTGS'),
        ('imps', 'IMPS'),
        ('upi', 'UPI'),
    ]
    
    payroll_cycle = models.ForeignKey(PayrollCycle, on_delete=models.CASCADE, related_name='salary_payments')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='salary_payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD, default='neft')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    
    bank_name = models.CharField(max_length=100)
    account_number = models.CharField(max_length=20)
    ifsc_code = models.CharField(max_length=11)
    
    transaction_reference = models.CharField(max_length=100, blank=True)
    utr_number = models.CharField(max_length=50, blank=True)
    payment_date = models.DateTimeField(null=True, blank=True)
    
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.employee.full_name} - ₹{self.amount} - {self.payment_status}"


class DigitalSignature(models.Model):
    """Digital signature certificate management"""
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='digital_signature')
    certificate_path = models.CharField(max_length=500)
    certificate_password = models.CharField(max_length=255)
    issuer = models.CharField(max_length=200)
    valid_from = models.DateField()
    valid_to = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.company.name} - Digital Signature"


class SignedDocument(models.Model):
    """Digitally signed document tracking"""
    DOCUMENT_TYPES = [
        ('form16', 'Form 16'),
        ('payslip', 'Payslip'),
        ('certificate', 'Certificate'),
        ('return', 'Government Return'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='signed_documents')
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES)
    document_path = models.CharField(max_length=500)
    signed_path = models.CharField(max_length=500)
    signature_hash = models.CharField(max_length=255)
    signed_date = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.document_type} - {self.signed_date}"
