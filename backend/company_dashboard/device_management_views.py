from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Count, Q
from datetime import timedelta
import hashlib
import json
import requests

from .advanced_security_models import CompanyDeviceFingerprint, CompanySecurityAlert
from .security_models import CompanyUserSession
from authentication.models import CompanyUser
from authentication.permissions import IsCompanyUser

class DeviceManagementView(APIView):
    """Complete device management system"""
    permission_classes = [IsCompanyUser]
    
    def get(self, request):
        """Get all devices for the company"""
        company_user = request.user.company_user
        
        # Get all devices for the company
        devices = CompanyDeviceFingerprint.objects.filter(
            company=company_user.company
        ).order_by('-last_seen')
        
        device_data = []
        for device in devices:
            # Get location info
            location_info = self._get_location_display(device)
            
            # Calculate trust level
            trust_level = self._calculate_trust_level(device.trust_score)
            
            device_data.append({
                'device_id': device.device_id,
                'user_email': device.user.user.email,
                'browser': device.browser or 'Unknown Browser',
                'browser_version': device.browser_version or '',
                'os': device.os or 'Unknown OS',
                'platform': device.platform or '',
                'screen_resolution': device.screen_resolution or '',
                'timezone': device.timezone or '',
                'language': device.language or '',
                'ip_address': device.ip_address,
                'country': device.country or '',
                'city': device.city or '',
                'location_info': location_info,
                'is_trusted': device.is_trusted,
                'is_blocked': device.is_blocked,
                'trust_score': device.trust_score,
                'trust_level': trust_level,
                'login_count': device.login_count,
                'first_seen': device.first_seen.isoformat(),
                'last_seen': device.last_seen.isoformat(),
                'fingerprint_hash': device.fingerprint_hash[:16] + '...',  # Truncated for security
            })
        
        return Response({
            'devices': device_data,
            'total_devices': len(device_data),
            'trusted_devices': len([d for d in device_data if d['is_trusted']]),
            'blocked_devices': len([d for d in device_data if d['is_blocked']]),
            'summary': self._get_device_summary(devices)
        })
    
    def post(self, request):
        """Register or update device fingerprint"""
        company_user = request.user.company_user
        
        # Get device fingerprint data
        fingerprint_data = request.data.get('fingerprint_data', {})
        ip_address = request.data.get('ip_address') or self._get_client_ip(request)
        
        if not fingerprint_data:
            return Response({'error': 'fingerprint_data required'}, status=400)
        
        # Generate device ID and fingerprint hash
        fingerprint_hash = self._generate_fingerprint_hash(fingerprint_data)
        device_id = hashlib.md5(f"{company_user.id}_{fingerprint_hash}".encode()).hexdigest()
        
        # Check if device exists
        device, created = CompanyDeviceFingerprint.objects.get_or_create(
            company=company_user.company,
            device_id=device_id,
            defaults={
                'user': company_user,
                'fingerprint_hash': fingerprint_hash,
                'user_agent': fingerprint_data.get('userAgent', ''),
                'screen_resolution': fingerprint_data.get('screen', ''),
                'timezone': fingerprint_data.get('timezone', ''),
                'language': fingerprint_data.get('language', ''),
                'platform': fingerprint_data.get('platform', ''),
                'browser': self._extract_browser(fingerprint_data.get('userAgent', '')),
                'browser_version': self._extract_browser_version(fingerprint_data.get('userAgent', '')),
                'os': self._extract_os(fingerprint_data.get('userAgent', '')),
                'ip_address': ip_address,
                'login_count': 1,
                'trust_score': 50  # Default trust score
            }
        )
        
        if not created:
            # Update existing device
            device.last_seen = timezone.now()
            device.login_count += 1
            device.ip_address = ip_address
            device.save()
        else:
            # New device - get location and analyze risk
            self._update_device_location(device, ip_address)
            self._analyze_device_risk(device)
            
            # Create security alert for new device
            CompanySecurityAlert.objects.create(
                company=company_user.company,
                alert_type='new_device',
                title='New Device Detected',
                message=f'New device registered for {company_user.user.email}',
                user_email=company_user.user.email,
                ip_address=ip_address,
                severity='info',
                metadata={
                    'device_id': device_id,
                    'browser': device.browser,
                    'os': device.os,
                    'location': f"{device.city}, {device.country}" if device.city else device.country
                }
            )
        
        return Response({
            'device_id': device_id,
            'is_new_device': created,
            'is_trusted': device.is_trusted,
            'trust_score': device.trust_score,
            'message': 'Device registered successfully' if created else 'Device updated successfully'
        })
    
    def patch(self, request, device_id):
        """Update device trust status"""
        company_user = request.user.company_user
        
        try:
            device = CompanyDeviceFingerprint.objects.get(
                device_id=device_id,
                company=company_user.company
            )
            
            # Update trust status
            if 'is_trusted' in request.data:
                device.is_trusted = request.data['is_trusted']
                
            if 'is_blocked' in request.data:
                device.is_blocked = request.data['is_blocked']
                
                # If blocking device, terminate all sessions
                if device.is_blocked:
                    CompanyUserSession.objects.filter(
                        user=device.user
                    ).delete()
            
            device.save()
            
            return Response({'message': 'Device updated successfully'})
            
        except CompanyDeviceFingerprint.DoesNotExist:
            return Response({'error': 'Device not found'}, status=404)
    
    def delete(self, request, device_id):
        """Remove device"""
        company_user = request.user.company_user
        
        try:
            device = CompanyDeviceFingerprint.objects.get(
                device_id=device_id,
                company=company_user.company
            )
            
            # Terminate sessions for this device
            CompanyUserSession.objects.filter(
                user=device.user
            ).delete()
            
            device.delete()
            
            return Response({'message': 'Device removed successfully'})
            
        except CompanyDeviceFingerprint.DoesNotExist:
            return Response({'error': 'Device not found'}, status=404)
    
    def _get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def _generate_fingerprint_hash(self, fingerprint_data):
        """Generate hash from device fingerprint data"""
        fingerprint_string = f"{fingerprint_data.get('userAgent', '')}{fingerprint_data.get('screen', '')}{fingerprint_data.get('timezone', '')}{fingerprint_data.get('language', '')}"
        return hashlib.sha256(fingerprint_string.encode()).hexdigest()
    
    def _extract_browser(self, user_agent):
        """Extract browser name from user agent"""
        if 'Chrome' in user_agent:
            return 'Chrome'
        elif 'Firefox' in user_agent:
            return 'Firefox'
        elif 'Safari' in user_agent and 'Chrome' not in user_agent:
            return 'Safari'
        elif 'Edge' in user_agent:
            return 'Edge'
        else:
            return 'Unknown'
    
    def _extract_browser_version(self, user_agent):
        """Extract browser version from user agent"""
        import re
        
        patterns = {
            'Chrome': r'Chrome/(\d+\.\d+)',
            'Firefox': r'Firefox/(\d+\.\d+)',
            'Safari': r'Version/(\d+\.\d+)',
            'Edge': r'Edge/(\d+\.\d+)'
        }
        
        for browser, pattern in patterns.items():
            if browser in user_agent:
                match = re.search(pattern, user_agent)
                if match:
                    return match.group(1)
        
        return ''
    
    def _extract_os(self, user_agent):
        """Extract OS from user agent"""
        if 'Windows NT 10.0' in user_agent:
            return 'Windows 10/11'
        elif 'Windows NT' in user_agent:
            return 'Windows'
        elif 'Mac OS X' in user_agent:
            return 'macOS'
        elif 'Linux' in user_agent:
            return 'Linux'
        elif 'Android' in user_agent:
            return 'Android'
        elif 'iPhone' in user_agent or 'iPad' in user_agent:
            return 'iOS'
        else:
            return 'Unknown'
    
    def _update_device_location(self, device, ip_address):
        """Update device location using IP geolocation"""
        try:
            response = requests.get(f'http://ip-api.com/json/{ip_address}', timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'success':
                    device.country = data.get('country', '')
                    device.city = data.get('city', '')
                    device.save()
        except:
            pass  # Fail silently for geolocation
    
    def _analyze_device_risk(self, device):
        """Analyze device risk and assign trust score"""
        risk_score = 50  # Base score
        
        # Check for suspicious patterns
        company_devices = CompanyDeviceFingerprint.objects.filter(
            company=device.company,
            user=device.user
        ).exclude(id=device.id)
        
        if company_devices.exists():
            # Check location consistency
            known_countries = set(company_devices.values_list('country', flat=True))
            if device.country and device.country not in known_countries:
                risk_score -= 20  # New location
            
            # Check browser consistency
            known_browsers = set(company_devices.values_list('browser', flat=True))
            if device.browser and device.browser not in known_browsers:
                risk_score -= 10  # New browser
        
        # Check for rapid device creation
        recent_devices = CompanyDeviceFingerprint.objects.filter(
            company=device.company,
            user=device.user,
            first_seen__gte=timezone.now() - timedelta(hours=1)
        ).count()
        
        if recent_devices > 3:
            risk_score -= 30  # Too many new devices
        
        device.trust_score = max(0, min(100, risk_score))
        device.save()
    
    def _calculate_trust_level(self, trust_score):
        """Calculate trust level from score"""
        if trust_score >= 80:
            return 'high'
        elif trust_score >= 50:
            return 'medium'
        else:
            return 'low'
    
    def _get_location_display(self, device):
        """Get formatted location display"""
        if device.city and device.country:
            return f"{device.city}, {device.country}"
        elif device.country:
            return device.country
        else:
            return "Unknown Location"
    
    def _get_device_summary(self, devices):
        """Get device summary statistics"""
        total = devices.count()
        trusted = devices.filter(is_trusted=True).count()
        blocked = devices.filter(is_blocked=True).count()
        
        # Browser distribution
        browsers = devices.values('browser').annotate(count=Count('id')).order_by('-count')[:5]
        
        # OS distribution
        os_list = devices.values('os').annotate(count=Count('id')).order_by('-count')[:5]
        
        # Recent activity
        recent_devices = devices.filter(
            last_seen__gte=timezone.now() - timedelta(days=7)
        ).count()
        
        return {
            'total_devices': total,
            'trusted_devices': trusted,
            'blocked_devices': blocked,
            'pending_devices': total - trusted - blocked,
            'recent_activity': recent_devices,
            'browser_distribution': list(browsers),
            'os_distribution': list(os_list),
            'trust_score_avg': round(devices.aggregate(avg=Count('trust_score'))['avg'] or 0, 1)
        }
    
    def _register_device_fingerprint(self, company_user, fingerprint_data, ip_address, failed_attempt=False):
        """Register device fingerprint during login"""
        try:
            # Generate device ID and fingerprint hash
            fingerprint_hash = self._generate_fingerprint_hash(fingerprint_data)
            device_id = hashlib.md5(f"{company_user.id}_{fingerprint_hash}".encode()).hexdigest()
            
            # Check if device exists
            device, created = CompanyDeviceFingerprint.objects.get_or_create(
                company=company_user.company,
                device_id=device_id,
                defaults={
                    'user': company_user,
                    'fingerprint_hash': fingerprint_hash,
                    'user_agent': fingerprint_data.get('userAgent', ''),
                    'screen_resolution': fingerprint_data.get('screen', ''),
                    'timezone': fingerprint_data.get('timezone', ''),
                    'language': fingerprint_data.get('language', ''),
                    'platform': fingerprint_data.get('platform', ''),
                    'browser': self._extract_browser(fingerprint_data.get('userAgent', '')),
                    'browser_version': self._extract_browser_version(fingerprint_data.get('userAgent', '')),
                    'os': self._extract_os(fingerprint_data.get('userAgent', '')),
                    'ip_address': ip_address,
                    'login_count': 0 if failed_attempt else 1,
                    'trust_score': 50  # Default trust score
                }
            )
            
            if not created:
                # Update existing device
                device.last_seen = timezone.now()
                if not failed_attempt:
                    device.login_count += 1
                device.ip_address = ip_address
                device.save()
            else:
                # New device - get location and analyze risk
                self._update_device_location(device, ip_address)
                self._analyze_device_risk(device)
                
                # Create security alert for new device (only for successful logins)
                if not failed_attempt:
                    CompanySecurityAlert.objects.create(
                        company=company_user.company,
                        alert_type='new_device',
                        title='New Device Detected',
                        message=f'New device registered for {company_user.user.email}',
                        user_email=company_user.user.email,
                        ip_address=ip_address,
                        severity='info',
                        metadata={
                            'device_id': device_id,
                            'browser': device.browser,
                            'os': device.os,
                            'location': f"{device.city}, {device.country}" if device.city else device.country
                        }
                    )
            
            return device
            
        except Exception as e:
            print(f'Device fingerprinting error: {str(e)}')
            return None

@api_view(['POST'])
@permission_classes([IsCompanyUser])
def create_sample_devices(request):
    """Create sample devices for testing"""
    company_user = request.user.company_user
    
    sample_devices = [
        {
            'browser': 'Chrome', 'browser_version': '118.0', 'os': 'Windows 10/11',
            'country': 'United States', 'city': 'New York', 'trust_score': 85, 'is_trusted': True
        },
        {
            'browser': 'Firefox', 'browser_version': '119.0', 'os': 'macOS',
            'country': 'United States', 'city': 'San Francisco', 'trust_score': 75, 'is_trusted': True
        },
        {
            'browser': 'Safari', 'browser_version': '17.0', 'os': 'iOS',
            'country': 'United States', 'city': 'Los Angeles', 'trust_score': 60, 'is_trusted': False
        },
        {
            'browser': 'Chrome', 'browser_version': '118.0', 'os': 'Android',
            'country': 'Canada', 'city': 'Toronto', 'trust_score': 45, 'is_trusted': False
        },
        {
            'browser': 'Edge', 'browser_version': '118.0', 'os': 'Windows 10/11',
            'country': 'United Kingdom', 'city': 'London', 'trust_score': 30, 'is_trusted': False, 'is_blocked': True
        }
    ]
    
    created_devices = []
    for i, device_data in enumerate(sample_devices):
        device_id = f"sample_device_{i+1}_{company_user.id}"
        
        device, created = CompanyDeviceFingerprint.objects.get_or_create(
            company=company_user.company,
            device_id=device_id,
            defaults={
                'user': company_user,
                'fingerprint_hash': hashlib.sha256(f"sample_{i}_{company_user.id}".encode()).hexdigest(),
                'user_agent': f'Mozilla/5.0 ({device_data["os"]}) {device_data["browser"]}/{device_data["browser_version"]}',
                'browser': device_data['browser'],
                'browser_version': device_data['browser_version'],
                'os': device_data['os'],
                'country': device_data['country'],
                'city': device_data['city'],
                'ip_address': f'192.168.1.{100+i}',
                'trust_score': device_data['trust_score'],
                'is_trusted': device_data.get('is_trusted', False),
                'is_blocked': device_data.get('is_blocked', False),
                'login_count': i + 1,
                'screen_resolution': '1920x1080',
                'timezone': 'America/New_York',
                'language': 'en-US'
            }
        )
        
        if created:
            created_devices.append(device)
    
    return Response({
        'message': f'Created {len(created_devices)} sample devices',
        'devices_created': len(created_devices)
    })