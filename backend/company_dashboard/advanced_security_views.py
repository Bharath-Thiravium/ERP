from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db import transaction, models
from django.db.models import Count, Q
from datetime import timedelta, datetime
import json
import hashlib
import requests
from collections import defaultdict

from .advanced_security_models import (
    CompanyCaptchaSettings, CompanyDeviceFingerprint, CompanyGeolocationRule,
    CompanyThreatDetection, CompanySecurityAlert, CompanyAdvancedSettings
)
from .advanced_security_serializers import (
    CompanyCaptchaSettingsSerializer, SimpleCaptchaSerializer, CaptchaVerificationSerializer,
    CompanyDeviceFingerprintSerializer, DeviceFingerprintCreateSerializer,
    CompanyGeolocationRuleSerializer, CompanyThreatDetectionSerializer,
    CompanySecurityAlertSerializer, CompanyAdvancedSettingsSerializer,
    ThreatAnalysisSerializer, SecurityDashboardSerializer
)
from authentication.models import CompanyUser
from authentication.permissions import IsCompanyUser

class CaptchaView(APIView):
    """Captcha generation and verification"""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        """Generate captcha challenge"""
        company_id = request.query_params.get('company_id')
        if not company_id:
            return Response({'error': 'Company ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            captcha_settings = CompanyCaptchaSettings.objects.get(company_id=company_id)
        except CompanyCaptchaSettings.DoesNotExist:
            # Create default settings
            captcha_settings = CompanyCaptchaSettings.objects.create(
                company_id=company_id,
                captcha_type='simple'
            )
        
        if not captcha_settings.enabled:
            return Response({'captcha_required': False})
        
        if captcha_settings.captcha_type == 'simple':
            serializer = SimpleCaptchaSerializer()
            captcha_data = serializer.generate_captcha()
            
            # Store answer in cache for verification (in production use Redis)
            request.session[f"captcha_{captcha_data['token']}"] = captcha_data['answer']
            
            return Response({
                'captcha_required': True,
                'captcha_type': 'simple',
                'question': captcha_data['question'],
                'token': captcha_data['token']
            })
        
        elif captcha_settings.captcha_type in ['recaptcha', 'hcaptcha']:
            return Response({
                'captcha_required': True,
                'captcha_type': captcha_settings.captcha_type,
                'site_key': captcha_settings.site_key
            })
    
    def post(self, request):
        """Verify captcha response"""
        company_id = request.data.get('company_id')
        captcha_settings = CompanyCaptchaSettings.objects.get(company_id=company_id)
        
        serializer = CaptchaVerificationSerializer(
            data=request.data,
            context={'secret_key': captcha_settings.secret_key}
        )
        
        if serializer.is_valid():
            # Additional validation for simple captcha
            if serializer.validated_data['captcha_type'] == 'simple':
                token = serializer.validated_data['captcha_token']
                expected_answer = request.session.get(f"captcha_{token}")
                provided_answer = serializer.validated_data['captcha_answer']
                
                if expected_answer != provided_answer:
                    return Response({'error': 'Invalid captcha'}, status=status.HTTP_400_BAD_REQUEST)
                
                # Clean up session
                del request.session[f"captcha_{token}"]
            
            return Response({'captcha_valid': True})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DeviceFingerprintingView(APIView):
    """Device fingerprinting management"""
    permission_classes = [IsCompanyUser]
    
    def get(self, request):
        """List user's device fingerprints"""
        company_user = request.user.company_user
        devices = CompanyDeviceFingerprint.objects.filter(
            company=company_user.company,
            user=company_user
        ).order_by('-last_seen')
        
        serializer = CompanyDeviceFingerprintSerializer(devices, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Register new device fingerprint"""
        company_user = request.user.company_user
        serializer = DeviceFingerprintCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            fingerprint_data = serializer.validated_data['fingerprint_data']
            ip_address = serializer.validated_data['ip_address']
            
            # Generate device ID and fingerprint hash
            device_fingerprint = CompanyDeviceFingerprint()
            fingerprint_hash = device_fingerprint.generate_fingerprint_hash(fingerprint_data)
            device_id = hashlib.md5(f"{company_user.id}_{fingerprint_hash}".encode()).hexdigest()
            
            # Check if device already exists
            existing_device = CompanyDeviceFingerprint.objects.filter(
                company=company_user.company,
                device_id=device_id
            ).first()
            
            if existing_device:
                # Update existing device
                existing_device.last_seen = timezone.now()
                existing_device.login_count += 1
                existing_device.ip_address = ip_address
                existing_device.save()
                
                return Response({
                    'device_id': device_id,
                    'is_new_device': False,
                    'is_trusted': existing_device.is_trusted
                })
            
            # Create new device fingerprint
            device = CompanyDeviceFingerprint.objects.create(
                company=company_user.company,
                user=company_user,
                device_id=device_id,
                fingerprint_hash=fingerprint_hash,
                user_agent=fingerprint_data.get('userAgent', ''),
                screen_resolution=fingerprint_data.get('screen', ''),
                timezone=fingerprint_data.get('timezone', ''),
                language=fingerprint_data.get('language', ''),
                platform=fingerprint_data.get('platform', ''),
                browser=fingerprint_data.get('browser', ''),
                browser_version=fingerprint_data.get('browserVersion', ''),
                os=fingerprint_data.get('os', ''),
                ip_address=ip_address,
                login_count=1
            )
            
            # Get location info
            self._update_device_location(device, ip_address)
            
            # Check if this is a suspicious device
            self._analyze_device_risk(device)
            
            # Create security alert for new device
            CompanySecurityAlert.objects.create(
                company=company_user.company,
                alert_type='new_device',
                title='New Device Detected',
                message=f'New device login detected for {company_user.user.email}',
                user_email=company_user.user.email,
                ip_address=ip_address,
                metadata={
                    'device_id': device_id,
                    'browser': device.browser,
                    'os': device.os,
                    'location': f"{device.city}, {device.country}" if device.city else device.country
                },
                severity='warning'
            )
            
            return Response({
                'device_id': device_id,
                'is_new_device': True,
                'is_trusted': device.is_trusted,
                'trust_score': device.trust_score
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _update_device_location(self, device, ip_address):
        """Update device location using IP geolocation"""
        try:
            # Use a free IP geolocation service
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
        
        # If user has trusted devices, compare
        if company_devices.exists():
            # Check if location is consistent
            known_countries = set(company_devices.values_list('country', flat=True))
            if device.country and device.country not in known_countries:
                risk_score -= 20  # New location
            
            # Check if browser/OS is consistent
            known_browsers = set(company_devices.values_list('browser', flat=True))
            if device.browser and device.browser not in known_browsers:
                risk_score -= 10  # New browser
        
        # Check for rapid device creation (velocity attack)
        recent_devices = CompanyDeviceFingerprint.objects.filter(
            company=device.company,
            user=device.user,
            first_seen__gte=timezone.now() - timedelta(hours=1)
        ).count()
        
        if recent_devices > 3:
            risk_score -= 30  # Too many new devices
        
        device.trust_score = max(0, min(100, risk_score))
        device.save()

class GeolocationSecurityView(APIView):
    """Geolocation-based security rules"""
    permission_classes = [IsCompanyUser]
    
    def get(self, request):
        """List geolocation rules"""
        company_user = request.user.company_user
        rules = CompanyGeolocationRule.objects.filter(
            company=company_user.company,
            is_active=True
        )
        serializer = CompanyGeolocationRuleSerializer(rules, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Create geolocation rule"""
        company_user = request.user.company_user
        serializer = CompanyGeolocationRuleSerializer(data=request.data)
        
        if serializer.is_valid():
            rule = serializer.save(company=company_user.company)
            return Response(CompanyGeolocationRuleSerializer(rule).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, rule_id):
        """Delete geolocation rule"""
        company_user = request.user.company_user
        try:
            rule = CompanyGeolocationRule.objects.get(
                id=rule_id,
                company=company_user.company
            )
            rule.delete()
            return Response({'message': 'Rule deleted successfully'})
        except CompanyGeolocationRule.DoesNotExist:
            return Response({'error': 'Rule not found'}, status=status.HTTP_404_NOT_FOUND)

class ThreatDetectionView(APIView):
    """Advanced threat detection and monitoring"""
    permission_classes = [IsCompanyUser]
    
    def get(self, request):
        """List threat detections"""
        company_user = request.user.company_user
        threats = CompanyThreatDetection.objects.filter(
            company=company_user.company
        )
        
        # Filter by severity
        severity = request.query_params.get('severity')
        if severity:
            threats = threats.filter(severity=severity)
        
        # Filter by resolved status
        resolved = request.query_params.get('resolved')
        if resolved is not None:
            threats = threats.filter(is_resolved=resolved.lower() == 'true')
        
        # Pagination
        threats = threats[:50]
        
        serializer = CompanyThreatDetectionSerializer(threats, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Create threat detection (for testing)"""
        company_user = request.user.company_user
        serializer = CompanyThreatDetectionSerializer(data=request.data)
        
        if serializer.is_valid():
            threat = serializer.save(company=company_user.company)
            
            # Auto-response based on severity
            self._handle_threat_response(threat)
            
            return Response(CompanyThreatDetectionSerializer(threat).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _handle_threat_response(self, threat):
        """Handle automatic threat response"""
        advanced_settings = CompanyAdvancedSettings.objects.filter(
            company=threat.company
        ).first()
        
        if not advanced_settings or not advanced_settings.auto_block_threats:
            return
        
        # Auto-block for critical threats
        if threat.severity == 'critical':
            # Block user temporarily
            try:
                company_user = CompanyUser.objects.get(
                    company=threat.company,
                    user__email=threat.user_email
                )
                company_user.is_locked = True
                company_user.locked_until = timezone.now() + timedelta(
                    minutes=advanced_settings.auto_lockout_duration_minutes
                )
                company_user.save()
                
                threat.auto_blocked = True
                threat.response_actions.append('User temporarily locked')
                threat.save()
                
                # Create alert
                CompanySecurityAlert.objects.create(
                    company=threat.company,
                    alert_type='account_lockout',
                    title='Account Automatically Locked',
                    message=f'Account {threat.user_email} locked due to critical threat detection',
                    user_email=threat.user_email,
                    severity='critical',
                    metadata={'threat_id': threat.id}
                )
                
            except CompanyUser.DoesNotExist:
                pass

class SecurityAlertsView(APIView):
    """Security alerts management"""
    permission_classes = [IsCompanyUser]
    
    def get(self, request):
        """List security alerts"""
        company_user = request.user.company_user
        alerts = CompanySecurityAlert.objects.filter(
            company=company_user.company
        )
        
        # Filter by read status
        unread_only = request.query_params.get('unread_only')
        if unread_only == 'true':
            alerts = alerts.filter(is_read=False)
        
        # Filter by severity
        severity = request.query_params.get('severity')
        if severity:
            alerts = alerts.filter(severity=severity)
        
        alerts = alerts[:100]
        serializer = CompanySecurityAlertSerializer(alerts, many=True)
        return Response(serializer.data)
    
    def patch(self, request, alert_id):
        """Mark alert as read/dismissed"""
        company_user = request.user.company_user
        try:
            alert = CompanySecurityAlert.objects.get(
                id=alert_id,
                company=company_user.company
            )
            
            if 'is_read' in request.data:
                alert.is_read = request.data['is_read']
                if alert.is_read:
                    alert.read_at = timezone.now()
            
            if 'is_dismissed' in request.data:
                alert.is_dismissed = request.data['is_dismissed']
            
            alert.save()
            return Response(CompanySecurityAlertSerializer(alert).data)
            
        except CompanySecurityAlert.DoesNotExist:
            return Response({'error': 'Alert not found'}, status=status.HTTP_404_NOT_FOUND)

class AdvancedSecuritySettingsView(APIView):
    """Advanced security settings management"""
    permission_classes = [IsCompanyUser]
    
    def get(self, request):
        """Get advanced security settings"""
        company_user = request.user.company_user
        settings, created = CompanyAdvancedSettings.objects.get_or_create(
            company=company_user.company
        )
        serializer = CompanyAdvancedSettingsSerializer(settings)
        return Response(serializer.data)
    
    def patch(self, request):
        """Update advanced security settings"""
        company_user = request.user.company_user
        settings, created = CompanyAdvancedSettings.objects.get_or_create(
            company=company_user.company
        )
        
        serializer = CompanyAdvancedSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AdvancedSecurityDashboardView(APIView):
    """Advanced security dashboard with analytics"""
    permission_classes = [IsCompanyUser]
    
    def get(self, request):
        """Get advanced security dashboard data"""
        company_user = request.user.company_user
        company = company_user.company
        
        # Threat analysis
        threats = CompanyThreatDetection.objects.filter(company=company)
        threat_stats = self._get_threat_statistics(threats)
        
        # Device statistics
        device_stats = self._get_device_statistics(company)
        
        # Geolocation statistics
        geo_stats = self._get_geolocation_statistics(company)
        
        # Alert summary
        alert_summary = self._get_alert_summary(company)
        
        # Security score calculation
        security_score = self._calculate_security_score(company)
        
        # Recommendations
        recommendations = self._get_security_recommendations(company)
        
        dashboard_data = {
            'threat_analysis': threat_stats,
            'device_stats': device_stats,
            'geolocation_stats': geo_stats,
            'alert_summary': alert_summary,
            'security_score': security_score,
            'recommendations': recommendations
        }
        
        return Response(dashboard_data)
    
    def _get_threat_statistics(self, threats):
        """Calculate threat statistics"""
        total_threats = threats.count()
        
        # Threats by type
        threats_by_type = dict(
            threats.values('threat_type').annotate(count=Count('id')).values_list('threat_type', 'count')
        )
        
        # Threats by severity
        threats_by_severity = dict(
            threats.values('severity').annotate(count=Count('id')).values_list('severity', 'count')
        )
        
        # Recent threats (last 7 days)
        recent_threats = threats.filter(
            detected_at__gte=timezone.now() - timedelta(days=7)
        ).order_by('-detected_at')[:10]
        
        # Threat trend (last 30 days)
        threat_trend = []
        for i in range(30):
            date = timezone.now().date() - timedelta(days=i)
            count = threats.filter(detected_at__date=date).count()
            threat_trend.append({
                'date': date.isoformat(),
                'count': count
            })
        
        return {
            'total_threats': total_threats,
            'threats_by_type': threats_by_type,
            'threats_by_severity': threats_by_severity,
            'recent_threats': CompanyThreatDetectionSerializer(recent_threats, many=True).data,
            'threat_trend': list(reversed(threat_trend))
        }
    
    def _get_device_statistics(self, company):
        """Calculate device statistics"""
        devices = CompanyDeviceFingerprint.objects.filter(company=company)
        
        return {
            'total_devices': devices.count(),
            'trusted_devices': devices.filter(is_trusted=True).count(),
            'blocked_devices': devices.filter(is_blocked=True).count(),
            'new_devices_7d': devices.filter(
                first_seen__gte=timezone.now() - timedelta(days=7)
            ).count(),
            'avg_trust_score': devices.aggregate(
                avg_score=models.Avg('trust_score')
            )['avg_score'] or 0
        }
    
    def _get_geolocation_statistics(self, company):
        """Calculate geolocation statistics"""
        devices = CompanyDeviceFingerprint.objects.filter(company=company)
        rules = CompanyGeolocationRule.objects.filter(company=company, is_active=True)
        
        # Countries
        countries = devices.exclude(country='').values('country').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        return {
            'active_rules': rules.count(),
            'unique_countries': devices.exclude(country='').values('country').distinct().count(),
            'top_countries': list(countries),
            'blocked_locations': rules.filter(rule_type='block').count()
        }
    
    def _get_alert_summary(self, company):
        """Calculate alert summary"""
        alerts = CompanySecurityAlert.objects.filter(company=company)
        
        return {
            'total_alerts': alerts.count(),
            'unread_alerts': alerts.filter(is_read=False).count(),
            'critical_alerts': alerts.filter(severity='critical').count(),
            'alerts_24h': alerts.filter(
                created_at__gte=timezone.now() - timedelta(hours=24)
            ).count()
        }
    
    def _calculate_security_score(self, company):
        """Calculate overall security score"""
        score = 50  # Base score
        
        # Check security settings
        try:
            settings = company.advanced_security_settings
            if settings.enable_threat_detection:
                score += 15
            if settings.enable_device_fingerprinting:
                score += 15
            if settings.enable_geolocation_security:
                score += 10
        except:
            pass
        
        # Check 2FA
        try:
            if company.security_settings.two_factor_enabled:
                score += 20
        except:
            pass
        
        # Deduct for recent threats
        recent_threats = CompanyThreatDetection.objects.filter(
            company=company,
            detected_at__gte=timezone.now() - timedelta(days=7),
            severity__in=['high', 'critical']
        ).count()
        score -= min(recent_threats * 5, 30)
        
        return max(0, min(100, score))
    
    def _get_security_recommendations(self, company):
        """Generate security recommendations"""
        recommendations = []
        
        try:
            settings = company.advanced_security_settings
            
            if not settings.enable_threat_detection:
                recommendations.append({
                    'type': 'warning',
                    'title': 'Enable Threat Detection',
                    'description': 'Turn on advanced threat detection to monitor suspicious activities'
                })
            
            if not settings.enable_device_fingerprinting:
                recommendations.append({
                    'type': 'info',
                    'title': 'Enable Device Fingerprinting',
                    'description': 'Track and manage user devices for better security'
                })
                
        except:
            recommendations.append({
                'type': 'error',
                'title': 'Configure Advanced Security',
                'description': 'Set up advanced security settings to enhance protection'
            })
        
        # Check for 2FA
        try:
            if not company.security_settings.two_factor_enabled:
                recommendations.append({
                    'type': 'warning',
                    'title': 'Enable Two-Factor Authentication',
                    'description': 'Add an extra layer of security with 2FA'
                })
        except:
            pass
        
        return recommendations