from django.db import models
from django.core.validators import MinValueValidator
from .models import Employee


class ESIMedicalBenefit(models.Model):
    """ESI medical benefit claims tracking"""
    CLAIM_TYPES = [
        ('medical', 'Medical Treatment'),
        ('maternity', 'Maternity Benefit'),
        ('disability', 'Temporary Disability'),
        ('dependent', 'Dependent Medical'),
    ]
    
    CLAIM_STATUS = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('paid', 'Paid'),
    ]
    
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='esi_medical_claims')
    claim_type = models.CharField(max_length=20, choices=CLAIM_TYPES)
    claim_date = models.DateField()
    treatment_date = models.DateField()
    hospital_name = models.CharField(max_length=200)
    claim_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    approved_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    claim_number = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=CLAIM_STATUS, default='draft')
    
    documents = models.JSONField(default=list, blank=True)
    remarks = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    
    submitted_date = models.DateTimeField(null=True, blank=True)
    approved_date = models.DateTimeField(null=True, blank=True)
    payment_date = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.claim_number} - ₹{self.claim_amount}"
