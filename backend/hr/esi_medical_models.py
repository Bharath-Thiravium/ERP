from django.db import models
from django.core.validators import MinValueValidator
from .models import Employee, _generate_configured_number


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
    
    claim_number = models.CharField(max_length=50, blank=True, db_index=True)
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

    def save(self, *args, **kwargs):
        if not self.claim_number:
            company = self.employee.company
            try:
                self.claim_number = _generate_configured_number(company, 'expense_claim')
            except Exception:
                if getattr(company, 'use_document_numbering', False):
                    raise
                last_claim = ESIMedicalBenefit.objects.filter(
                    employee__company=company,
                    claim_number__startswith='EXP-'
                ).order_by('-id').first()
                if last_claim:
                    last_number = int(last_claim.claim_number.split('-')[-1])
                    self.claim_number = f"EXP-{last_number + 1:06d}"
                else:
                    self.claim_number = "EXP-000001"
        super().save(*args, **kwargs)
