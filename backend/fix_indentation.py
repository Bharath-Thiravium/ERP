#!/usr/bin/env python3
"""
Fix indentation issue in CustomerCreateSerializer
"""

# Read the current serializer file
with open('/var/www/SAP-Python/backend/finance/serializers.py', 'r') as f:
    content = f.read()

# Fix the indentation issue
old_line = "        def create(self, validated_data):"
new_line = "    def create(self, validated_data):"

if old_line in content:
    content = content.replace(old_line, new_line)
    print("✅ Fixed indentation for create method")
else:
    print("❌ Could not find the indentation issue to fix")

# Write the updated content back
with open('/var/www/SAP-Python/backend/finance/serializers.py', 'w') as f:
    f.write(content)

print("✅ Indentation fix applied")