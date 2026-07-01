"""
Security validators for inventory module
"""
import re
import os
from decimal import Decimal, InvalidOperation
from html import escape
from django.core.exceptions import ValidationError
from django.utils.html import strip_tags
from urllib.parse import urlparse


class InventorySecurityValidator:
    """Comprehensive security validation for inventory module"""
    
    @staticmethod
    def sanitize_input(value):
        """Sanitize user input to prevent XSS"""
        if not value:
            return value
        
        # Convert to string and strip HTML tags
        clean_value = str(value).strip()
        clean_value = strip_tags(clean_value)
        clean_value = escape(clean_value)
        
        return clean_value
    
    @staticmethod
    def validate_file_path(file_path):
        """Validate file paths to prevent path traversal"""
        if not file_path:
            return file_path
            
        # Remove any path traversal attempts
        clean_path = os.path.normpath(file_path)
        
        # Check for path traversal patterns
        dangerous_patterns = ['../', '..\\', '../', '..\\\\', '..\\', '..']
        clean_path_lower = clean_path.lower()
        for pattern in dangerous_patterns:
            if pattern in clean_path_lower:
                raise ValidationError("Invalid file path detected")
        
        # Ensure path doesn't start with root or contain dangerous sequences
        if (clean_path.startswith('/') or 
            (len(clean_path) > 1 and clean_path[1] == ':') or
            clean_path.startswith('\\') or
            '~' in clean_path):
            raise ValidationError("Absolute paths not allowed")
            
        return clean_path
    
    @staticmethod
    def validate_json_field(json_data):
        """Validate JSON fields for security"""
        if not json_data:
            return json_data
            
        if isinstance(json_data, dict):
            sanitized = {}
            for key, value in json_data.items():
                clean_key = InventorySecurityValidator.sanitize_input(key)
                if isinstance(value, str):
                    clean_value = InventorySecurityValidator.sanitize_input(value)
                else:
                    clean_value = value
                sanitized[clean_key] = clean_value
            return sanitized
        elif isinstance(json_data, list):
            return [InventorySecurityValidator.sanitize_input(item) if isinstance(item, str) else item for item in json_data]
        
        return json_data
    
    @staticmethod
    def validate_code_field(code):
        """Validate code fields (product codes, etc.)"""
        if not code:
            return code
            
        # Allow only alphanumeric, hyphens, and underscores
        if not re.match(r'^[A-Za-z0-9\-_]+$', code):
            raise ValidationError("Code contains invalid characters")
            
        return code.upper()
    
    @staticmethod
    def validate_numeric_field(value, field_name="field"):
        """Validate numeric fields.

        Preserves Decimal precision instead of round-tripping through float:
        this value is typically reassigned onto a model's DecimalField, and
        converting to float and back introduces binary floating-point rounding
        error (e.g. 10.10 -> 10.099999999999998...) into financial/stock
        quantities.
        """
        if value is None:
            return value

        try:
            numeric_value = value if isinstance(value, Decimal) else Decimal(str(value))
            if numeric_value < 0:
                raise ValidationError(f"{field_name} cannot be negative")
            return numeric_value
        except (ValueError, TypeError, InvalidOperation):
            raise ValidationError(f"Invalid {field_name} value")
    
    @staticmethod
    def validate_email(email):
        """Validate email addresses"""
        if not email:
            return email
            
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise ValidationError("Invalid email format")
            
        return email.lower()
    
    @staticmethod
    def validate_phone(phone):
        """Validate phone numbers"""
        if not phone:
            return phone
            
        # Remove all non-digit characters
        clean_phone = re.sub(r'\D', '', phone)
        
        # Check length (10-15 digits)
        if len(clean_phone) < 10 or len(clean_phone) > 15:
            raise ValidationError("Invalid phone number length")
            
        return clean_phone
    
    @staticmethod
    def validate_gst_number(gst):
        """Validate GST number format"""
        if not gst:
            return gst
            
        gst_pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
        if not re.match(gst_pattern, gst.upper()):
            raise ValidationError("Invalid GST number format")
            
        return gst.upper()
    
    @staticmethod
    def validate_pan_number(pan):
        """Validate PAN number format"""
        if not pan:
            return pan
            
        pan_pattern = r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$'
        if not re.match(pan_pattern, pan.upper()):
            raise ValidationError("Invalid PAN number format")
            
        return pan.upper()
    
    @staticmethod
    def validate_hsn_code(hsn):
        """Validate HSN code format"""
        if not hsn:
            return hsn
            
        # HSN can be 4, 6, or 8 digits
        if not re.match(r'^\d{4}(\d{2})?(\d{2})?$', hsn):
            raise ValidationError("Invalid HSN code format")
            
        return hsn
    
    @staticmethod
    def validate_barcode(barcode):
        """Validate barcode format"""
        if not barcode:
            return barcode
            
        # Allow only digits for barcode
        if not re.match(r'^\d+$', barcode):
            raise ValidationError("Barcode must contain only digits")
            
        # Check length (8-18 digits for most barcode formats)
        if len(barcode) < 8 or len(barcode) > 18:
            raise ValidationError("Invalid barcode length")
            
        return barcode
    
    @staticmethod
    def validate_image_url(url):
        """Validate image URLs"""
        if not url:
            return url
            
        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                raise ValidationError("Invalid URL format")
                
            # Check for allowed image extensions
            allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
            if not any(url.lower().endswith(ext) for ext in allowed_extensions):
                raise ValidationError("Invalid image file extension")
                
            return url
        except Exception:
            raise ValidationError("Invalid URL format")