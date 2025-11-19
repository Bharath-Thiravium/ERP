from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from authentication.permissions import IsCompanyUser
from .advanced_security_models import CompanyGeolocationRule
from .geolocation_service import geolocation_service

class GeolocationRulesView(APIView):
    """Manage geolocation security rules"""
    permission_classes = [IsCompanyUser]
    
    def get(self, request):
        """Get all geolocation rules for company"""
        company_user = request.user.company_user
        
        rules = CompanyGeolocationRule.objects.filter(
            company=company_user.company
        ).order_by('-priority', '-created_at')
        
        rules_data = []
        for rule in rules:
            rules_data.append({
                'id': rule.id,
                'name': rule.name,
                'rule_type': rule.rule_type,
                'countries': rule.countries,
                'priority': rule.priority,
                'is_active': rule.is_active,
                'created_at': rule.created_at.isoformat(),
                'description': rule.description or ''
            })
        
        return Response({
            'rules': rules_data,
            'total_count': len(rules_data)
        })
    
    def post(self, request):
        """Create new geolocation rule"""
        company_user = request.user.company_user
        
        data = request.data
        name = data.get('name', '').strip()
        rule_type = data.get('rule_type', 'allow')
        countries = data.get('countries', [])
        priority = int(data.get('priority', 1))
        description = data.get('description', '').strip()
        
        if not name:
            return Response({'error': 'Rule name is required'}, status=400)
        
        if not countries:
            return Response({'error': 'At least one country must be selected'}, status=400)
        
        if rule_type not in ['allow', 'block', 'require_2fa', 'notify']:
            return Response({'error': 'Invalid rule type'}, status=400)
        
        # Create rule
        rule = CompanyGeolocationRule.objects.create(
            company=company_user.company,
            name=name,
            rule_type=rule_type,
            countries=countries,
            priority=priority,
            description=description,
            created_by=request.user
        )
        
        return Response({
            'message': 'Geolocation rule created successfully',
            'rule': {
                'id': rule.id,
                'name': rule.name,
                'rule_type': rule.rule_type,
                'countries': rule.countries,
                'priority': rule.priority,
                'is_active': rule.is_active
            }
        })
    
    def put(self, request, rule_id):
        """Update geolocation rule"""
        company_user = request.user.company_user
        
        try:
            rule = CompanyGeolocationRule.objects.get(
                id=rule_id,
                company=company_user.company
            )
        except CompanyGeolocationRule.DoesNotExist:
            return Response({'error': 'Rule not found'}, status=404)
        
        data = request.data
        rule.name = data.get('name', rule.name).strip()
        rule.rule_type = data.get('rule_type', rule.rule_type)
        rule.countries = data.get('countries', rule.countries)
        rule.priority = int(data.get('priority', rule.priority))
        rule.description = data.get('description', rule.description)
        rule.is_active = data.get('is_active', rule.is_active)
        rule.save()
        
        return Response({
            'message': 'Rule updated successfully',
            'rule': {
                'id': rule.id,
                'name': rule.name,
                'rule_type': rule.rule_type,
                'countries': rule.countries,
                'priority': rule.priority,
                'is_active': rule.is_active
            }
        })
    
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
            return Response({'error': 'Rule not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsCompanyUser])
def get_countries_list(request):
    """Get list of countries for rule creation"""
    countries = [
        {'code': 'US', 'name': 'United States'},
        {'code': 'GB', 'name': 'United Kingdom'},
        {'code': 'CA', 'name': 'Canada'},
        {'code': 'AU', 'name': 'Australia'},
        {'code': 'DE', 'name': 'Germany'},
        {'code': 'FR', 'name': 'France'},
        {'code': 'IT', 'name': 'Italy'},
        {'code': 'ES', 'name': 'Spain'},
        {'code': 'NL', 'name': 'Netherlands'},
        {'code': 'SE', 'name': 'Sweden'},
        {'code': 'NO', 'name': 'Norway'},
        {'code': 'DK', 'name': 'Denmark'},
        {'code': 'FI', 'name': 'Finland'},
        {'code': 'JP', 'name': 'Japan'},
        {'code': 'KR', 'name': 'South Korea'},
        {'code': 'SG', 'name': 'Singapore'},
        {'code': 'IN', 'name': 'India'},
        {'code': 'BR', 'name': 'Brazil'},
        {'code': 'MX', 'name': 'Mexico'},
        {'code': 'AR', 'name': 'Argentina'},
        {'code': 'CN', 'name': 'China'},
        {'code': 'RU', 'name': 'Russia'},
        {'code': 'IR', 'name': 'Iran'},
        {'code': 'KP', 'name': 'North Korea'},
        {'code': 'SY', 'name': 'Syria'},
        {'code': 'AF', 'name': 'Afghanistan'},
        {'code': 'IQ', 'name': 'Iraq'},
        {'code': 'LY', 'name': 'Libya'},
        {'code': 'SO', 'name': 'Somalia'},
        {'code': 'SD', 'name': 'Sudan'},
    ]
    
    return Response({'countries': countries})

@api_view(['POST'])
@permission_classes([IsCompanyUser])
def test_ip_location(request):
    """Test IP geolocation detection"""
    ip_address = request.data.get('ip_address', request.META.get('REMOTE_ADDR', '127.0.0.1'))
    
    location_info = geolocation_service.get_location_info(ip_address)
    
    return Response({
        'ip_address': ip_address,
        'location_info': location_info,
        'message': f'Location detected: {location_info["city"]}, {location_info["country"]}'
    })

def check_geolocation_access(company, ip_address, user_email):
    """Check if access is allowed based on geolocation rules"""
    
    # Get location info
    location_info = geolocation_service.get_location_info(ip_address)
    country_code = location_info.get('country_code', 'XX')
    
    # Get active rules for company, ordered by priority
    rules = CompanyGeolocationRule.objects.filter(
        company=company,
        is_active=True
    ).order_by('-priority')
    
    # Check each rule
    for rule in rules:
        if country_code in rule.countries:
            return {
                'allowed': rule.rule_type in ['allow', 'require_2fa', 'notify'],
                'action': rule.rule_type,
                'rule_name': rule.name,
                'location_info': location_info,
                'requires_2fa': rule.rule_type == 'require_2fa',
                'notify_only': rule.rule_type == 'notify'
            }
    
    # No matching rule - default to allow
    return {
        'allowed': True,
        'action': 'default_allow',
        'rule_name': 'Default Policy',
        'location_info': location_info,
        'requires_2fa': False,
        'notify_only': False
    }