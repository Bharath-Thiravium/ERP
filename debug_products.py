#!/usr/bin/env python3
"""
Debug script to check product status in the database
"""
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append('/var/www/SAP-Python/backend')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from finance.models import Product

def check_products():
    print("=== Product Status Debug ===")
    
    # Check for the specific products mentioned
    product_names = [
        "I&C AC Scope",
        "I&C DC Scope", 
        "MMS & Module Installation",
        "Fencing - Chain Link - Installation"
    ]
    
    print(f"\nChecking for specific products:")
    for name in product_names:
        products = Product.objects.filter(name__icontains=name)
        print(f"\n'{name}':")
        if products.exists():
            for product in products:
                print(f"  - ID: {product.id}")
                print(f"    Name: {product.name}")
                print(f"    Code: {product.product_code}")
                print(f"    Company: {product.company.name}")
                print(f"    Is Active: {product.is_active}")
                print(f"    Created: {product.created_at}")
        else:
            print(f"  No products found matching '{name}'")
    
    # Check overall product statistics
    print(f"\n=== Overall Product Statistics ===")
    total_products = Product.objects.count()
    active_products = Product.objects.filter(is_active=True).count()
    inactive_products = Product.objects.filter(is_active=False).count()
    
    print(f"Total Products: {total_products}")
    print(f"Active Products: {active_products}")
    print(f"Inactive Products: {inactive_products}")
    
    if inactive_products > 0:
        print(f"\n=== Inactive Products ===")
        inactive = Product.objects.filter(is_active=False)[:10]  # Show first 10
        for product in inactive:
            print(f"  - {product.product_code}: {product.name} (Company: {product.company.name})")
    
    # Check for products with similar names
    print(f"\n=== Products with 'Scope' in name ===")
    scope_products = Product.objects.filter(name__icontains='scope')
    for product in scope_products:
        print(f"  - {product.product_code}: {product.name} (Active: {product.is_active})")
    
    print(f"\n=== Products with 'Installation' in name ===")
    install_products = Product.objects.filter(name__icontains='installation')
    for product in install_products:
        print(f"  - {product.product_code}: {product.name} (Active: {product.is_active})")
    
    print(f"\n=== Products with 'Fencing' in name ===")
    fence_products = Product.objects.filter(name__icontains='fencing')
    for product in fence_products:
        print(f"  - {product.product_code}: {product.name} (Active: {product.is_active})")

if __name__ == "__main__":
    check_products()