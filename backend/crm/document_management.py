"""
Document management system for CRM
"""
import os
import uuid
import mimetypes
from pathlib import Path
from django.db import models
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils import timezone
from authentication.models import Company, CompanyServiceUser
from .models import Lead, Contact, Account, Opportunity, Activity
import logging

logger = logging.getLogger('crm_documents')

class DocumentCategory(models.Model):
    """Document categories for organization"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='document_categories')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#3B82F6')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['company', 'name']
        ordering = ['name']
    
    def __str__(self):
        return f"{self.company.name} - {self.name}"

class Document(models.Model):
    """Document model for CRM"""
    DOCUMENT_TYPES = [
        ('contract', 'Contract'),
        ('proposal', 'Proposal'),
        ('presentation', 'Presentation'),
        ('brochure', 'Brochure'),
        ('invoice', 'Invoice'),
        ('quote', 'Quote'),
        ('email', 'Email Attachment'),
        ('note', 'Note/Memo'),
        ('image', 'Image'),
        ('other', 'Other'),
    ]
    
    ACCESS_LEVELS = [
        ('private', 'Private'),
        ('team', 'Team'),
        ('company', 'Company'),
        ('public', 'Public'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='documents')
    
    # Document details
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES, default='other')
    category = models.ForeignKey(DocumentCategory, on_delete=models.SET_NULL, null=True, blank=True)
    
    # File information
    file = models.FileField(upload_to='crm_documents/')
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField()
    mime_type = models.CharField(max_length=100)
    file_hash = models.CharField(max_length=64, unique=True)  # SHA-256 hash
    
    # Relationships
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, null=True, blank=True, related_name='documents')
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, null=True, blank=True, related_name='documents')
    account = models.ForeignKey(Account, on_delete=models.CASCADE, null=True, blank=True, related_name='documents')
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, null=True, blank=True, related_name='documents')
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, null=True, blank=True, related_name='documents')
    
    # Access control
    access_level = models.CharField(max_length=20, choices=ACCESS_LEVELS, default='private')
    shared_with = models.ManyToManyField(CompanyServiceUser, blank=True, related_name='shared_documents')
    
    # Version control
    version = models.CharField(max_length=20, default='1.0')
    parent_document = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='versions')
    is_latest_version = models.BooleanField(default=True)
    
    # Metadata
    tags = models.JSONField(default=list)
    custom_fields = models.JSONField(default=dict)
    
    # Tracking
    view_count = models.IntegerField(default=0)
    download_count = models.IntegerField(default=0)
    last_viewed = models.DateTimeField(null=True, blank=True)
    last_downloaded = models.DateTimeField(null=True, blank=True)
    
    # Audit
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, related_name='created_documents')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'document_type']),
            models.Index(fields=['company', 'created_at']),
            models.Index(fields=['file_hash']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.file_name})"
    
    def save(self, *args, **kwargs):
        # Generate file hash if not provided
        if not self.file_hash and self.file:
            import hashlib
            self.file_hash = self._generate_file_hash()
        
        # Set file metadata
        if self.file:
            self.file_name = self.file.name
            self.file_size = self.file.size
            self.mime_type = mimetypes.guess_type(self.file.name)[0] or 'application/octet-stream'
        
        super().save(*args, **kwargs)
    
    def _generate_file_hash(self):
        """Generate SHA-256 hash of file content"""
        import hashlib
        hash_sha256 = hashlib.sha256()
        
        if self.file:
            for chunk in self.file.chunks():
                hash_sha256.update(chunk)
            return hash_sha256.hexdigest()
        
        return ''
    
    @property
    def file_size_human(self):
        """Human readable file size"""
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"
    
    @property
    def is_image(self):
        """Check if document is an image"""
        return self.mime_type.startswith('image/')
    
    @property
    def is_pdf(self):
        """Check if document is a PDF"""
        return self.mime_type == 'application/pdf'
    
    def increment_view_count(self):
        """Increment view count"""
        self.view_count += 1
        self.last_viewed = timezone.now()
        self.save(update_fields=['view_count', 'last_viewed'])
    
    def increment_download_count(self):
        """Increment download count"""
        self.download_count += 1
        self.last_downloaded = timezone.now()
        self.save(update_fields=['download_count', 'last_downloaded'])

class DocumentShare(models.Model):
    """Document sharing with external users"""
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='shares')
    
    # Share details
    share_token = models.UUIDField(default=uuid.uuid4, unique=True)
    shared_with_email = models.EmailField()
    shared_with_name = models.CharField(max_length=100, blank=True)
    
    # Access control
    can_download = models.BooleanField(default=True)
    can_view_only = models.BooleanField(default=False)
    password_protected = models.BooleanField(default=False)
    password_hash = models.CharField(max_length=128, blank=True)
    
    # Expiration
    expires_at = models.DateTimeField(null=True, blank=True)
    max_downloads = models.IntegerField(null=True, blank=True)
    download_count = models.IntegerField(default=0)
    
    # Tracking
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    last_accessed = models.DateTimeField(null=True, blank=True)
    access_count = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.document.name} shared with {self.shared_with_email}"
    
    @property
    def is_expired(self):
        """Check if share is expired"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    @property
    def is_download_limit_reached(self):
        """Check if download limit is reached"""
        if self.max_downloads:
            return self.download_count >= self.max_downloads
        return False
    
    def can_access(self):
        """Check if share can be accessed"""
        return not self.is_expired and not self.is_download_limit_reached

