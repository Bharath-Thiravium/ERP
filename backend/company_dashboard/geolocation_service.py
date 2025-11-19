import requests
import json
from typing import Dict, Optional
from django.core.cache import cache

class GeolocationService:
    """IP Geolocation service using ipinfo.io"""
    
    def __init__(self):
        self.base_url = "https://ipinfo.io"
        self.timeout = 5
    
    def get_location_info(self, ip_address: str) -> Dict:
        """Get location information for IP address"""
        
        # Skip private/local IPs
        if self._is_private_ip(ip_address):
            return {
                'ip': ip_address,
                'country': 'Local',
                'country_code': 'LOCAL',
                'region': 'Private Network',
                'city': 'Local',
                'timezone': 'UTC',
                'is_vpn': False,
                'is_proxy': False,
                'accuracy': 'high'
            }
        
        # Check cache first
        cache_key = f"geoip_{ip_address}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        try:
            # Call ipinfo.io API
            response = requests.get(
                f"{self.base_url}/{ip_address}/json",
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Parse response
                location_info = {
                    'ip': ip_address,
                    'country': data.get('country_name', data.get('country', 'Unknown')),
                    'country_code': data.get('country', 'XX'),
                    'region': data.get('region', 'Unknown'),
                    'city': data.get('city', 'Unknown'),
                    'timezone': data.get('timezone', 'UTC'),
                    'is_vpn': 'vpn' in data.get('hostname', '').lower(),
                    'is_proxy': 'proxy' in data.get('hostname', '').lower(),
                    'accuracy': 'high'
                }
                
                # Cache for 1 hour
                cache.set(cache_key, location_info, 3600)
                return location_info
                
        except Exception as e:
            print(f"Geolocation API error: {str(e)}")
        
        # Fallback to basic detection
        return self._fallback_detection(ip_address)
    
    def _is_private_ip(self, ip: str) -> bool:
        """Check if IP is private/local"""
        try:
            parts = ip.split('.')
            if len(parts) != 4:
                return True
                
            first = int(parts[0])
            second = int(parts[1])
            
            # Private IP ranges
            if first == 10:  # 10.0.0.0/8
                return True
            if first == 172 and 16 <= second <= 31:  # 172.16.0.0/12
                return True
            if first == 192 and second == 168:  # 192.168.0.0/16
                return True
            if first == 127:  # 127.0.0.0/8 (localhost)
                return True
                
            return False
        except:
            return True
    
    def _fallback_detection(self, ip_address: str) -> Dict:
        """Basic fallback country detection"""
        
        # Simple IP range to country mapping (major countries only)
        country_ranges = {
            'US': ['8.8.8.8', '4.4.4.4'],  # Example ranges
            'GB': ['81.', '82.', '83.'],
            'DE': ['85.', '87.'],
            'FR': ['80.', '81.'],
            'CA': ['24.', '70.'],
            'AU': ['1.', '27.'],
            'JP': ['126.', '133.'],
            'CN': ['36.', '42.', '58.'],
            'RU': ['5.', '31.', '46.'],
        }
        
        detected_country = 'Unknown'
        detected_code = 'XX'
        
        for country_code, prefixes in country_ranges.items():
            for prefix in prefixes:
                if ip_address.startswith(prefix):
                    detected_country = self._get_country_name(country_code)
                    detected_code = country_code
                    break
            if detected_country != 'Unknown':
                break
        
        return {
            'ip': ip_address,
            'country': detected_country,
            'country_code': detected_code,
            'region': 'Unknown',
            'city': 'Unknown',
            'timezone': 'UTC',
            'is_vpn': False,
            'is_proxy': False,
            'accuracy': 'low'
        }
    
    def _get_country_name(self, country_code: str) -> str:
        """Convert country code to name"""
        country_names = {
            'US': 'United States',
            'GB': 'United Kingdom', 
            'DE': 'Germany',
            'FR': 'France',
            'CA': 'Canada',
            'AU': 'Australia',
            'JP': 'Japan',
            'CN': 'China',
            'RU': 'Russia',
            'IN': 'India',
            'BR': 'Brazil',
            'IT': 'Italy',
            'ES': 'Spain',
            'NL': 'Netherlands',
            'SE': 'Sweden',
            'NO': 'Norway',
            'DK': 'Denmark',
            'FI': 'Finland',
        }
        return country_names.get(country_code, country_code)

# Global service instance
geolocation_service = GeolocationService()