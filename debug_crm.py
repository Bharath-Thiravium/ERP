#!/usr/bin/env python3
import requests
import json

session_key = "vxwhNYqH37vmg3ifZDgup4WmPhgPhQxJdMATOoKn"
base_url = "http://localhost:8000"

# Test lead creation
lead_data = {
    "first_name": "Test",
    "last_name": "User", 
    "email": "test@example.com"
}

try:
    response = requests.post(
        f"{base_url}/api/crm/leads/",
        json=lead_data,
        params={"session_key": session_key},
        timeout=10
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")