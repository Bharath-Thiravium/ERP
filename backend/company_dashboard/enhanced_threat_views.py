from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Count, Q, Avg
from datetime import timedelta
import json

from .advanced_security_models import CompanyThreatDetection, CompanySecurityAlert
from .threat_detection_engine import ThreatDetectionEngine, threat_monitor
from authentication.permissions import IsCompanyUser

class EnhancedThreatDetectionView(APIView):
    """Enhanced AI-powered threat detection view"""
    permission_classes = [IsCompanyUser]
    
    def get(self, request):
        """Get threat detections with AI insights"""
        company_user = request.user.company_user
        
        # Base query
        threats = CompanyThreatDetection.objects.filter(
            company=company_user.company
        ).order_by('-detected_at')
        
        # Filters
        severity = request.query_params.get('severity')
        if severity:
            threats = threats.filter(severity=severity)
            
        threat_type = request.query_params.get('threat_type')
        if threat_type:
            threats = threats.filter(threat_type=threat_type)
            
        resolved = request.query_params.get('resolved')
        if resolved is not None:
            threats = threats.filter(is_resolved=resolved.lower() == 'true')
            
        # AI confidence filter
        min_confidence = request.query_params.get('min_confidence')
        if min_confidence:
            threats = threats.filter(confidence_score__gte=float(min_confidence))
        
        # Pagination
        page_size = int(request.query_params.get('page_size', 20))
        threats = threats[:page_size]
        
        # Serialize with additional AI data
        threat_data = []
        for threat in threats:
            data = {
                'id': threat.id,
                'threat_type': threat.threat_type,
                'threat_type_display': threat.get_threat_type_display(),
                'severity': threat.severity,
                'description': threat.description,
                'user_email': threat.user_email,
                'ip_address': threat.ip_address,
                'confidence_score': threat.confidence_score,
                'behavioral_score': threat.behavioral_score,
                'ml_model_version': threat.ml_model_version,
                'evidence': threat.evidence,
                'is_resolved': threat.is_resolved,
                'auto_blocked': threat.auto_blocked,
                'response_actions': threat.response_actions,
                'detected_at': threat.detected_at.isoformat(),
                'time_ago': self._get_time_ago(threat.detected_at)
            }
            threat_data.append(data)
        
        return Response({
            'threats': threat_data,
            'total_count': CompanyThreatDetection.objects.filter(
                company=company_user.company
            ).count(),
            'ai_insights': self._get_ai_insights(company_user.company)
        })
    
    def post(self, request):
        """Manually trigger threat analysis"""
        company_user = request.user.company_user
        
        # Get parameters
        user_email = request.data.get('user_email')
        ip_address = request.data.get('ip_address', '127.0.0.1')
        user_agent = request.data.get('user_agent', '')
        
        if not user_email:
            return Response({'error': 'user_email required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Run threat analysis
        engine = ThreatDetectionEngine(company_user.company)
        threats = engine.analyze_login_attempt(
            user_email, ip_address, user_agent, success=True
        )
        
        return Response({
            'message': f'Threat analysis completed. {len(threats)} threats detected.',
            'threats_detected': len(threats),
            'threat_types': [t['type'] for t in threats]
        })
    
    def patch(self, request, threat_id):
        """Update threat status"""
        company_user = request.user.company_user
        
        try:
            threat = CompanyThreatDetection.objects.get(
                id=threat_id,
                company=company_user.company
            )
            
            # Update fields
            if 'is_resolved' in request.data:
                threat.is_resolved = request.data['is_resolved']
                if threat.is_resolved:
                    threat.resolved_at = timezone.now()
                    
            if 'response_actions' in request.data:
                threat.response_actions = request.data['response_actions']
                
            threat.save()
            
            return Response({'message': 'Threat updated successfully'})
            
        except CompanyThreatDetection.DoesNotExist:
            return Response({'error': 'Threat not found'}, status=status.HTTP_404_NOT_FOUND)
    
    def _get_time_ago(self, timestamp):
        """Get human-readable time ago"""
        now = timezone.now()
        diff = now - timestamp
        
        if diff.days > 0:
            return f"{diff.days} days ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hours ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minutes ago"
        else:
            return "Just now"
    
    def _get_ai_insights(self, company):
        """Get AI-powered insights"""
        threats = CompanyThreatDetection.objects.filter(company=company)
        
        # Calculate insights
        total_threats = threats.count()
        avg_confidence = threats.aggregate(avg=Avg('confidence_score'))['avg'] or 0
        
        # Threat patterns
        threat_patterns = threats.values('threat_type').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        # High confidence threats
        high_confidence_threats = threats.filter(confidence_score__gte=0.8).count()
        
        # Recent trend
        recent_threats = threats.filter(
            detected_at__gte=timezone.now() - timedelta(days=7)
        ).count()
        
        return {
            'total_threats': total_threats,
            'average_confidence': round(avg_confidence, 2),
            'high_confidence_threats': high_confidence_threats,
            'recent_threats_7d': recent_threats,
            'top_threat_patterns': list(threat_patterns),
            'ai_model_version': 'v1.0',
            'last_analysis': timezone.now().isoformat()
        }

class ThreatAnalyticsView(APIView):
    """Advanced threat analytics and reporting"""
    permission_classes = [IsCompanyUser]
    
    def get(self, request):
        """Get comprehensive threat analytics"""
        company_user = request.user.company_user
        company = company_user.company
        
        # Time range
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        threats = CompanyThreatDetection.objects.filter(
            company=company,
            detected_at__gte=start_date
        )
        
        analytics = {
            'summary': self._get_threat_summary(threats),
            'trends': self._get_threat_trends(threats, days),
            'severity_distribution': self._get_severity_distribution(threats),
            'threat_types': self._get_threat_type_analysis(threats),
            'user_analysis': self._get_user_threat_analysis(threats),
            'ip_analysis': self._get_ip_threat_analysis(threats),
            'ai_performance': self._get_ai_performance_metrics(threats)
        }
        
        return Response(analytics)
    
    def _get_threat_summary(self, threats):
        """Get threat summary statistics"""
        total = threats.count()
        resolved = threats.filter(is_resolved=True).count()
        auto_blocked = threats.filter(auto_blocked=True).count()
        
        return {
            'total_threats': total,
            'resolved_threats': resolved,
            'auto_blocked_threats': auto_blocked,
            'resolution_rate': round((resolved / total * 100) if total > 0 else 0, 1),
            'auto_block_rate': round((auto_blocked / total * 100) if total > 0 else 0, 1)
        }
    
    def _get_threat_trends(self, threats, days):
        """Get threat trends over time"""
        trends = []
        
        for i in range(days):
            date = timezone.now().date() - timedelta(days=i)
            day_threats = threats.filter(detected_at__date=date)
            
            trends.append({
                'date': date.isoformat(),
                'total_threats': day_threats.count(),
                'critical_threats': day_threats.filter(severity='critical').count(),
                'high_threats': day_threats.filter(severity='high').count(),
                'avg_confidence': day_threats.aggregate(
                    avg=Avg('confidence_score')
                )['avg'] or 0
            })
        
        return list(reversed(trends))
    
    def _get_severity_distribution(self, threats):
        """Get threat severity distribution"""
        return dict(
            threats.values('severity').annotate(
                count=Count('id')
            ).values_list('severity', 'count')
        )
    
    def _get_threat_type_analysis(self, threats):
        """Get threat type analysis"""
        return list(
            threats.values('threat_type').annotate(
                count=Count('id'),
                avg_confidence=Avg('confidence_score')
            ).order_by('-count')
        )
    
    def _get_user_threat_analysis(self, threats):
        """Get per-user threat analysis"""
        return list(
            threats.values('user_email').annotate(
                threat_count=Count('id'),
                avg_confidence=Avg('confidence_score')
            ).order_by('-threat_count')[:10]
        )
    
    def _get_ip_threat_analysis(self, threats):
        """Get IP-based threat analysis"""
        return list(
            threats.values('ip_address').annotate(
                threat_count=Count('id'),
                unique_users=Count('user_email', distinct=True)
            ).order_by('-threat_count')[:10]
        )
    
    def _get_ai_performance_metrics(self, threats):
        """Get AI model performance metrics"""
        total = threats.count()
        if total == 0:
            return {}
            
        high_confidence = threats.filter(confidence_score__gte=0.8).count()
        resolved_high_conf = threats.filter(
            confidence_score__gte=0.8,
            is_resolved=True
        ).count()
        
        return {
            'total_predictions': total,
            'high_confidence_predictions': high_confidence,
            'high_confidence_rate': round((high_confidence / total * 100), 1),
            'avg_confidence_score': round(
                threats.aggregate(avg=Avg('confidence_score'))['avg'] or 0, 2
            ),
            'model_accuracy': round(
                (resolved_high_conf / high_confidence * 100) if high_confidence > 0 else 0, 1
            ),
            'model_version': 'v1.0'
        }

@api_view(['POST'])
@permission_classes([IsCompanyUser])
def simulate_threat(request):
    """Simulate realistic threats for testing AI detection"""
    from .threat_simulator import ThreatSimulator
    
    company_user = request.user.company_user
    simulator = ThreatSimulator(company_user.company)
    
    action = request.data.get('action', 'create_sample')
    
    if action == 'create_sample':
        count = int(request.data.get('count', 5))
        threats = simulator.create_sample_threats(count)
        return Response({
            'message': f'Created {len(threats)} sample threats successfully',
            'threats_created': len(threats),
            'threat_types': [t.threat_type for t in threats]
        })
    
    elif action == 'brute_force':
        target_email = request.data.get('target_email', request.user.email)
        threat = simulator.simulate_brute_force_attack(target_email)
        return Response({
            'message': 'Brute force attack simulation completed',
            'threat_id': threat.id,
            'confidence_score': threat.confidence_score
        })
    
    else:
        return Response({'error': 'Invalid action'}, status=400)

@api_view(['DELETE'])
@permission_classes([IsCompanyUser])
def clear_test_threats(request):
    """Clear all test threats"""
    company_user = request.user.company_user
    
    # Delete threats with test evidence
    deleted_count = CompanyThreatDetection.objects.filter(
        company=company_user.company,
        evidence__contains={'simulated': True}
    ).delete()[0]
    
    # Also delete related alerts
    CompanySecurityAlert.objects.filter(
        company=company_user.company,
        metadata__contains={'ai_detected': True}
    ).delete()
    
    return Response({
        'message': f'Cleared {deleted_count} test threats successfully'
    })