"""
Document Management Models for Finance System
"""
from django.db import models
from django.utils import timezone
from authentication.models import Company, CompanyServiceUser
import uuid
import os

def document_upload_path(instance, filename):
    """Generate upload path for documents"""
    return f'documents/{instance.company.id}/{instance.document_type}/{filename}'

class DocumentTemplate(models.Model):
    """Template for generating documents"""
    TEMPLATE_TYPES = [
        ('invoice', 'Invoice Template'),
        ('proforma', 'Proforma Invoice Template'),
        ('quotation', 'Quotation Template'),
        ('payment_receipt', 'Payment Receipt Template'),
        ('tds_certificate', 'TDS Certificate Template'),
        ('gst_return', 'GST Return Template'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='document_templates')
    name = models.CharField(max_length=200)
    template_type = models.CharField(max_length=50, choices=TEMPLATE_TYPES)
    html_content = models.TextField()
    css_styles = models.TextField(blank=True)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        unique_together = ['company', 'template_type', 'is_default']
    
    def __str__(self):
        return f"{self.company.name} - {self.name}"

class Document(models.Model):
    """Document storage and management"""
    DOCUMENT_TYPES = [
        ('invoice', 'Invoice'),
        ('proforma', 'Proforma Invoice'),
        ('quotation', 'Quotation'),
        ('payment_receipt', 'Payment Receipt'),
        ('tds_certificate', 'TDS Certificate'),
        ('gst_return', 'GST Return'),
        ('einvoice', 'E-Invoice'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('generated', 'Generated'),
        ('signed', 'Digitally Signed'),
        ('sent', 'Sent'),
        ('archived', 'Archived'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    title = models.CharField(max_length=300)
    file_path = models.FileField(upload_to=document_upload_path)
    file_size = models.PositiveIntegerField()
    mime_type = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Related objects
    invoice = models.ForeignKey('Invoice', on_delete=models.CASCADE, null=True, blank=True, related_name='documents')
    proforma_invoice = models.ForeignKey('ProformaInvoice', on_delete=models.CASCADE, null=True, blank=True, related_name='documents')
    quotation = models.ForeignKey('Quotation', on_delete=models.CASCADE, null=True, blank=True, related_name='documents')
    payment = models.ForeignKey('Payment', on_delete=models.CASCADE, null=True, blank=True, related_name='documents')
    
    # Digital signature
    is_digitally_signed = models.BooleanField(default=False)
    signature_timestamp = models.DateTimeField(null=True, blank=True)
    signature_certificate = models.TextField(blank=True)
    
    # E-Invoice specific
    einvoice_irn = models.CharField(max_length=100, blank=True)
    einvoice_ack_no = models.CharField(max_length=100, blank=True)
    einvoice_ack_date = models.DateTimeField(null=True, blank=True)
    qr_code_data = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.company.name}"

class BulkOperation(models.Model):
    """Track bulk document operations"""
    OPERATION_TYPES = [
        ('generate_invoices', 'Generate Invoices'),
        ('generate_einvoices', 'Generate E-Invoices'),
        ('send_documents', 'Send Documents'),
        ('archive_documents', 'Archive Documents'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='bulk_operations')
    operation_type = models.CharField(max_length=50, choices=OPERATION_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_items = models.PositiveIntegerField()
    processed_items = models.PositiveIntegerField(default=0)
    success_count = models.PositiveIntegerField(default=0)
    error_count = models.PositiveIntegerField(default=0)
    error_details = models.JSONField(default=list)
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.operation_type} - {self.company.name}"
    
    @property
    def progress_percentage(self):
        if self.total_items == 0:
            return 0
        return (self.processed_items / self.total_items) * 100