#!/usr/bin/env python
"""
Setup script for enhanced inventory features
"""
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from django.core.management import execute_from_command_line
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def setup_enhanced_inventory():
    """Setup enhanced inventory features"""
    print("🚀 Setting up enhanced inventory features...")
    
    try:
        # Run migrations
        print("📦 Running database migrations...")
        execute_from_command_line(['manage.py', 'migrate', 'inventory'])
        
        # Create media directories
        print("📁 Creating media directories...")
        media_dirs = [
            'product_images',
            'bundle_images',
            'inventory/products',
        ]
        
        for dir_name in media_dirs:
            dir_path = os.path.join(settings.MEDIA_ROOT, dir_name)
            os.makedirs(dir_path, exist_ok=True)
            print(f"   ✓ Created {dir_path}")
        
        # Set up file permissions
        print("🔐 Setting up file permissions...")
        if hasattr(settings, 'MEDIA_ROOT'):
            os.chmod(settings.MEDIA_ROOT, 0o755)
        
        print("✅ Enhanced inventory features setup completed successfully!")
        print("\n📋 New Features Added:")
        print("   • Product Image Upload System")
        print("   • Product Bundle Management")
        print("   • Cycle Counting System")
        print("   • Inventory Aging Analysis")
        print("   • Dead Stock Reporting")
        print("   • Enhanced Analytics")
        
        print("\n🔗 New API Endpoints:")
        print("   • POST /api/inventory/products/{id}/upload-image/")
        print("   • GET /api/inventory/reports/aging-analysis/")
        print("   • GET /api/inventory/reports/dead-stock/")
        print("   • GET /api/inventory/bundles/")
        print("   • GET /api/inventory/cycle-counts/")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during setup: {e}")
        logger.error(f"Enhanced inventory setup failed: {e}")
        return False

if __name__ == '__main__':
    success = setup_enhanced_inventory()
    sys.exit(0 if success else 1)