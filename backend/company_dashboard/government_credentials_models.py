from django.db import models
from django.core.exceptions import ValidationError
from authentication.models import Company
from cryptography.fernet import Fernet
from django.conf import settings
import base64
import os

class CompanyGovernmentCredentials(models.Model):
    """Secure storage for government API credentials per company"""
    
    API_TYPES = [
        ('gst', 'GST API'),
        ('tds', 'TDS/Income Tax API'),
        ('einvoice', 'E-Invoice API'),
        ('eway_bill', 'E-Way Bill API'),
        ('pf', 'PF API'),
        ('esi', 'ESI API'),
    ]
    
    ENVIRONMENTS = [
        ('sandbox', 'Sandbox/Testing'),
        ('production', 'Production'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='government_credentials')
    api_type = models.CharField(max_length=20, choices=API_TYPES)
    environment = models.CharField(max_length=20, choices=ENVIRONMENTS, default='sandbox')
    
    # Basic Info
    credential_name = models.CharField(max_length=100, help_text="Friendly name for this credential set")
    description = models.TextField(blank=True, help_text="Description or notes about this credential")
    
    # Encrypted Credentials
    client_id = models.TextField(blank=True, help_text="Encrypted client ID")
    client_secret = models.TextField(blank=True, help_text="Encrypted client secret")
    username = models.TextField(blank=True, help_text="Encrypted username")
    password = models.TextField(blank=True, help_text="Encrypted password")
    api_key = models.TextField(blank=True, help_text="Encrypted API key")
    
    # Company Identifiers (encrypted)
    gstin = models.TextField(blank=True, help_text="Encrypted GSTIN")
    pan = models.TextField(blank=True, help_text="Encrypted PAN")
    tan = models.TextField(blank=True, help_text="Encrypted TAN")
    
    # API Configuration
    base_url = models.URLField(blank=True, help_text="API base URL")
    additional_config = models.JSONField(default=dict, help_text="Additional API configuration")
    
    # Status and Validation
    is_active = models.BooleanField(default=False)
    is_validated = models.BooleanField(default=False)
    last_validated = models.DateTimeField(null=True, blank=True)
    validation_error = models.TextField(blank=True)
    
    # Usage Tracking
    last_used = models.DateTimeField(null=True, blank=True)
    usage_count = models.IntegerField(default=0)
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.EmailField(help_text="Email of user who created this credential")
    
    class Meta:
        unique_together = ['company', 'api_type', 'environment']
        verbose_name = 'Company Government Credential'
        verbose_name_plural = 'Company Government Credentials'
        db_table = 'company_government_credentials'
    
    def __str__(self):
        return f"{self.company.name} - {self.get_api_type_display()} ({self.environment})"
    
    @staticmethod
    def _get_encryption_key():
        """Get encryption key for sensitive data"""
        key = getattr(settings, 'GOVERNMENT_API_ENCRYPTION_KEY', None)
        if not key:
            # Use a default key for development (in production, this should be from environment)
            key = base64.urlsafe_b64encode(b'government_api_key_32_chars_long!')
        if isinstance(key, str):
            key = key.encode()
        return key
    
    def _encrypt_data(self, data):
        """Encrypt sensitive data"""
        if not data:
            return ''
        try:
            key = self._get_encryption_key()
            f = Fernet(key)
            encrypted_data = f.encrypt(data.encode())
            return base64.b64encode(encrypted_data).decode()
        except Exception:
            return data  # Fallback to plain text if encryption fails
    
    def _decrypt_data(self, encrypted_data):
        """Decrypt sensitive data"""
        if not encrypted_data:
            return ''
        try:
            key = self._get_encryption_key()
            f = Fernet(key)
            decoded_data = base64.b64decode(encrypted_data.encode())
            return f.decrypt(decoded_data).decode()
        except Exception:
            return encrypted_data  # Return as-is if decryption fails
    
    def _is_encrypted(self, data):
        """Check if data is already encrypted"""
        if not data:
            return False
        try:
            base64.b64decode(data.encode())
            return True
        except Exception:
            return False
    
    def save(self, *args, **kwargs):
        """Override save to encrypt sensitive fields"""
        # Encrypt fields if they're not already encrypted
        if self.client_id and not self._is_encrypted(self.client_id):
            self.client_id = self._encrypt_data(self.client_id)
        
        if self.client_secret and not self._is_encrypted(self.client_secret):
            self.client_secret = self._encrypt_data(self.client_secret)
        
        if self.username and not self._is_encrypted(self.username):
            self.username = self._encrypt_data(self.username)
        
        if self.password and not self._is_encrypted(self.password):
            self.password = self._encrypt_data(self.password)
        
        if self.api_key and not self._is_encrypted(self.api_key):
            self.api_key = self._encrypt_data(self.api_key)
        
        if self.gstin and not self._is_encrypted(self.gstin):
            self.gstin = self._encrypt_data(self.gstin)
        
        if self.pan and not self._is_encrypted(self.pan):
            self.pan = self._encrypt_data(self.pan)
        
        if self.tan and not self._is_encrypted(self.tan):
            self.tan = self._encrypt_data(self.tan)
        
        super().save(*args, **kwargs)
    
    # Getter methods for decrypted data
    def get_client_id(self):
        return self._decrypt_data(self.client_id)
    
    def get_client_secret(self):
        return self._decrypt_data(self.client_secret)
    
    def get_username(self):
        return self._decrypt_data(self.username)
    
    def get_password(self):
        return self._decrypt_data(self.password)
    
    def get_api_key(self):
        return self._decrypt_data(self.api_key)
    
    def get_gstin(self):
        return self._decrypt_data(self.gstin)
    
    def get_pan(self):
        return self._decrypt_data(self.pan)
    
    def get_tan(self):
        return self._decrypt_data(self.tan)
    
    # Setter methods for encrypted data
    def set_client_id(self, value):
        self.client_id = self._encrypt_data(value) if value else ''
    
    def set_client_secret(self, value):
        self.client_secret = self._encrypt_data(value) if value else ''
    
    def set_username(self, value):
        self.username = self._encrypt_data(value) if value else ''
    
    def set_password(self, value):
        self.password = self._encrypt_data(value) if value else ''
    
    def set_api_key(self, value):
        self.api_key = self._encrypt_data(value) if value else ''
    
    def set_gstin(self, value):
        self.gstin = self._encrypt_data(value) if value else ''
    
    def set_pan(self, value):
        self.pan = self._encrypt_data(value) if value else ''
    
    def set_tan(self, value):
        self.tan = self._encrypt_data(value) if value else ''
    
    def get_credentials_dict(self):
        """Get all credentials as decrypted dictionary"""
        return {
            'client_id': self.get_client_id(),
            'client_secret': self.get_client_secret(),
            'username': self.get_username(),
            'password': self.get_password(),
            'api_key': self.get_api_key(),
            'gstin': self.get_gstin(),
            'pan': self.get_pan(),
            'tan': self.get_tan(),
            'base_url': self.base_url,
            'additional_config': self.additional_config
        }
    
    def clean(self):
        """Validate credentials based on API type"""
        if self.api_type == 'gst':
            if not (self.get_client_id() and self.get_client_secret() and self.get_username() and self.get_gstin()):
                raise ValidationError("GST API requires client_id, client_secret, username, and GSTIN")
        
        elif self.api_type == 'tds':
            if not (self.get_username() and self.get_password() and self.get_pan() and self.get_tan()):
                raise ValidationError("TDS API requires username, password, PAN, and TAN")
        
        elif self.api_type == 'einvoice':
            if not (self.get_client_id() and self.get_client_secret() and self.get_gstin()):
                raise ValidationError("E-Invoice API requires client_id, client_secret, and GSTIN")

class CompanyGovernmentCredentialLog(models.Model):
    """Audit log for government credential operations"""
    
    ACTION_TYPES = [
        ('create', 'Created'),
        ('update', 'Updated'),
        ('delete', 'Deleted'),
        ('validate', 'Validated'),
        ('use', 'Used'),
        ('activate', 'Activated'),
        ('deactivate', 'Deactivated'),
    ]
    
    credential = models.ForeignKey(CompanyGovernmentCredentials, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_TYPES)
    user_email = models.EmailField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    details = models.TextField(blank=True)
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Government Credential Log'
        verbose_name_plural = 'Government Credential Logs'
        db_table = 'company_government_credential_logs'
    
    def __str__(self):
        return f"{self.credential} - {self.action} by {self.user_email}"