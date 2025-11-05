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
from .security_utils import SecurityValidator
from .error_handlers import ComplianceError
import logging

logger = logging.getLogger(__name__)


class GovernmentPortalIntegration:
    """Integration with government portals for statutory compliance"""
    
    def __init__(self, company):
        self.company = company
        self.statutory_settings = getattr(company, 'statutory_settings', None)
    
    def submit_pf_ecr(self, return_data):
        """Submit PF ECR to EPFO portal with real API integration"""
        try:
            # Validate input data
            if not return_data or not isinstance(return_data, dict):
                raise ComplianceError("Invalid return data format", "INVALID_DATA")
            
            # Get and validate portal credentials
            try:
                credentials = PortalCredentials.objects.get(company=self.company)
                decrypted_password = credentials.get_decrypted_password('epfo')
                if not credentials.epfo_username or not decrypted_password:
                    raise ComplianceError("EPFO credentials not configured", "MISSING_CREDENTIALS")
            except PortalCredentials.DoesNotExist:
                raise ComplianceError("Portal credentials not found", "MISSING_CREDENTIALS")
            
            # Sanitize and validate payload
            establishment_code = SecurityValidator.sanitize_input(self.statutory_settings.pf_establishment_code) if self.statutory_settings else ''
            if not establishment_code:
                raise ComplianceError("PF establishment code not configured", "MISSING_CONFIG")
            
            # Use real EPFO integration
            from .real_government_integration import EPFOPortalIntegration
            epfo_client = EPFOPortalIntegration(
                establishment_code,
                credentials.epfo_username,
                credentials.get_decrypted_password('epfo')
            )
            
            # Login to EPFO portal
            if not epfo_client.login():
                raise ComplianceError("Failed to login to EPFO portal", "LOGIN_FAILED")
            
            # Submit ECR
            response = epfo_client.submit_ecr(return_data)
            
            logger.info(f"PF ECR submitted successfully for establishment {establishment_code}")
            return response
            
        except ComplianceError as e:
            logger.error(f"PF ECR submission error: {e.message}")
            return {
                'status': 'error',
                'message': e.message,
                'error_code': e.error_code
            }
        except Exception as e:
            logger.error(f"Unexpected error in PF ECR submission: {str(e)}")
            return {
                'status': 'error',
                'message': 'Failed to submit PF ECR',
                'error_code': 'SUBMISSION_ERROR'
            }
    
    def submit_esi_return(self, return_data):
        """Submit ESI return to ESIC portal with real API integration"""
        try:
            # Get and validate portal credentials
            try:
                credentials = PortalCredentials.objects.get(company=self.company)
                decrypted_password = credentials.get_decrypted_password('esic')
                if not credentials.esic_username or not decrypted_password:
                    raise ComplianceError("ESIC credentials not configured", "MISSING_CREDENTIALS")
            except PortalCredentials.DoesNotExist:
                raise ComplianceError("Portal credentials not found", "MISSING_CREDENTIALS")
            
            employer_code = SecurityValidator.sanitize_input(self.statutory_settings.esi_employer_code) if self.statutory_settings else ''
            if not employer_code:
                raise ComplianceError("ESI employer code not configured", "MISSING_CONFIG")
            
            # Use real ESIC integration
            from .real_government_integration import ESICPortalIntegration
            esic_client = ESICPortalIntegration(
                employer_code,
                credentials.esic_username,
                credentials.get_decrypted_password('esic')
            )
            
            # Login and submit
            if not esic_client.login():
                raise ComplianceError("Failed to login to ESIC portal", "LOGIN_FAILED")
            
            response = esic_client.submit_return(return_data)
            return response
            
        except ComplianceError:
            raise
        except Exception as e:
            logger.error(f"ESI submission error: {str(e)}")
            raise ComplianceError("ESI submission failed", "SUBMISSION_ERROR")
    
    def submit_pt_return(self, return_data):
        """Submit Professional Tax return to state portal with real API integration"""
        try:
            # Get and validate portal credentials
            try:
                credentials = PortalCredentials.objects.get(company=self.company)
                decrypted_password = credentials.get_decrypted_password('pt')
                if not credentials.pt_username or not decrypted_password:
                    raise ComplianceError("PT credentials not configured", "MISSING_CREDENTIALS")
            except PortalCredentials.DoesNotExist:
                raise ComplianceError("Portal credentials not found", "MISSING_CREDENTIALS")
            
            registration_number = SecurityValidator.sanitize_input(self.statutory_settings.pt_registration_number) if self.statutory_settings else ''
            if not registration_number:
                raise ComplianceError("PT registration number not configured", "MISSING_CONFIG")
            
            # Use real PT integration
            from .real_government_integration import ProfessionalTaxPortalIntegration
            pt_client = ProfessionalTaxPortalIntegration(
                registration_number,
                credentials.pt_username,
                credentials.get_decrypted_password('pt')
            )
            
            # Login and submit
            if not pt_client.login():
                raise ComplianceError("Failed to login to PT portal", "LOGIN_FAILED")
            
            response = pt_client.submit_return(return_data)
            return response
            
        except ComplianceError:
            raise
        except Exception as e:
            logger.error(f"PT submission error: {str(e)}")
            raise ComplianceError("PT submission failed", "SUBMISSION_ERROR")
    
    def submit_tds_return(self, return_data):
        """Submit TDS return to Income Tax portal with real API integration"""
        try:
            # Get and validate portal credentials
            try:
                credentials = PortalCredentials.objects.get(company=self.company)
                decrypted_password = credentials.get_decrypted_password('it')
                if not credentials.it_username or not decrypted_password:
                    raise ComplianceError("Income Tax credentials not configured", "MISSING_CREDENTIALS")
            except PortalCredentials.DoesNotExist:
                raise ComplianceError("Portal credentials not found", "MISSING_CREDENTIALS")
            
            tan_number = SecurityValidator.sanitize_input(self.statutory_settings.tan_number) if self.statutory_settings else ''
            if not tan_number:
                raise ComplianceError("TAN number not configured", "MISSING_CONFIG")
            
            # Use real Income Tax integration
            from .real_government_integration import IncomeTaxPortalIntegration
            it_client = IncomeTaxPortalIntegration(
                tan_number,
                credentials.it_username,
                credentials.get_decrypted_password('it')
            )
            
            # Login and submit
            if not it_client.login():
                raise ComplianceError("Failed to login to Income Tax portal", "LOGIN_FAILED")
            
            response = it_client.submit_tds_return(return_data)
            return response
            
        except ComplianceError:
            raise
        except Exception as e:
            logger.error(f"TDS submission error: {str(e)}")
            raise ComplianceError("TDS submission failed", "SUBMISSION_ERROR")
    
    def check_submission_status(self, acknowledgment_number, return_type):
        """Check status of submitted return with real API integration"""
        try:
            # Sanitize inputs
            ack_number = SecurityValidator.sanitize_input(acknowledgment_number)
            ret_type = SecurityValidator.sanitize_input(return_type)
            
            # Get portal credentials
            try:
                credentials = PortalCredentials.objects.get(company=self.company)
            except PortalCredentials.DoesNotExist:
                raise ComplianceError("Portal credentials not found", "MISSING_CREDENTIALS")
            
            # Route to appropriate portal based on return type
            if ret_type == 'pf_ecr':
                from .real_government_integration import EPFOPortalIntegration
                client = EPFOPortalIntegration(
                    self.statutory_settings.pf_establishment_code,
                    credentials.epfo_username,
                    credentials.get_decrypted_password('epfo')
                )
                if client.login():
                    return client.check_ecr_status(ack_number)
            elif ret_type == 'esi_return':
                from .real_government_integration import ESICPortalIntegration
                client = ESICPortalIntegration(
                    self.statutory_settings.esi_employer_code,
                    credentials.esic_username,
                    credentials.get_decrypted_password('esic')
                )
                if client.login():
                    return client.check_return_status(ack_number)
            
            raise ComplianceError("Unable to check status", "STATUS_CHECK_FAILED")
            
        except ComplianceError:
            raise
        except Exception as e:
            logger.error(f"Status check error: {str(e)}")
            raise ComplianceError("Status check failed", "STATUS_ERROR")
    
    def download_challan(self, return_type, period):
        """Download challan from government portal with real API integration"""
        try:
            # Sanitize inputs
            ret_type = SecurityValidator.sanitize_input(return_type)
            period_str = SecurityValidator.sanitize_input(period)
            
            # Get portal credentials
            try:
                credentials = PortalCredentials.objects.get(company=self.company)
            except PortalCredentials.DoesNotExist:
                raise ComplianceError("Portal credentials not found", "MISSING_CREDENTIALS")
            
            # Route to appropriate portal
            if ret_type == 'pf':
                from .real_government_integration import EPFOPortalIntegration
                client = EPFOPortalIntegration(
                    self.statutory_settings.pf_establishment_code,
                    credentials.epfo_username,
                    credentials.get_decrypted_password('epfo')
                )
                if client.login():
                    month, year = period_str.split('/')
                    challan_content = client.download_challan(int(month), int(year))
                    return {
                        'challan_number': f"PF{datetime.now().strftime('%Y%m%d%H%M%S')}",
                        'content': challan_content,
                        'return_type': ret_type,
                        'period': period_str
                    }
            
            raise ComplianceError("Challan download not supported for this return type", "UNSUPPORTED_TYPE")
            
        except ComplianceError:
            raise
        except Exception as e:
            logger.error(f"Challan download error: {str(e)}")
            raise ComplianceError("Challan download failed", "DOWNLOAD_ERROR")


