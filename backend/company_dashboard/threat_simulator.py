"""
Threat Simulation for Testing AI Detection
"""
from django.utils import timezone
from datetime import timedelta
import random
from .advanced_security_models import CompanyThreatDetection, CompanySecurityAlert
from .security_models import CompanySecurityLog

class ThreatSimulator:
    """Simulate various threats for testing"""
    
    THREAT_SCENARIOS = {
        'brute_force': {
            'description': 'Multiple failed login attempts detected',
            'severity': 'high',
            'confidence': 0.92,
            'behavioral_score': 0.85
        },
        'suspicious_location': {
            'description': 'Login from unusual geographic location',
            'severity': 'medium',
            'confidence': 0.78,
            'behavioral_score': 0.65
        },
        'velocity_attack': {
            'description': 'Rapid login attempts from multiple IPs',
            'severity': 'critical',
            'confidence': 0.95,
            'behavioral_score': 0.90
        },
        'device_anomaly': {
            'description': 'Login from unrecognized device',
            'severity': 'medium',
            'confidence': 0.73,
            'behavioral_score': 0.55
        },
        'time_anomaly': {
            'description': 'Login at unusual time (3:00 AM)',
            'severity': 'low',
            'confidence': 0.68,
            'behavioral_score': 0.45
        },
        'behavioral_anomaly': {
            'description': 'AI detected unusual user behavior pattern',
            'severity': 'high',
            'confidence': 0.88,
            'behavioral_score': 0.82
        }
    }
    
    def __init__(self, company):
        self.company = company
    
    def create_sample_threats(self, count=10):
        """Create sample threats for testing"""
        threats_created = []
        
        for i in range(count):
            threat_type = random.choice(list(self.THREAT_SCENARIOS.keys()))
            scenario = self.THREAT_SCENARIOS[threat_type]
            
            # Create threat
            threat = CompanyThreatDetection.objects.create(
                company=self.company,
                user_email=f'user{i+1}@{self.company.name.lower().replace(" ", "")}.com',
                threat_type=threat_type,
                severity=scenario['severity'],
                description=scenario['description'],
                evidence=self._generate_evidence(threat_type),
                ip_address=self._generate_ip(),
                user_agent=self._generate_user_agent(),
                confidence_score=scenario['confidence'] + random.uniform(-0.1, 0.1),
                behavioral_score=scenario['behavioral_score'] + random.uniform(-0.15, 0.15),
                ml_model_version='v1.0',
                detected_at=timezone.now() - timedelta(
                    hours=random.randint(0, 72),
                    minutes=random.randint(0, 59)
                )
            )
            
            # Create corresponding security alert for high/critical threats
            if scenario['severity'] in ['high', 'critical']:
                CompanySecurityAlert.objects.create(
                    company=self.company,
                    alert_type='threat_detected',
                    title=f'🤖 AI Threat Detected: {threat_type.replace("_", " ").title()}',
                    message=scenario['description'],
                    user_email=threat.user_email,
                    ip_address=threat.ip_address,
                    severity=scenario['severity'],
                    metadata={
                        'threat_id': threat.id,
                        'confidence_score': threat.confidence_score,
                        'ai_detected': True
                    }
                )
            
            threats_created.append(threat)
        
        return threats_created
    
    def simulate_brute_force_attack(self, target_email):
        """Simulate a brute force attack scenario"""
        base_ip = "192.168.1."
        
        # Create failed login attempts
        for i in range(8):
            CompanySecurityLog.objects.create(
                company=self.company,
                user_email=target_email,
                action='failed_login',
                ip_address=f"{base_ip}{100 + i}",
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                success=False,
                details=f'Failed login attempt #{i+1}',
                timestamp=timezone.now() - timedelta(minutes=15-i)
            )
        
        # Create the threat detection
        threat = CompanyThreatDetection.objects.create(
            company=self.company,
            user_email=target_email,
            threat_type='brute_force',
            severity='critical',
            description=f'Brute force attack detected: 8 failed attempts in 15 minutes',
            evidence={
                'failed_attempts': 8,
                'time_window': '15_minutes',
                'ip_addresses': [f"{base_ip}{100 + i}" for i in range(8)],
                'attack_pattern': 'sequential_ips'
            },
            ip_address=f"{base_ip}100",
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            confidence_score=0.96,
            behavioral_score=0.92,
            ml_model_version='v1.0'
        )
        
        return threat
    
    def _generate_evidence(self, threat_type):
        """Generate realistic evidence for different threat types"""
        evidence_templates = {
            'brute_force': {
                'failed_attempts': random.randint(5, 15),
                'time_window': '15_minutes',
                'attack_pattern': random.choice(['sequential', 'distributed', 'burst'])
            },
            'suspicious_location': {
                'new_country': random.choice(['Russia', 'China', 'Nigeria', 'Romania']),
                'distance_km': random.randint(5000, 15000),
                'vpn_detected': random.choice([True, False])
            },
            'velocity_attack': {
                'attempts_per_minute': random.randint(8, 20),
                'unique_ips': random.randint(3, 8),
                'time_span': '5_minutes'
            },
            'device_anomaly': {
                'new_browser': random.choice(['Chrome 118', 'Firefox 119', 'Safari 17']),
                'new_os': random.choice(['Windows 11', 'macOS 14', 'Ubuntu 22.04']),
                'device_similarity': random.uniform(0.1, 0.4)
            },
            'time_anomaly': {
                'login_hour': random.choice([2, 3, 4, 23, 0, 1]),
                'typical_hours': [9, 10, 11, 14, 15, 16],
                'deviation_score': random.uniform(0.7, 0.9)
            },
            'behavioral_anomaly': {
                'anomaly_factors': random.choice([
                    ['unusual_time', 'new_location'],
                    ['new_device', 'high_velocity'],
                    ['location_jump', 'browser_change']
                ]),
                'baseline_deviation': random.uniform(0.6, 0.9)
            }
        }
        
        return evidence_templates.get(threat_type, {})
    
    def _generate_ip(self):
        """Generate random IP address"""
        return f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"
    
    def _generate_user_agent(self):
        """Generate random user agent"""
        agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0'
        ]
        return random.choice(agents)