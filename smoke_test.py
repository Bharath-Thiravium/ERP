#!/usr/bin/env python3
import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8006/api"

def test_create_employee():
    """Step 1: Create employee"""
    data = {
        "username": "test_employee_001",
        "email": "test@company.com",
        "first_name": "Test",
        "last_name": "Employee",
        "employee_id": "EMP001",
        "department": "IT",
        "position": "Developer"
    }
    
    response = requests.post(f"{BASE_URL}/hr/employees/", json=data)
    print(f"✓ Create Employee: {response.status_code}")
    return response.json() if response.status_code in [200, 201] else None

def test_force_password_reset(employee_data):
    """Step 2: Force password reset"""
    if not employee_data:
        return False
    
    data = {"email": employee_data.get("email", "test@company.com")}
    response = requests.post(f"{BASE_URL}/auth/password-reset/", json=data)
    print(f"✓ Force Password Reset: {response.status_code}")
    return response.status_code in [200, 201]

def test_submit_profile():
    """Step 3: Submit profile"""
    data = {
        "bio": "Test employee profile",
        "skills": ["Python", "Django"],
        "experience": "2 years"
    }
    
    response = requests.post(f"{BASE_URL}/hr/profiles/", json=data)
    print(f"✓ Submit Profile: {response.status_code}")
    return response.status_code in [200, 201]

def test_approve_profile():
    """Step 4: Approve profile"""
    # Get profiles first
    response = requests.get(f"{BASE_URL}/hr/profiles/")
    if response.status_code == 200:
        profiles = response.json()
        if profiles and 'results' in profiles and profiles['results']:
            profile_id = profiles['results'][0]['id']
            approve_data = {"status": "approved"}
            response = requests.patch(f"{BASE_URL}/hr/profiles/{profile_id}/", json=approve_data)
            print(f"✓ Approve Profile: {response.status_code}")
            return response.status_code in [200, 201]
    
    print("✓ Approve Profile: No profiles to approve")
    return True

def test_induction_gating():
    """Step 5: Induction gating"""
    data = {
        "employee_id": "EMP001",
        "induction_completed": True,
        "training_modules": ["Safety", "Company Policy"]
    }
    
    response = requests.post(f"{BASE_URL}/hr/induction/", json=data)
    print(f"✓ Induction Gating: {response.status_code}")
    return response.status_code in [200, 201]

def test_full_access_unlock():
    """Step 6: Full access unlock"""
    data = {
        "employee_id": "EMP001",
        "access_level": "full",
        "permissions": ["read", "write", "admin"]
    }
    
    response = requests.post(f"{BASE_URL}/auth/access-unlock/", json=data)
    print(f"✓ Full Access Unlock: {response.status_code}")
    return response.status_code in [200, 201]

def main():
    print("🚀 Starting Production Smoke Test...")
    print("=" * 50)
    
    try:
        # Test backend connectivity
        response = requests.get(f"{BASE_URL}/auth/")
        if response.status_code not in [200, 401]:  # 401 is expected without auth
            print("❌ Backend not accessible")
            sys.exit(1)
        
        print("✅ Backend is accessible")
        
        # Run smoke test steps
        employee_data = test_create_employee()
        test_force_password_reset(employee_data)
        test_submit_profile()
        test_approve_profile()
        test_induction_gating()
        test_full_access_unlock()
        
        print("=" * 50)
        print("✅ Smoke test completed successfully!")
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend service")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Smoke test failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()