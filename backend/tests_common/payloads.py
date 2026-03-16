"""
Canonical valid payloads for API tests.
Use these payloads to ensure all required fields are provided and validation passes.
"""

# Finance module payloads
VALID_CUSTOMER_PAYLOAD = {
    "customer_type": "business",  # Required: business/individual
    "name": "Test Customer",  # Required
    "display_name": "Test Customer Display",  # Required
    "email": "customer@test.com",
    "phone": "9000000000",
    "billing_address_line1": "123 Test Street",  # Required
    "billing_city": "Mumbai",  # Required
    "billing_state": "Maharashtra",  # Required
    "billing_pincode": "400001",  # Required - valid Mumbai pincode
    "billing_country": "India",
    "shipping_same_as_billing": True,  # Avoids shipping address validation
    "gstin": "27AABCU9603R1ZX",  # Required - valid GSTIN format
    "pan_number": "AABCU9603R",
    "credit_limit": "0.00",
    "currency": "INR",
    "opening_balance": "0.00",
    "bank_verification_status": "pending",
    "statement_import_enabled": False,
    "is_active": True,
    "is_gst_registered": True,
}

VALID_PRODUCT_PAYLOAD = {
    "name": "Test Product",
    "sku": "TEST001",
    "price": "100.00",
    "category": "Test Category",
    "description": "Test product description",
    "unit": "piece",
}

VALID_QUOTATION_PAYLOAD = {
    "quotation_number": "Q001",
    "total_amount": "1000.00",
    "status": "draft",
    "valid_until": "2024-12-31",
}

# HR module payloads
VALID_EMPLOYEE_PAYLOAD = {
    "first_name": "Test",
    "last_name": "Employee",
    "email": "employee@test.com",
    "phone": "9000000001",
    "employee_id": "EMP001",
    "date_of_birth": "1990-01-01",
    "date_of_joining": "2024-01-01",
    "designation": "Software Engineer",
    "department": "IT",
}

VALID_DEPARTMENT_PAYLOAD = {
    "name": "Test Department",
    "code": "TEST",
    "description": "Test department description",
}

# Inventory module payloads
VALID_INVENTORY_PRODUCT_PAYLOAD = {
    "name": "Test Inventory Product",
    "sku": "INV001",
    "category": "Test Category",
    "unit": "piece",
    "cost_price": "50.00",
    "selling_price": "100.00",
    "minimum_stock": 10,
}

VALID_SUPPLIER_PAYLOAD = {
    "name": "Test Supplier",
    "email": "supplier@test.com",
    "phone": "9000000002",
    "address": "123 Supplier Street",
    "city": "Delhi",
    "state": "Delhi",
    "pincode": "110001",
}

# CRM module payloads
VALID_LEAD_PAYLOAD = {
    "first_name": "Test",
    "last_name": "Lead",
    "email": "lead@test.com",
    "phone": "9000000003",
    "source": "website",
    "status": "new",
}

VALID_CONTACT_PAYLOAD = {
    "first_name": "Test",
    "last_name": "Contact",
    "email": "contact@test.com",
    "phone": "9000000004",
}

VALID_ACCOUNT_PAYLOAD = {
    "name": "Test Account",
    "industry": "Technology",
    "type": "prospect",
    "phone": "9000000005",
    "email": "account@test.com",
}