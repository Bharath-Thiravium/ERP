"""
Secure encryption utilities for government portal credentials
"""
import os
import base64
from cryptography.fernet import Fernet
from django.conf import settings


class CredentialEncryption:
    """Secure credential encryption/decryption"""
    
    @staticmethod
    def get_encryption_key():
        """Get encryption key from environment or generate new one"""
        key = os.environ.get('PORTAL_ENCRYPTION_KEY')
        if not key:
            # Generate new key (store this securely in production)
            key = Fernet.generate_key().decode()
            print(f"Generated new encryption key: {key}")
            print("Please set PORTAL_ENCRYPTION_KEY environment variable with this key")
        
        return key.encode() if isinstance(key, str) else key
    
    @staticmethod
    def encrypt_password(password):
        """Encrypt password"""
        if not password:
            return ''
        
        key = CredentialEncryption.get_encryption_key()
        cipher = Fernet(key)
        
        # Don't re-encrypt already encrypted passwords
        if password.startswith('gAAAAAB'):
            return password
            
        return cipher.encrypt(password.encode()).decode()
    
    @staticmethod
    def decrypt_password(encrypted_password):
        """Decrypt password"""
        if not encrypted_password:
            return ''
        
        # Return plain text if not encrypted
        if not encrypted_password.startswith('gAAAAAB'):
            return encrypted_password
        
        try:
            key = CredentialEncryption.get_encryption_key()
            cipher = Fernet(key)
            return cipher.decrypt(encrypted_password.encode()).decode()
        except Exception as e:
            print(f"Decryption error: {e}")
            return ''


class SecureAPIClient:
    """Base class for secure API clients"""
    
    def __init__(self, base_url, timeout=30):
        self.base_url = base_url
        self.timeout = timeout
        self.session = None
    
    def create_session(self):
        """Create secure session with proper SSL verification"""
        import requests
        from requests.adapters import HTTPAdapter
        from urllib3.util.retry import Retry
        
        session = requests.Session()
        
        # Configure retry strategy
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        # Set security headers
        session.headers.update({
            'User-Agent': 'ATHENAS-ERP/1.0',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        })
        
        self.session = session
        return session
    
    def close_session(self):
        """Close session properly"""
        if self.session:
            self.session.close()
            self.session = None


def validate_government_credentials(portal_type, username, password):
    """Validate government portal credentials format"""
    from .security_utils import SecurityValidator
    
    # Sanitize inputs
    username = SecurityValidator.sanitize_input(username)
    password = SecurityValidator.sanitize_input(password)
    
    if not username or not password:
        return False, "Username and password are required"
    
    # Portal-specific validation
    if portal_type == 'epfo':
        if len(username) < 5:
            return False, "EPFO username must be at least 5 characters"
    elif portal_type == 'esic':
        if len(username) < 6:
            return False, "ESIC username must be at least 6 characters"
    elif portal_type == 'it':
        if len(username) < 8:
            return False, "Income Tax username must be at least 8 characters"
    
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    
    return True, "Valid credentials"


def log_portal_activity(company, portal_type, action, status, details=None):
    """Log portal activity for audit trail"""
    import logging
    
    logger = logging.getLogger('government_portal')
    
    log_data = {
        'company': company.name,
        'portal': portal_type,
        'action': action,
        'status': status,
        'details': details or {}
    }
    
    if status == 'success':
        logger.info(f"Portal Activity: {log_data}")
    else:
        logger.error(f"Portal Error: {log_data}")