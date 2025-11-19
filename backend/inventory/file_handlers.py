"""
File upload handlers for inventory module
"""
import os
import uuid
import re
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.exceptions import ValidationError
from PIL import Image
import logging

logger = logging.getLogger(__name__)

class InventoryFileHandler:
    """Handle file uploads for inventory module"""
    
    ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
    MAX_IMAGE_DIMENSIONS = (2048, 2048)
    
    @staticmethod
    def validate_image(file):
        """Validate uploaded image file"""
        if not file:
            return
            
        # Check file size
        if file.size > InventoryFileHandler.MAX_IMAGE_SIZE:
            raise ValidationError("Image file too large. Maximum size is 5MB.")
        
        # Check file extension
        file_ext = os.path.splitext(file.name)[1].lower()
        if file_ext not in InventoryFileHandler.ALLOWED_IMAGE_EXTENSIONS:
            raise ValidationError(f"Invalid file type. Allowed: {', '.join(InventoryFileHandler.ALLOWED_IMAGE_EXTENSIONS)}")
        
        # Validate image content
        try:
            # Reset file pointer
            file.seek(0)
            img = Image.open(file)
            img.verify()
            
            # Reset file pointer again after verify
            file.seek(0)
            
            # Re-open to check dimensions (verify() closes the image)
            img = Image.open(file)
            
            # Check dimensions
            if img.size[0] > InventoryFileHandler.MAX_IMAGE_DIMENSIONS[0] or img.size[1] > InventoryFileHandler.MAX_IMAGE_DIMENSIONS[1]:
                raise ValidationError(f"Image dimensions too large. Maximum: {InventoryFileHandler.MAX_IMAGE_DIMENSIONS[0]}x{InventoryFileHandler.MAX_IMAGE_DIMENSIONS[1]}")
            
            # Reset file pointer for actual upload
            file.seek(0)
                
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Image validation error: {e}")
            raise ValidationError("Invalid image file.")
    
    @staticmethod
    def upload_product_image(file, product_id, company_id, safe_filename=None):
        """Upload product image and return file path"""
        try:
            InventoryFileHandler.validate_image(file)
            
            # Validate IDs to prevent path traversal
            try:
                product_id = int(product_id)
                company_id = int(company_id)
            except (ValueError, TypeError):
                raise ValidationError("Invalid product or company ID")
            
            # Generate secure filename
            if safe_filename:
                # Sanitize provided filename
                import re
                safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '', safe_filename)
                if not safe_filename:
                    safe_filename = f"{uuid.uuid4()}.jpg"
                filename = safe_filename
            else:
                file_ext = os.path.splitext(file.name)[1].lower()
                if file_ext not in InventoryFileHandler.ALLOWED_IMAGE_EXTENSIONS:
                    file_ext = '.jpg'  # Default extension
                filename = f"{uuid.uuid4()}{file_ext}"
            
            # Create secure upload path - prevent directory traversal
            upload_path = os.path.join('inventory', 'products', str(company_id), str(product_id), filename)
            upload_path = upload_path.replace('\\', '/').replace('../', '').replace('..\\', '')
            
            # Ensure the path is within allowed directory
            if not upload_path.startswith('inventory/products/'):
                raise ValidationError("Invalid upload path")
            
            # Save file
            file_path = default_storage.save(upload_path, file)
            
            # Return relative path for database storage
            return file_path
            
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error uploading product image: {e}")
            raise ValidationError(f"Failed to upload image: {str(e)}")
    
    @staticmethod
    def delete_product_image(file_path):
        """Delete product image file"""
        try:
            if not file_path:
                return
            
            # Validate file path to prevent directory traversal
            if '../' in file_path or '..\\' in file_path:
                logger.warning(f"Suspicious file path detected: {file_path}")
                return
            
            # Ensure path is within allowed directory
            if not file_path.startswith('inventory/products/'):
                logger.warning(f"File path outside allowed directory: {file_path}")
                return
            
            if default_storage.exists(file_path):
                default_storage.delete(file_path)
                
        except Exception as e:
            logger.error(f"Error deleting product image: {e}")