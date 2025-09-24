#!/usr/bin/env python3
"""
Test script to verify the authentication flow is working correctly
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_master_admin_login():
    """Test master admin login"""
    print("🔍 Testing Master Admin Login...")
    
    login_data = {
        "email": "ilaiaraja@gmail.com",
        "password": "Masteradmin@123"
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/master-admin/login/", json=login_data)
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Master Admin Login Successful!")
        print(f"   Access Token: {data['access'][:50]}...")
        print(f"   User: {data['user']['email']}")
        return data['access']
    else:
        print(f"❌ Master Admin Login Failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return None

def test_token_validation(access_token):
    """Test token validation"""
    print("\n🔍 Testing Token Validation...")
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.get(f"{BASE_URL}/api/auth/validate-token/", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Token Validation Successful!")
        print(f"   Valid: {data['valid']}")
        print(f"   User: {data['user']['email']}")
        return True
    else:
        print(f"❌ Token Validation Failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

def test_invalid_token():
    """Test with invalid token"""
    print("\n🔍 Testing Invalid Token...")
    
    headers = {
        "Authorization": "Bearer invalid_token_here"
    }
    
    response = requests.get(f"{BASE_URL}/api/auth/validate-token/", headers=headers)
    
    if response.status_code == 401:
        print("✅ Invalid Token Correctly Rejected!")
        return True
    else:
        print(f"❌ Invalid Token Test Failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

def main():
    print("🚀 Starting Authentication Flow Tests...\n")
    
    # Test 1: Master Admin Login
    access_token = test_master_admin_login()
    if not access_token:
        print("\n❌ Cannot proceed without valid access token")
        return
    
    # Test 2: Token Validation
    if not test_token_validation(access_token):
        print("\n❌ Token validation failed")
        return
    
    # Test 3: Invalid Token
    if not test_invalid_token():
        print("\n❌ Invalid token test failed")
        return
    
    print("\n🎉 All Authentication Tests Passed!")
    print("✅ The authentication flow is working correctly!")

if __name__ == "__main__":
    main()
