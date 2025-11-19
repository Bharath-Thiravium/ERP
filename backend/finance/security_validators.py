"""
Finance Security Validators
Input validation and sanitization for finance module
"""

import re
from decimal import Decimal, InvalidOperation
from django.core.exceptions import ValidationError
from django.utils.html import escape


class FinanceSecurityValidator:
    """Security validation utilities for finance module"""
    
    @staticmethod
    def validate_amount(amount):
        """Validate monetary amounts"""
        if amount is None:
            return amount
        
        try:
            # Convert to Decimal for precise monetary calculations
            decimal_amount = Decimal(str(amount))
            
            # Check for reasonable limits (max 10 million)
            if decimal_amount < 0:
                raise ValidationError("Amount cannot be negative")
            if decimal_amount > Decimal('10000000'):
                raise ValidationError("Amount exceeds maximum limit")
            
            return decimal_amount
        except (InvalidOperation, ValueError):
            raise ValidationError("Invalid amount format")
    
    @staticmethod
    def validate_customer_code(code):
        """Validate customer codes"""
        if not code:
            return code
        
        # Remove dangerous characters
        code = re.sub(r'[<>\"\\;]', '', str(code))
        
        # Limit length
        if len(code) > 20:
            raise ValidationError("Customer code too long")
        
        # Validate format (alphanumeric with hyphens and underscores)
        if not re.match(r'^[A-Za-z0-9_-]+$', code):
            raise ValidationError("Invalid customer code format")
        
        return code
    
    @staticmethod
    def validate_invoice_number(number):
        """Validate invoice numbers"""
        if not number:
            return number
        
        # Remove dangerous characters
        number = re.sub(r'[<>\"\\;]', '', str(number))
        
        # Limit length
        if len(number) > 50:
            raise ValidationError("Invoice number too long")
        
        return number
    
    @staticmethod
    def validate_email(email):
        """Validate email addresses"""
        if not email:
            return email
        
        # Basic email validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise ValidationError("Invalid email format")
        
        # Limit length
        if len(email) > 254:
            raise ValidationError("Email address too long")
        
        return email.lower()
    
    @staticmethod
    def validate_phone(phone):
        """Validate phone numbers"""
        if not phone:
            return phone
        
        # Remove non-numeric characters except + and spaces
        phone = re.sub(r'[^\d\+\s-]', '', str(phone))
        
        # Limit length
        if len(phone) > 20:
            raise ValidationError("Phone number too long")
        
        return phone
    
    @staticmethod
    def validate_gstin(gstin):
        """Validate GSTIN format"""
        if not gstin:
            return gstin
        
        # Remove spaces and convert to uppercase
        gstin = re.sub(r'\s', '', str(gstin)).upper()
        
        # GSTIN format: 15 characters (2 state code + 10 PAN + 1 entity + 1 Z + 1 checksum)
        if len(gstin) != 15:
            raise ValidationError("GSTIN must be 15 characters")
        
        # Validate format
        if not re.match(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$', gstin):
            raise ValidationError("Invalid GSTIN format")
        
        return gstin
    
    @staticmethod
    def validate_pan(pan):
        """Validate PAN format"""
        if not pan:
            return pan
        
        # Remove spaces and convert to uppercase
        pan = re.sub(r'\s', '', str(pan)).upper()
        
        # PAN format: 10 characters (5 letters + 4 digits + 1 letter)
        if len(pan) != 10:
            raise ValidationError("PAN must be 10 characters")
        
        # Validate format
        if not re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$', pan):
            raise ValidationError("Invalid PAN format")
        
        return pan
    
    @staticmethod
    def validate_text_input(text, max_length=255, field_name="Input"):
        """Validate general text input"""
        if not text:
            return text
        
        # Convert to string and strip whitespace
        text = str(text).strip()
        
        # Length validation
        if len(text) > max_length:
            raise ValidationError(f"{field_name} exceeds maximum length of {max_length}")
        
        # Remove potentially dangerous HTML/script content
        text = escape(text)
        
        # Remove SQL injection patterns
        dangerous_patterns = [
            r'union\s+select', r'drop\s+table', r'delete\s+from',
            r'insert\s+into', r'update\s+set', r'exec\s*\(',
            r'script\s*>', r'javascript:', r'onload\s*=',
            r'onerror\s*=', r'onclick\s*='
        ]
        
        text_lower = text.lower()
        for pattern in dangerous_patterns:
            if re.search(pattern, text_lower):
                raise ValidationError(f"{field_name} contains potentially dangerous content")
        
        return text
    
    @staticmethod
    def validate_percentage(percentage):
        """Validate percentage values"""
        if percentage is None:
            return percentage
        
        try:
            decimal_percentage = Decimal(str(percentage))
            
            # Check reasonable limits (0-100%)
            if decimal_percentage < 0:
                raise ValidationError("Percentage cannot be negative")
            if decimal_percentage > 100:
                raise ValidationError("Percentage cannot exceed 100%")
            
            return decimal_percentage
        except (InvalidOperation, ValueError):
            raise ValidationError("Invalid percentage format")
    
    @staticmethod
    def validate_quantity(quantity):
        """Validate quantity values"""
        if quantity is None:
            return quantity
        
        try:
            decimal_quantity = Decimal(str(quantity))
            
            # Check reasonable limits
            if decimal_quantity < 0:
                raise ValidationError("Quantity cannot be negative")
            if decimal_quantity > Decimal('1000000'):
                raise ValidationError("Quantity exceeds maximum limit")
            
            return decimal_quantity
        except (InvalidOperation, ValueError):
            raise ValidationError("Invalid quantity format")
    
    @staticmethod
    def sanitize_search_input(search_term):
        """Sanitize search input to prevent injection attacks"""
        if not search_term:
            return search_term
        
        # Convert to string and strip
        search_term = str(search_term).strip()
        
        # Limit length
        if len(search_term) > 100:
            search_term = search_term[:100]
        
        # Remove dangerous characters
        search_term = re.sub(r'[<>\"\\;\'`]', '', search_term)
        
        # Remove SQL injection patterns
        search_term = re.sub(r'\b(union|select|drop|delete|insert|update|exec|script)\b', '', search_term, flags=re.IGNORECASE)
        
        return search_term
    
    @staticmethod
    def validate_file_upload(uploaded_file):
        """Validate file uploads"""
        if not uploaded_file:
            return True
        
        # Check file size (max 5MB)
        max_size = 5 * 1024 * 1024
        if uploaded_file.size > max_size:
            raise ValidationError("File size exceeds 5MB limit")
        
        # Check file extension
        allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx']
        file_extension = '.' + uploaded_file.name.split('.')[-1].lower() if '.' in uploaded_file.name else ''
        
        if file_extension not in allowed_extensions:
            raise ValidationError(f"File type {file_extension} not allowed")
        
        # Check for malicious content in filename
        filename = uploaded_file.name
        if re.search(r'[<>\"\\;]', filename):
            raise ValidationError("Filename contains invalid characters")
        
        return True