class PortalCredentials(models.Model):
    """Store government portal credentials securely with encryption"""
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='portal_credentials')
    
    # EPFO Portal
    epfo_username = models.CharField(max_length=100, blank=True)
    epfo_password = models.CharField(max_length=255, blank=True)  # Encrypted
    epfo_digital_signature = models.TextField(blank=True)
    
    # ESIC Portal
    esic_username = models.CharField(max_length=100, blank=True)
    esic_password = models.CharField(max_length=255, blank=True)  # Encrypted
    esic_digital_signature = models.TextField(blank=True)
    
    # Income Tax Portal
    it_username = models.CharField(max_length=100, blank=True)
    it_password = models.CharField(max_length=255, blank=True)  # Encrypted
    it_digital_signature = models.TextField(blank=True)
    
    # State PT Portal
    pt_username = models.CharField(max_length=100, blank=True)
    pt_password = models.CharField(max_length=255, blank=True)  # Encrypted
    
    # API Keys (encrypted)
    epfo_api_key = models.CharField(max_length=255, blank=True)
    esic_api_key = models.CharField(max_length=255, blank=True)
    it_api_key = models.CharField(max_length=255, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        """Encrypt passwords before saving"""
        from .encryption_utils import CredentialEncryption
        
        # Encrypt passwords before saving
        if self.epfo_password:
            self.epfo_password = CredentialEncryption.encrypt_password(self.epfo_password)
        if self.esic_password:
            self.esic_password = CredentialEncryption.encrypt_password(self.esic_password)
        if self.it_password:
            self.it_password = CredentialEncryption.encrypt_password(self.it_password)
        if self.pt_password:
            self.pt_password = CredentialEncryption.encrypt_password(self.pt_password)
        
        super().save(*args, **kwargs)
    
    def get_decrypted_password(self, portal_type):
        """Decrypt password for use"""
        from .encryption_utils import CredentialEncryption
        
        password_field = f"{portal_type}_password"
        encrypted_password = getattr(self, password_field, '')
        
        return CredentialEncryption.decrypt_password(encrypted_password)
    
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