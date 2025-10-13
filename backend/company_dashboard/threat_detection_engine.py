"""
AI-Enhanced Threat Detection Engine
Combines traditional rule-based detection with machine learning
"""
import numpy as np
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Count, Q
from collections import defaultdict, deque
import hashlib
import json
import math
from typing import Dict, List, Tuple, Optional

from .advanced_security_models import CompanyThreatDetection, CompanySecurityAlert
from .security_models import CompanySecurityLog, CompanyUserSession
from authentication.models import CompanyUser, Company

class ThreatDetectionEngine:
    """AI-Enhanced Threat Detection Engine"""
    
    def __init__(self, company: Company):
        self.company = company
        self.threat_cache = {}
        self.user_profiles = {}
        
    def analyze_login_attempt(self, user_email: str, ip_address: str, 
                            user_agent: str, success: bool, **kwargs) -> List[Dict]:
        """Comprehensive login attempt analysis"""
        threats = []
        
        # Traditional rule-based detection
        threats.extend(self._detect_brute_force(user_email, ip_address, success))
        threats.extend(self._detect_velocity_attack(user_email, ip_address))
        threats.extend(self._detect_suspicious_location(user_email, ip_address))
        threats.extend(self._detect_device_anomaly(user_email, user_agent))
        threats.extend(self._detect_time_anomaly(user_email))
        
        # AI-based behavioral analysis
        threats.extend(self._ai_behavioral_analysis(user_email, ip_address, user_agent))
        
        # Create threat records
        for threat in threats:
            self._create_threat_record(threat, user_email, ip_address, user_agent)
            
        return threats
    
    def _detect_brute_force(self, user_email: str, ip_address: str, success: bool) -> List[Dict]:
        """Detect brute force attacks"""
        threats = []
        
        # Check failed attempts in last 15 minutes
        recent_failures = CompanySecurityLog.objects.filter(
            company=self.company,
            user_email=user_email,
            action='failed_login',
            timestamp__gte=timezone.now() - timedelta(minutes=15)
        ).count()
        
        # IP-based brute force
        ip_failures = CompanySecurityLog.objects.filter(
            company=self.company,
            ip_address=ip_address,
            action='failed_login',
            timestamp__gte=timezone.now() - timedelta(minutes=15)
        ).count()
        
        if recent_failures >= 2:  # Lowered from 5 to 2 for testing
            threats.append({
                'type': 'brute_force',
                'severity': 'high' if recent_failures >= 5 else 'medium',
                'description': f'Brute force attack detected: {recent_failures} failed attempts',
                'evidence': {'failed_attempts': recent_failures, 'timeframe': '15_minutes'},
                'confidence': min(0.9, recent_failures / 15)
            })
            
        if ip_failures >= 10:
            threats.append({
                'type': 'brute_force',
                'severity': 'critical',
                'description': f'IP-based brute force: {ip_failures} attempts from {ip_address}',
                'evidence': {'ip_failures': ip_failures, 'ip_address': ip_address},
                'confidence': 0.95
            })
            
        return threats
    
    def _detect_velocity_attack(self, user_email: str, ip_address: str) -> List[Dict]:
        """Detect velocity-based attacks"""
        threats = []
        
        # Check login frequency (successful + failed)
        recent_attempts = CompanySecurityLog.objects.filter(
            company=self.company,
            user_email=user_email,
            action__in=['login', 'failed_login'],
            timestamp__gte=timezone.now() - timedelta(minutes=5)
        ).count()
        
        if recent_attempts >= 3:  # Lowered from 8 to 3 for testing
            threats.append({
                'type': 'velocity_attack',
                'severity': 'high',
                'description': f'High velocity login attempts: {recent_attempts} in 5 minutes',
                'evidence': {'attempts_count': recent_attempts, 'timeframe': '5_minutes'},
                'confidence': 0.85
            })
            
        return threats
    
    def _detect_suspicious_location(self, user_email: str, ip_address: str) -> List[Dict]:
        """Detect suspicious geographic locations"""
        threats = []
        
        try:
            # Get user's historical locations
            historical_ips = set(
                CompanySecurityLog.objects.filter(
                    company=self.company,
                    user_email=user_email,
                    action='login',
                    timestamp__gte=timezone.now() - timedelta(days=30)
                ).values_list('ip_address', flat=True)
            )
            
            # Check if this is a new IP
            if ip_address not in historical_ips and len(historical_ips) > 0:
                # Get location info (simplified - in production use proper geolocation)
                location_risk = self._calculate_location_risk(ip_address, historical_ips)
                
                if location_risk > 0.7:
                    threats.append({
                        'type': 'suspicious_location',
                        'severity': 'medium',
                        'description': f'Login from suspicious location: {ip_address}',
                        'evidence': {'new_ip': ip_address, 'risk_score': location_risk},
                        'confidence': location_risk
                    })
                    
        except Exception:
            pass  # Fail silently for location detection
            
        return threats
    
    def _detect_device_anomaly(self, user_email: str, user_agent: str) -> List[Dict]:
        """Detect device-based anomalies"""
        threats = []
        
        # Get user's historical user agents
        historical_agents = set(
            CompanySecurityLog.objects.filter(
                company=self.company,
                user_email=user_email,
                action='login',
                timestamp__gte=timezone.now() - timedelta(days=30)
            ).values_list('user_agent', flat=True)
        )
        
        # Check for completely new user agent
        if user_agent not in historical_agents and len(historical_agents) > 0:
            # Calculate device similarity
            similarity = self._calculate_device_similarity(user_agent, historical_agents)
            
            if similarity < 0.3:  # Very different device
                threats.append({
                    'type': 'device_anomaly',
                    'severity': 'medium',
                    'description': 'Login from unrecognized device',
                    'evidence': {'new_user_agent': user_agent, 'similarity': similarity},
                    'confidence': 1 - similarity
                })
                
        return threats
    
    def _detect_time_anomaly(self, user_email: str) -> List[Dict]:
        """Detect time-based anomalies"""
        threats = []
        
        current_hour = timezone.now().hour
        
        # Get user's typical login hours
        login_hours = list(
            CompanySecurityLog.objects.filter(
                company=self.company,
                user_email=user_email,
                action='login',
                timestamp__gte=timezone.now() - timedelta(days=30)
            ).extra(select={'hour': 'EXTRACT(hour FROM timestamp)'})
            .values_list('hour', flat=True)
        )
        
        if len(login_hours) >= 5:  # Need sufficient data
            # Calculate hour frequency
            hour_freq = defaultdict(int)
            for hour in login_hours:
                hour_freq[int(hour)] += 1
                
            # Check if current hour is unusual
            current_freq = hour_freq.get(current_hour, 0)
            avg_freq = sum(hour_freq.values()) / len(hour_freq)
            
            if current_freq == 0 and len(hour_freq) >= 3:  # Never logged in at this hour
                threats.append({
                    'type': 'time_anomaly',
                    'severity': 'low',
                    'description': f'Login at unusual time: {current_hour}:00',
                    'evidence': {'login_hour': current_hour, 'typical_hours': list(hour_freq.keys())},
                    'confidence': 0.6
                })
                
        return threats
    
    def _ai_behavioral_analysis(self, user_email: str, ip_address: str, user_agent: str) -> List[Dict]:
        """AI-based behavioral analysis"""
        threats = []
        
        # Get user profile
        profile = self._get_user_profile(user_email)
        
        # Calculate behavioral score
        behavior_score = self._calculate_behavioral_score(user_email, ip_address, user_agent, profile)
        
        if behavior_score > 0.8:  # High anomaly score
            threats.append({
                'type': 'behavioral_anomaly',
                'severity': 'high' if behavior_score > 0.9 else 'medium',
                'description': f'Behavioral anomaly detected (score: {behavior_score:.2f})',
                'evidence': {'behavior_score': behavior_score, 'profile_data': profile},
                'confidence': behavior_score
            })
            
        return threats
    
    def _get_user_profile(self, user_email: str) -> Dict:
        """Get or create user behavioral profile"""
        if user_email not in self.user_profiles:
            # Build profile from historical data
            logs = CompanySecurityLog.objects.filter(
                company=self.company,
                user_email=user_email,
                action='login',
                timestamp__gte=timezone.now() - timedelta(days=90)
            ).order_by('-timestamp')[:100]
            
            profile = {
                'typical_hours': [],
                'typical_ips': [],
                'typical_agents': [],
                'login_frequency': 0,
                'last_updated': timezone.now()
            }
            
            if logs.exists():
                # Extract patterns
                profile['typical_hours'] = list(set(
                    log.timestamp.hour for log in logs
                ))
                profile['typical_ips'] = list(set(
                    log.ip_address for log in logs
                ))
                profile['typical_agents'] = list(set(
                    log.user_agent for log in logs if log.user_agent
                ))
                profile['login_frequency'] = logs.count() / 90  # per day
                
            self.user_profiles[user_email] = profile
            
        return self.user_profiles[user_email]
    
    def _calculate_behavioral_score(self, user_email: str, ip_address: str, 
                                  user_agent: str, profile: Dict) -> float:
        """Calculate behavioral anomaly score using AI-like algorithms"""
        anomaly_score = 0.0
        factors = 0
        
        current_hour = timezone.now().hour
        
        # Time-based anomaly
        if profile['typical_hours']:
            hour_distances = [abs(current_hour - h) for h in profile['typical_hours']]
            min_distance = min(hour_distances)
            time_anomaly = min(1.0, min_distance / 12)  # Normalize to 0-1
            anomaly_score += time_anomaly * 0.3
            factors += 1
            
        # IP-based anomaly
        if profile['typical_ips']:
            if ip_address not in profile['typical_ips']:
                # Calculate IP similarity (simplified)
                ip_anomaly = 0.7  # New IP gets high anomaly
                anomaly_score += ip_anomaly * 0.4
            factors += 1
            
        # User agent anomaly
        if profile['typical_agents']:
            agent_similarity = max([
                self._calculate_device_similarity(user_agent, [agent])
                for agent in profile['typical_agents']
            ]) if profile['typical_agents'] else 0
            
            agent_anomaly = 1 - agent_similarity
            anomaly_score += agent_anomaly * 0.3
            factors += 1
            
        return anomaly_score / max(1, factors)
    
    def _calculate_location_risk(self, ip_address: str, historical_ips: set) -> float:
        """Calculate location-based risk score"""
        # Simplified location risk calculation
        # In production, use proper geolocation services
        
        # Check if IP is in same subnet as historical IPs
        ip_parts = ip_address.split('.')
        for hist_ip in historical_ips:
            hist_parts = hist_ip.split('.')
            if len(ip_parts) == 4 and len(hist_parts) == 4:
                # Same /24 subnet
                if ip_parts[:3] == hist_parts[:3]:
                    return 0.1  # Low risk
                # Same /16 subnet
                if ip_parts[:2] == hist_parts[:2]:
                    return 0.3  # Medium risk
                    
        return 0.8  # High risk for completely different IP ranges
    
    def _calculate_device_similarity(self, user_agent: str, historical_agents: List[str]) -> float:
        """Calculate device similarity score"""
        if not historical_agents:
            return 0.0
            
        max_similarity = 0.0
        
        for hist_agent in historical_agents:
            # Simple similarity based on common words
            ua_words = set(user_agent.lower().split())
            hist_words = set(hist_agent.lower().split())
            
            if ua_words and hist_words:
                intersection = ua_words.intersection(hist_words)
                union = ua_words.union(hist_words)
                similarity = len(intersection) / len(union)
                max_similarity = max(max_similarity, similarity)
                
        return max_similarity
    
    def _create_threat_record(self, threat: Dict, user_email: str, 
                            ip_address: str, user_agent: str):
        """Create threat detection record"""
        CompanyThreatDetection.objects.create(
            company=self.company,
            user_email=user_email,
            threat_type=threat['type'],
            severity=threat['severity'],
            description=threat['description'],
            evidence=threat['evidence'],
            ip_address=ip_address,
            user_agent=user_agent,
            confidence_score=threat['confidence']
        )
        
        # Create security alert for high-severity threats
        if threat['severity'] in ['high', 'critical']:
            CompanySecurityAlert.objects.create(
                company=self.company,
                alert_type='threat_detected',
                title=f"Threat Detected: {threat['type'].replace('_', ' ').title()}",
                message=threat['description'],
                user_email=user_email,
                ip_address=ip_address,
                severity=threat['severity'],
                metadata={
                    'threat_type': threat['type'],
                    'confidence': threat['confidence'],
                    'evidence': threat['evidence']
                }
            )

