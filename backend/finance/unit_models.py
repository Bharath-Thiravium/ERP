from django.db import models
from authentication.models import Company, CompanyServiceUser


class Unit(models.Model):
    """Unit model for company-specific units"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='units')
    code = models.CharField(max_length=20, help_text="Unit code (e.g., KG, PCS, LITER)")
    name = models.CharField(max_length=100, help_text="Unit display name (e.g., Kilograms, Pieces, Liters)")
    is_active = models.BooleanField(default=True)
    
    # Audit fields
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, related_name='created_units')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'finance_units'
        ordering = ['name']
        unique_together = ['company', 'code']

    def __str__(self):
        return f"{self.code} - {self.name}"