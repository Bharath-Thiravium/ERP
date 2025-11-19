"""
Enhanced file upload security utilities
"""
import magic
from PIL import Image
from django.core.exceptions import ValidationError


def validate_file_security(file):
    """Enhanced file validation with magic number checking"""
    
    # Check file size (5MB limit)
    if file.size > 5 * 1024 * 1024:
        raise ValidationError('File size too large (max 5MB)')
    
    # Read file content for validation
    file.seek(0)
    file_content = file.read(1024)
    file.seek(0)
    
    # Check actual file type using magic numbers
    try:
        file_type = magic.from_buffer(file_content, mime=True)
    except:
        raise ValidationError('Unable to determine file type')
    
    # Allowed file types
    allowed_types = {
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
    
    if file_type not in allowed_types:
        raise ValidationError(f'File type {file_type} not allowed')
    
    # Additional validation for images
    if file_type.startswith('image/'):
        try:
            img = Image.open(file)
            img.verify()
            file.seek(0)  # Reset after verify
        except Exception:
            raise ValidationError('Corrupted or invalid image file')
    
    return True


def sanitize_filename(filename):
    """Sanitize filename for security"""
    import re
    import os
    
    if not filename:
        raise ValidationError('Filename cannot be empty')
    
    # Remove path separators and dangerous characters
    clean_name = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    
    # Prevent hidden files
    if clean_name.startswith('.'):
        clean_name = 'file_' + clean_name[1:]
    
    # Limit length
    name, ext = os.path.splitext(clean_name)
    if len(clean_name) > 255:
        clean_name = name[:250] + ext
    
    return clean_name