class RealTimeThreatMonitor:
    """Real-time threat monitoring and response"""
    
    def __init__(self):
        self.active_monitors = {}
        
    def monitor_login_attempt(self, company: Company, user_email: str, 
                            ip_address: str, user_agent: str, success: bool):
        """Monitor login attempt in real-time"""
        engine = ThreatDetectionEngine(company)
        threats = engine.analyze_login_attempt(
            user_email, ip_address, user_agent, success
        )
        
        # Handle immediate response for critical threats
        for threat in threats:
            if threat['severity'] == 'critical':
                self._handle_critical_threat(company, user_email, threat)
                
        return threats
    
    def _handle_critical_threat(self, company: Company, user_email: str, threat: Dict):
        """Handle critical threats with immediate response"""
        try:
            # Lock user account temporarily
            company_user = CompanyUser.objects.get(
                company=company,
                user__email=user_email
            )
            
            company_user.is_locked = True
            company_user.locked_until = timezone.now() + timedelta(hours=1)
            company_user.save()
            
            # Terminate all active sessions
            CompanyUserSession.objects.filter(user=company_user).delete()
            
            # Log the action
            CompanySecurityLog.objects.create(
                company=company,
                user_email=user_email,
                action='account_locked',
                success=True,
                details=f'Auto-locked due to critical threat: {threat["type"]}'
            )
            
        except CompanyUser.DoesNotExist:
            pass

# Global threat monitor instance
threat_monitor = RealTimeThreatMonitor()