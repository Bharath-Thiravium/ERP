"""
File upload handlers for inventory module
"""
import os
import uuid
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
            img = Image.open(file)
            img.verify()
            
            # Check dimensions
            if img.size[0] > InventoryFileHandler.MAX_IMAGE_DIMENSIONS[0] or img.size[1] > InventoryFileHandler.MAX_IMAGE_DIMENSIONS[1]:
                raise ValidationError(f"Image dimensions too large. Maximum: {InventoryFileHandler.MAX_IMAGE_DIMENSIONS[0]}x{InventoryFileHandler.MAX_IMAGE_DIMENSIONS[1]}")
                
        except Exception as e:
            raise ValidationError("Invalid image file.")
    
    @staticmethod
    def upload_product_image(file, product_id, company_id):
        """Upload product image and return file path"""
        try:
            InventoryFileHandler.validate_image(file)
            
            # Generate unique filename
            file_ext = os.path.splitext(file.name)[1].lower()
            filename = f"{uuid.uuid4()}{file_ext}"
            
            # Create upload path
            upload_path = f"inventory/products/{company_id}/{product_id}/{filename}"
            
            # Save file
            file_path = default_storage.save(upload_path, file)
            
            # Return relative path for database storage
            return file_path
            
        except Exception as e:
            logger.error(f"Error uploading product image: {e}")
            raise ValidationError(f"Failed to upload image: {str(e)}")
    
    @staticmethod
    def delete_product_image(file_path):
        """Delete product image file"""
        try:
            if file_path and default_storage.exists(file_path):
                default_storage.delete(file_path)
        except Exception as e:
            logger.error(f"Error deleting product image: {e}")