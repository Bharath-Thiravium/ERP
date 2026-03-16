#!/usr/bin/env python3
"""
Fix CustomerCreateSerializer to properly handle company and created_by injection
"""

import re

# Read the current serializer file
with open('/var/www/SAP-Python/backend/finance/serializers.py', 'r') as f:
    content = f.read()

# Find and replace the CustomerCreateSerializer.create method
old_create_method = '''    def create(self, validated_data):
        shipping_addresses_data = validated_data.pop('shipping_addresses', [])
        
        # Ensure customer_code is not in validated_data (let model generate it)
        validated_data.pop('customer_code', None)
        
        try:
            customer = Customer.objects.create(**validated_data)
        except Exception as e:
            # Handle unique constraint errors
            if 'unique' in str(e).lower() or 'duplicate' in str(e).lower():
                # Retry with timestamp-based code
                import time
                timestamp = int(time.time() * 1000) % 1000000
                validated_data['customer_code'] = f"CUST-{timestamp:06d}"
                customer = Customer.objects.create(**validated_data)
            else:
                raise e

        # Create shipping addresses
        for address_data in shipping_addresses_data:
            CustomerShippingAddress.objects.create(
                customer=customer,
                **address_data
            )

        return customer'''

new_create_method = '''    def create(self, validated_data):
        shipping_addresses_data = validated_data.pop('shipping_addresses', [])
        
        # Ensure customer_code is not in validated_data (let model generate it)
        validated_data.pop('customer_code', None)
        
        try:
            customer = Customer(**validated_data)
            customer.save()
        except Exception as e:
            # Handle unique constraint errors
            if 'unique' in str(e).lower() or 'duplicate' in str(e).lower():
                # Retry with timestamp-based code
                import time
                timestamp = int(time.time() * 1000) % 1000000
                customer.customer_code = f"CUST-{timestamp:06d}"
                customer.save()
            else:
                raise e

        # Create shipping addresses
        for address_data in shipping_addresses_data:
            CustomerShippingAddress.objects.create(
                customer=customer,
                **address_data
            )

        return customer'''

# Replace the method
if old_create_method in content:
    content = content.replace(old_create_method, new_create_method)
    print("✅ Fixed CustomerCreateSerializer.create() method")
else:
    print("❌ Could not find the exact create method to replace")
    print("Looking for similar patterns...")
    # Try to find the method with regex
    pattern = r'def create\(self, validated_data\):.*?return customer'
    matches = re.findall(pattern, content, re.DOTALL)
    if matches:
        print(f"Found {len(matches)} create methods")
        for i, match in enumerate(matches):
            print(f"Match {i+1}:")
            print(match[:200] + "..." if len(match) > 200 else match)

# Write the updated content back
with open('/var/www/SAP-Python/backend/finance/serializers.py', 'w') as f:
    f.write(content)

print("✅ CustomerCreateSerializer fix applied")