#!/usr/bin/env python3
"""
Simple test for quotation template endpoint
"""

import requests
import json

def test_template_endpoint():
    """Test the template info endpoint"""
    
    print("Testing Template Info Endpoint...")
    
    try:
        # Test the endpoint
        url = "http://localhost:8000/api/company-dashboard/quotation-templates/info/"
        response = requests.get(url)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print("Response JSON:")
                print(json.dumps(data, indent=2))
            except json.JSONDecodeError:
                print("Response Text:")
                print(response.text)
        else:
            print("Response Text:")
            print(response.text[:500])  # First 500 chars
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure Django is running on localhost:8000")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_template_endpoint()