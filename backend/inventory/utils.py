"""
Utility functions for inventory module with security enhancements
"""
import os
import logging
import uuid
import re
from django.conf import settings
from django.core.exceptions import ValidationError
from .security_validators import InventorySecurityValidator


def secure_file_upload(file_obj, upload_path):
    """
    Securely handle file uploads with validation
    """
    if not file_obj:
        return None
    
    # Validate file size (max 5MB)
    max_size = 5 * 1024 * 1024  # 5MB
    if file_obj.size > max_size:
        raise ValidationError("File size exceeds maximum limit of 5MB")
    
    # Validate file extension
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf']
    file_extension = os.path.splitext(file_obj.name)[1].lower()
    if file_extension not in allowed_extensions:
        raise ValidationError(f"File extension {file_extension} not allowed")
    
    # Sanitize filename
    try:
        # Generate secure filename to prevent path traversal
        import uuid
        import re
        
        # Extract extension
        file_extension = os.path.splitext(file_obj.name)[1].lower()
        
        # Generate secure filename
        secure_filename = f"{uuid.uuid4().hex}{file_extension}"
        
        # Validate upload path
        safe_path = InventorySecurityValidator.validate_file_path(upload_path)
        
        # Ensure path doesn't contain traversal attempts
        safe_path = safe_path.replace('../', '').replace('..\\', '')
        
        return os.path.join(safe_path, secure_filename)
    except Exception as e:
        logging.error(f"File upload error: {e}")
        raise ValidationError('Invalid file or path')


def calculate_stock_metrics(products):
    """
    Calculate stock metrics with error handling
    """
    try:
        total_value = 0
        low_stock_count = 0
        out_of_stock_count = 0
        
        for product in products:
            try:
                stock_value = product.stock_value or 0
                total_value += stock_value
                
                if product.current_stock <= 0:
                    out_of_stock_count += 1
                elif product.is_low_stock():
                    low_stock_count += 1
                    
            except Exception as e:
                logging.error(f"Error calculating metrics for product {product.id}: {e}")
                continue
        
        return {
            'total_value': total_value,
            'low_stock_count': low_stock_count,
            'out_of_stock_count': out_of_stock_count
        }
    except Exception as e:
        logging.error(f"Error calculating stock metrics: {e}")
        return {
            'total_value': 0,
            'low_stock_count': 0,
            'out_of_stock_count': 0
        }


def validate_inventory_data(data):
    """
    Validate inventory data before processing
    """
    validated_data = {}
    
    # Sanitize text fields
    text_fields = ['name', 'description', 'notes', 'address', 'contact_person']
    for field in text_fields:
        if field in data:
            validated_data[field] = InventorySecurityValidator.sanitize_input(data[field])
    
    # Validate numeric fields
    numeric_fields = ['cost_price', 'selling_price', 'quantity', 'unit_price']
    for field in numeric_fields:
        if field in data:
            validated_data[field] = InventorySecurityValidator.validate_numeric_field(
                data[field], field
            )
    
    # Validate special fields
    if 'email' in data:
        validated_data['email'] = InventorySecurityValidator.validate_email(data['email'])
    
    if 'phone' in data:
        validated_data['phone'] = InventorySecurityValidator.validate_phone(data['phone'])
    
    if 'gst_number' in data:
        validated_data['gst_number'] = InventorySecurityValidator.validate_gst_number(data['gst_number'])
    
    if 'pan_number' in data:
        validated_data['pan_number'] = InventorySecurityValidator.validate_pan_number(data['pan_number'])
    
    if 'hsn_code' in data:
        validated_data['hsn_code'] = InventorySecurityValidator.validate_hsn_code(data['hsn_code'])
    
    if 'barcode' in data:
        validated_data['barcode'] = InventorySecurityValidator.validate_barcode(data['barcode'])
    
    return validated_data


def generate_secure_filename(original_filename):
    """
    Generate secure filename to prevent path traversal
    """
    import uuid
    import os
    
    # Get file extension
    _, ext = os.path.splitext(original_filename)
    
    # Generate unique filename
    secure_name = f"{uuid.uuid4().hex}{ext}"
    
    return secure_name


def log_inventory_action(user, action, model_name, object_id, details=None):
    """
    Log inventory actions for audit trail
    """
    try:
        # Validate and sanitize inputs
        username = 'Unknown'
        if user and hasattr(user, 'username') and user.username:
            username = InventorySecurityValidator.sanitize_input(str(user.username))
        
        action = InventorySecurityValidator.sanitize_input(str(action)) if action else 'Unknown'
        model_name = InventorySecurityValidator.sanitize_input(str(model_name)) if model_name else 'Unknown'
        
        # Validate object_id
        try:
            object_id = int(object_id) if object_id else 'Unknown'
        except (ValueError, TypeError):
            object_id = 'Invalid'
        
        log_message = f"User {username} performed {action} on {model_name} {object_id}"
        if details:
            details = InventorySecurityValidator.sanitize_input(str(details)[:500])  # Limit length
            log_message += f" - Details: {details}"
        
        logging.info(log_message)
    except Exception as e:
        logging.error(f"Error logging inventory action: {e}")