class DocumentActivity(models.Model):
    """Track document activities"""
    ACTIVITY_TYPES = [
        ('created', 'Created'),
        ('viewed', 'Viewed'),
        ('downloaded', 'Downloaded'),
        ('shared', 'Shared'),
        ('updated', 'Updated'),
        ('deleted', 'Deleted'),
        ('version_created', 'New Version Created'),
    ]
    
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    description = models.TextField(blank=True)
    
    # User information
    user = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True, blank=True)
    user_email = models.EmailField(blank=True)  # For external users
    
    # Tracking info
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.document.name} - {self.get_activity_type_display()}"

class DocumentTemplate(models.Model):
    """Document templates for quick creation"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='document_templates')
    
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    document_type = models.CharField(max_length=20, choices=Document.DOCUMENT_TYPES)
    
    # Template file
    template_file = models.FileField(upload_to='document_templates/')
    
    # Template variables (for dynamic content)
    variables = models.JSONField(default=list)  # List of variable names
    
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.company.name} - {self.name}"

class DocumentManager:
    """Document management utilities"""
    
    @staticmethod
    def upload_document(company, file_obj, document_data, user):
        """Upload and create document"""
        try:
            # Validate file
            if not DocumentManager._validate_file(file_obj):
                return {'success': False, 'error': 'Invalid file type or size'}
            
            # Check for duplicates
            file_hash = DocumentManager._calculate_file_hash(file_obj)
            existing_doc = Document.objects.filter(
                company=company,
                file_hash=file_hash
            ).first()
            
            if existing_doc:
                return {
                    'success': False,
                    'error': 'Document already exists',
                    'existing_document_id': existing_doc.id
                }
            
            # Create document
            document = Document.objects.create(
                company=company,
                name=document_data.get('name', file_obj.name),
                description=document_data.get('description', ''),
                document_type=document_data.get('document_type', 'other'),
                category_id=document_data.get('category_id'),
                file=file_obj,
                file_hash=file_hash,
                access_level=document_data.get('access_level', 'private'),
                tags=document_data.get('tags', []),
                custom_fields=document_data.get('custom_fields', {}),
                created_by=user,
                # Relationships
                lead_id=document_data.get('lead_id'),
                contact_id=document_data.get('contact_id'),
                account_id=document_data.get('account_id'),
                opportunity_id=document_data.get('opportunity_id'),
                activity_id=document_data.get('activity_id'),
            )
            
            # Log activity
            DocumentActivity.objects.create(
                document=document,
                activity_type='created',
                description=f'Document uploaded: {document.name}',
                user=user
            )
            
            return {
                'success': True,
                'document_id': document.id,
                'message': 'Document uploaded successfully'
            }
            
        except Exception as e:
            logger.error(f"Document upload error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def _validate_file(file_obj):
        """Validate uploaded file"""
        # Check file size (max 50MB)
        max_size = 50 * 1024 * 1024  # 50MB
        if file_obj.size > max_size:
            return False
        
        # Check file type
        allowed_types = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/csv',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
        ]
        
        mime_type = mimetypes.guess_type(file_obj.name)[0]
        return mime_type in allowed_types
    
    @staticmethod
    def _calculate_file_hash(file_obj):
        """Calculate SHA-256 hash of file"""
        import hashlib
        hash_sha256 = hashlib.sha256()
        
        for chunk in file_obj.chunks():
            hash_sha256.update(chunk)
        
        # Reset file pointer
        file_obj.seek(0)
        
        return hash_sha256.hexdigest()
    
    @staticmethod
    def create_document_share(document, share_data, user):
        """Create document share"""
        try:
            share = DocumentShare.objects.create(
                document=document,
                shared_with_email=share_data['email'],
                shared_with_name=share_data.get('name', ''),
                can_download=share_data.get('can_download', True),
                can_view_only=share_data.get('can_view_only', False),
                password_protected=share_data.get('password_protected', False),
                expires_at=share_data.get('expires_at'),
                max_downloads=share_data.get('max_downloads'),
                created_by=user
            )
            
            # Set password if protected
            if share.password_protected and 'password' in share_data:
                from django.contrib.auth.hashers import make_password
                share.password_hash = make_password(share_data['password'])
                share.save()
            
            # Log activity
            DocumentActivity.objects.create(
                document=document,
                activity_type='shared',
                description=f'Document shared with {share.shared_with_email}',
                user=user
            )
            
            return {
                'success': True,
                'share_token': str(share.share_token),
                'share_url': f"{settings.FRONTEND_URL}/shared-document/{share.share_token}"
            }
            
        except Exception as e:
            logger.error(f"Document share error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def create_document_version(original_document, file_obj, version_data, user):
        """Create new version of document"""
        try:
            # Mark previous version as not latest
            original_document.is_latest_version = False
            original_document.save()
            
            # Create new version
            new_version = Document.objects.create(
                company=original_document.company,
                name=original_document.name,
                description=version_data.get('description', original_document.description),
                document_type=original_document.document_type,
                category=original_document.category,
                file=file_obj,
                file_hash=DocumentManager._calculate_file_hash(file_obj),
                access_level=original_document.access_level,
                version=version_data.get('version', '2.0'),
                parent_document=original_document,
                is_latest_version=True,
                tags=original_document.tags,
                custom_fields=original_document.custom_fields,
                created_by=user,
                # Copy relationships
                lead=original_document.lead,
                contact=original_document.contact,
                account=original_document.account,
                opportunity=original_document.opportunity,
                activity=original_document.activity,
            )
            
            # Log activity
            DocumentActivity.objects.create(
                document=new_version,
                activity_type='version_created',
                description=f'New version {new_version.version} created',
                user=user
            )
            
            return {
                'success': True,
                'document_id': new_version.id,
                'version': new_version.version
            }
            
        except Exception as e:
            logger.error(f"Document version error: {str(e)}")
            return {'success': False, 'error': str(e)}