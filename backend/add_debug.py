#!/usr/bin/env python3
"""
Add debug output to the failing test to see what's happening
"""

# Read the test file
with open('/var/www/SAP-Python/backend/authentication/tests/test_service_user_auth.py', 'r') as f:
    content = f.read()

# Find the failing test and add debug output
old_assertion = '''        # Debug: Print response data to see what's wrong
        print(f"Response status: {response.status_code}")
        print(f"Response data: {response.data}")
        
        if response.status_code != 201:
            print(f"Validation errors: {response.data}")
            # Try to understand what's missing
            if hasattr(response, 'data') and isinstance(response.data, dict):
                for field, errors in response.data.items():
                    print(f"Field '{field}': {errors}")
        
        self.assertEqual(response.status_code, 201, f"Expected 201, got {response.status_code}. Response: {response.data}")
        customer_id = response.data['id']'''

new_assertion = '''        # Debug: Print response data to see what's wrong
        print(f"Response status: {response.status_code}")
        print(f"Response data: {response.data}")
        print(f"Response content: {response.content}")
        
        if response.status_code != 201:
            print(f"Validation errors: {response.data}")
            # Try to understand what's missing
            if hasattr(response, 'data') and isinstance(response.data, dict):
                for field, errors in response.data.items():
                    print(f"Field '{field}': {errors}")
        
        self.assertEqual(response.status_code, 201, f"Expected 201, got {response.status_code}. Response: {response.data}")
        customer_id = response.data['id']'''

if old_assertion in content:
    content = content.replace(old_assertion, new_assertion)
    print("✅ Added debug output to test")
else:
    print("❌ Could not find the assertion to modify")

# Write the updated content back
with open('/var/www/SAP-Python/backend/authentication/tests/test_service_user_auth.py', 'w') as f:
    f.write(content)

print("✅ Debug output added to test")