from django.db import models
from django.contrib.auth.models import AbstractUser
from .models import MasterAdmin

class MasterAdminEmailSettings(models.Model):
    """Master Admin Email Configuration Settings"""
    
    PROVIDER_CHOICES = [
        ('gmail', 'Gmail'),
        ('outlook', 'Outlook/Hotmail'),
        ('yahoo', 'Yahoo Mail'),
        ('hostinger', 'Hostinger'),
        ('godaddy', 'GoDaddy'),
        ('custom', 'Custom SMTP'),
    ]
    
    master_admin = models.OneToOneField(
        MasterAdmin, 
        on_delete=models.CASCADE, 
        related_name='email_settings'
    )
    
    # Email Provider Configuration
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default='gmail')
    
    # SMTP Configuration
    smtp_host = models.CharField(max_length=255, blank=True)
    smtp_port = models.IntegerField(default=587)
    use_tls = models.BooleanField(default=True)
    use_ssl = models.BooleanField(default=False)
    
    # Authentication
    email_address = models.EmailField()
    email_password = models.CharField(max_length=255)  # Encrypted
    
    # Settings
    from_name = models.CharField(max_length=100, default='SAP System Security')
    is_active = models.BooleanField(default=True)
    
    # Tracking
    emails_sent_today = models.IntegerField(default=0)
    total_emails_sent = models.IntegerField(default=0)
    last_email_sent = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'master_admin_email_settings'
        verbose_name = 'Master Admin Email Settings'
        verbose_name_plural = 'Master Admin Email Settings'
    
    def __str__(self):
        return f"Email Settings for {self.master_admin.email}"
    
    def get_smtp_config(self):
        """Get SMTP configuration based on provider"""
        provider_configs = {
            'gmail': {
                'smtp_host': 'smtp.gmail.com',
                'smtp_port': 587,
                'use_tls': True,
                'use_ssl': False,
            },
            'outlook': {
                'smtp_host': 'smtp-mail.outlook.com',
                'smtp_port': 587,
                'use_tls': True,
                'use_ssl': False,
            },
            'yahoo': {
                'smtp_host': 'smtp.mail.yahoo.com',
                'smtp_port': 587,
                'use_tls': True,
                'use_ssl': False,
            },
            'hostinger': {
                'smtp_host': 'smtp.hostinger.com',
                'smtp_port': 587,
                'use_tls': True,
                'use_ssl': False,
            },
            'godaddy': {
                'smtp_host': 'smtpout.secureserver.net',
                'smtp_port': 587,
                'use_tls': True,
                'use_ssl': False,
            },
        }
        
        if self.provider in provider_configs:
            config = provider_configs[self.provider].copy()
        else:
            config = {
                'smtp_host': self.smtp_host,
                'smtp_port': self.smtp_port,
                'use_tls': self.use_tls,
                'use_ssl': self.use_ssl,
            }
        
        config.update({
            'email_address': self.email_address,
            'email_password': self.email_password,
            'from_name': self.from_name,
        })
        
        return config