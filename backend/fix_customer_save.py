#!/usr/bin/env python3
"""
Fix CustomerCreateSerializer to properly handle company and created_by injection via save() kwargs
"""

import re

# Read the current serializer file
with open('/var/www/SAP-Python/backend/finance/serializers.py', 'r') as f:
    content = f.read()

# Find the CustomerCreateSerializer class and add a save method
# Look for the class definition
class_pattern = r'(class CustomerCreateSerializer\(serializers\.ModelSerializer\):.*?)(    def create\(self, validated_data\):)'

def replacement(match):
    class_def = match.group(1)
    create_method = match.group(2)
    
    # Add the save method before the create method
    save_method = '''    def save(self, **kwargs):
        """Override save to handle company and created_by injection from viewset"""
        # Extract company and created_by from kwargs if provided
        company = kwargs.pop('company', None)
        created_by = kwargs.pop('created_by', None)
        
        # Add them to validated_data if provided
        if company:
            self.validated_data['company'] = company
        if created_by:
            self.validated_data['created_by'] = created_by
            
        return super().save(**kwargs)

    '''
    
    return class_def + save_method + create_method

# Apply the replacement
new_content = re.sub(class_pattern, replacement, content, flags=re.DOTALL)

if new_content != content:
    print("✅ Added save() method to CustomerCreateSerializer")
    # Write the updated content back
    with open('/var/www/SAP-Python/backend/finance/serializers.py', 'w') as f:
        f.write(new_content)
    print("✅ CustomerCreateSerializer save() method fix applied")
else:
    print("❌ Could not find CustomerCreateSerializer class to modify")
    # Try to find the class
    if 'class CustomerCreateSerializer' in content:
        print("Found CustomerCreateSerializer class but pattern didn't match")
    else:
        print("CustomerCreateSerializer class not found in file")