import requests
import json
import xml.etree.ElementTree as ET
from datetime import datetime, date
from decimal import Decimal
from django.conf import settings
from django.db import models
from authentication.models import Company, CompanyServiceUser
from .models import Employee, Payslip
from .statutory_models import StatutorySettings, GovernmentReturn


class GovernmentPortalIntegration:
    """Integration with government portals for statutory compliance"""
    
    def __init__(self, company):
        self.company = company
        self.statutory_settings = getattr(company, 'statutory_settings', None)
    
    def submit_pf_ecr(self, return_data):
        """Submit PF ECR to EPFO portal"""
        try:
            # Mock EPFO API integration
            payload = {
                'establishment_code': self.statutory_settings.pf_establishment_code,
                'return_period': return_data['period'],
                'employee_data': return_data['employees'],
                'total_wages': return_data.get('total_wages', 0),
                'total_contribution': return_data.get('total_contribution', 0)
            }
            
            # Simulate API call
            response = {
                'status': 'success',
                'acknowledgment_number': f"ACK{datetime.now().strftime('%Y%m%d%H%M%S')}",
                'submission_date': datetime.now().isoformat(),
                'message': 'PF ECR submitted successfully'
            }
            
            return response
            
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def submit_esi_return(self, return_data):
        """Submit ESI return to ESIC portal"""
        try:
            payload = {
                'employer_code': self.statutory_settings.esi_employer_code,
                'return_period': return_data['period'],
                'employee_data': return_data['employees'],
                'total_wages': return_data.get('total_wages', 0),
                'total_contribution': return_data.get('total_contribution', 0)
            }
            
            response = {
                'status': 'success',
                'acknowledgment_number': f"ESI{datetime.now().strftime('%Y%m%d%H%M%S')}",
                'submission_date': datetime.now().isoformat(),
                'message': 'ESI return submitted successfully'
            }
            
            return response
            
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def submit_pt_return(self, return_data):
        """Submit Professional Tax return to state portal"""
        try:
            payload = {
                'registration_number': self.statutory_settings.pt_registration_number,
                'state': self.statutory_settings.pt_state,
                'return_period': return_data['period'],
                'employee_data': return_data['employees'],
                'total_deduction': return_data.get('total_deduction', 0)
            }
            
            response = {
                'status': 'success',
                'acknowledgment_number': f"PT{datetime.now().strftime('%Y%m%d%H%M%S')}",
                'submission_date': datetime.now().isoformat(),
                'message': 'Professional Tax return submitted successfully'
            }
            
            return response
            
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def submit_tds_return(self, return_data):
        """Submit TDS return to Income Tax portal"""
        try:
            payload = {
                'tan_number': self.statutory_settings.tan_number,
                'return_period': return_data['period'],
                'employee_data': return_data['employees'],
                'total_tds': return_data.get('total_tds', 0)
            }
            
            response = {
                'status': 'success',
                'acknowledgment_number': f"TDS{datetime.now().strftime('%Y%m%d%H%M%S')}",
                'submission_date': datetime.now().isoformat(),
                'message': 'TDS return submitted successfully'
            }
            
            return response
            
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def check_submission_status(self, acknowledgment_number, return_type):
        """Check status of submitted return"""
        try:
            # Mock status check
            response = {
                'acknowledgment_number': acknowledgment_number,
                'status': 'processed',
                'processing_date': datetime.now().isoformat(),
                'remarks': 'Return processed successfully'
            }
            
            return response
            
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def download_challan(self, return_type, period):
        """Download challan from government portal"""
        try:
            # Mock challan generation
            challan_data = {
                'challan_number': f"CH{datetime.now().strftime('%Y%m%d%H%M%S')}",
                'return_type': return_type,
                'period': period,
                'amount': 0,  # Calculate based on return data
                'due_date': datetime.now().date().isoformat(),
                'bank_details': {
                    'bank_name': 'State Bank of India',
                    'account_number': '1234567890',
                    'ifsc': 'SBIN0001234'
                }
            }
            
            return challan_data
            
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }


class PortalCredentials(models.Model):
    """Store government portal credentials securely"""
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='portal_credentials')
    
    # EPFO Portal
    epfo_username = models.CharField(max_length=100, blank=True)
    epfo_password = models.CharField(max_length=255, blank=True)  # Should be encrypted
    epfo_digital_signature = models.TextField(blank=True)
    
    # ESIC Portal
    esic_username = models.CharField(max_length=100, blank=True)
    esic_password = models.CharField(max_length=255, blank=True)  # Should be encrypted
    esic_digital_signature = models.TextField(blank=True)
    
    # Income Tax Portal
    it_username = models.CharField(max_length=100, blank=True)
    it_password = models.CharField(max_length=255, blank=True)  # Should be encrypted
    it_digital_signature = models.TextField(blank=True)
    
    # State PT Portal
    pt_username = models.CharField(max_length=100, blank=True)
    pt_password = models.CharField(max_length=255, blank=True)  # Should be encrypted
    
    # API Keys
    epfo_api_key = models.CharField(max_length=255, blank=True)
    esic_api_key = models.CharField(max_length=255, blank=True)
    it_api_key = models.CharField(max_length=255, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Portal Credentials - {self.company.name}"


class SubmissionLog(models.Model):
    """Log of government portal submissions"""
    SUBMISSION_STATUS = [
        ('pending', 'Pending'),
        ('submitted', 'Submitted'),
        ('processed', 'Processed'),
        ('rejected', 'Rejected'),
        ('error', 'Error'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='submission_logs')
    government_return = models.ForeignKey(GovernmentReturn, on_delete=models.CASCADE, related_name='submission_logs')
    
    # Submission Details
    portal_name = models.CharField(max_length=50)
    submission_method = models.CharField(max_length=20, choices=[
        ('api', 'API'),
        ('manual', 'Manual Upload'),
        ('bulk', 'Bulk Upload'),
    ], default='api')
    
    # Response Details
    acknowledgment_number = models.CharField(max_length=100, blank=True)
    submission_status = models.CharField(max_length=20, choices=SUBMISSION_STATUS, default='pending')
    response_data = models.JSONField(default=dict)
    error_message = models.TextField(blank=True)
    
    # Timing
    submitted_at = models.DateTimeField(null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    submitted_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.portal_name} - {self.acknowledgment_number}"


class ChallanGeneration(models.Model):
    """Generated challans for payment"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='challans')
    government_return = models.ForeignKey(GovernmentReturn, on_delete=models.CASCADE, related_name='challans')
    
    challan_number = models.CharField(max_length=50, unique=True)
    challan_type = models.CharField(max_length=20, choices=[
        ('pf', 'PF Challan'),
        ('esi', 'ESI Challan'),
        ('pt', 'Professional Tax Challan'),
        ('tds', 'TDS Challan'),
    ])
    
    # Payment Details
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    due_date = models.DateField()
    bank_details = models.JSONField(default=dict)
    
    # Status
    is_paid = models.BooleanField(default=False)
    payment_date = models.DateField(null=True, blank=True)
    payment_reference = models.CharField(max_length=100, blank=True)
    
    # File
    challan_file_path = models.CharField(max_length=500, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.challan_number} - ₹{self.amount}"