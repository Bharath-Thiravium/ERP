from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Avg, Count, Q
from .models import Lead, LeadScore, ScoringCriteria
from .serializers import LeadScoreSerializer, ScoringCriteriaSerializer
from .lead_scoring import LeadScoringEngine
from authentication.models import ServiceUserSession
from .views import CRMBaseViewSet


class LeadScoreViewSet(CRMBaseViewSet):
    queryset = LeadScore.objects.all()
    serializer_class = LeadScoreSerializer
    filterset_fields = ['grade']
    ordering = ['-total_score', '-last_calculated']

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return self.queryset.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            return self.queryset.filter(lead__company=company)
        except ServiceUserSession.DoesNotExist:
            return self.queryset.none()

    @action(detail=False, methods=['post'])
    def calculate_score(self, request):
        """Calculate score for specific lead"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

        lead_id = request.data.get('lead_id')
        if not lead_id:
            return Response({'error': 'Lead ID required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            lead = Lead.objects.get(id=lead_id, company=company)
            engine = LeadScoringEngine(company)
            lead_score = engine.calculate_lead_score(lead)
            
            serializer = self.get_serializer(lead_score)
            return Response(serializer.data)
        except Lead.DoesNotExist:
            return Response({'error': 'Lead not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def bulk_calculate(self, request):
        """Calculate scores for multiple leads"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

        lead_ids = request.data.get('lead_ids', [])
        engine = LeadScoringEngine(company)
        
        if lead_ids:
            results = engine.bulk_score_leads(lead_ids)
        else:
            # Score all active leads
            results = engine.bulk_score_leads()
        
        return Response({
            'message': f'Processed {len(results)} leads',
            'results': results
        })

    @action(detail=False)
    def analytics(self, request):
        """Lead scoring analytics"""
        queryset = self.get_queryset()
        
        analytics = {
            'total_scored_leads': queryset.count(),
            'score_distribution': {
                'very_hot': queryset.filter(grade='very_hot').count(),
                'hot': queryset.filter(grade='hot').count(),
                'warm': queryset.filter(grade='warm').count(),
                'cold': queryset.filter(grade='cold').count(),
            },
            'average_scores': {
                'behavioral': queryset.aggregate(avg=Avg('behavioral_score'))['avg'] or 0,
                'demographic': queryset.aggregate(avg=Avg('demographic_score'))['avg'] or 0,
                'engagement': queryset.aggregate(avg=Avg('engagement_score'))['avg'] or 0,
                'predictive': queryset.aggregate(avg=Avg('predictive_score'))['avg'] or 0,
                'total': queryset.aggregate(avg=Avg('total_score'))['avg'] or 0,
            },
            'conversion_insights': {
                'avg_conversion_probability': queryset.aggregate(avg=Avg('conversion_probability'))['avg'] or 0,
                'high_probability_leads': queryset.filter(conversion_probability__gte=0.7).count(),
                'medium_probability_leads': queryset.filter(
                    conversion_probability__gte=0.4, 
                    conversion_probability__lt=0.7
                ).count(),
                'low_probability_leads': queryset.filter(conversion_probability__lt=0.4).count(),
            }
        }
        
        return Response(analytics)

    @action(detail=False)
    def top_leads(self, request):
        """Get top scoring leads"""
        limit = int(request.query_params.get('limit', 10))
        queryset = self.get_queryset().order_by('-total_score')[:limit]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False)
    def recommendations(self, request):
        """Get AI recommendations for all leads"""
        queryset = self.get_queryset().filter(
            recommended_actions__isnull=False
        ).exclude(recommended_actions=[])
        
        recommendations = []
        for score in queryset:
            recommendations.append({
                'lead_id': score.lead.id,
                'lead_name': f"{score.lead.first_name} {score.lead.last_name}",
                'company': score.lead.company_name,
                'total_score': score.total_score,
                'grade': score.grade,
                'actions': score.recommended_actions
            })
        
        # Sort by score descending
        recommendations.sort(key=lambda x: x['total_score'], reverse=True)
        
        return Response(recommendations[:20])  # Top 20 recommendations


class ScoringCriteriaViewSet(CRMBaseViewSet):
    queryset = ScoringCriteria.objects.all()
    serializer_class = ScoringCriteriaSerializer
    filterset_fields = ['criteria_type', 'is_active']
    ordering = ['criteria_type', 'name']

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return self.queryset.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            return self.queryset.filter(company=company)
        except ServiceUserSession.DoesNotExist:
            return self.queryset.none()

    @action(detail=False)
    def by_type(self, request):
        """Get criteria grouped by type"""
        queryset = self.get_queryset().filter(is_active=True)
        
        grouped = {
            'behavioral': [],
            'demographic': [],
            'engagement': [],
            'predictive': []
        }
        
        for criteria in queryset:
            if criteria.criteria_type in grouped:
                serializer = self.get_serializer(criteria)
                grouped[criteria.criteria_type].append(serializer.data)
        
        return Response(grouped)


class LeadScoringDashboardViewSet(viewsets.ViewSet):
    """Comprehensive lead scoring dashboard"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get_session_key(self, request):
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.query_params.get('session_key')
        return session_key

    def list(self, request):
        """Main dashboard data"""
        session_key = self.get_session_key(request)
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

        # Get all lead scores for the company
        lead_scores = LeadScore.objects.filter(lead__company=company)
        leads = Lead.objects.filter(company=company)
        
        dashboard_data = {
            'overview': {
                'total_leads': leads.count(),
                'scored_leads': lead_scores.count(),
                'unscored_leads': leads.count() - lead_scores.count(),
                'avg_score': lead_scores.aggregate(avg=Avg('total_score'))['avg'] or 0,
            },
            'score_distribution': {
                'very_hot': lead_scores.filter(grade='very_hot').count(),
                'hot': lead_scores.filter(grade='hot').count(),
                'warm': lead_scores.filter(grade='warm').count(),
                'cold': lead_scores.filter(grade='cold').count(),
            },
            'component_averages': {
                'behavioral': lead_scores.aggregate(avg=Avg('behavioral_score'))['avg'] or 0,
                'demographic': lead_scores.aggregate(avg=Avg('demographic_score'))['avg'] or 0,
                'engagement': lead_scores.aggregate(avg=Avg('engagement_score'))['avg'] or 0,
                'predictive': lead_scores.aggregate(avg=Avg('predictive_score'))['avg'] or 0,
            },
            'conversion_metrics': {
                'high_probability': lead_scores.filter(conversion_probability__gte=0.7).count(),
                'medium_probability': lead_scores.filter(
                    conversion_probability__gte=0.4,
                    conversion_probability__lt=0.7
                ).count(),
                'low_probability': lead_scores.filter(conversion_probability__lt=0.4).count(),
                'avg_probability': lead_scores.aggregate(avg=Avg('conversion_probability'))['avg'] or 0,
            },
            'top_leads': [],
            'recent_scores': []
        }
        
        # Get top 5 leads
        top_leads = lead_scores.order_by('-total_score')[:5]
        for score in top_leads:
            dashboard_data['top_leads'].append({
                'id': score.lead.id,
                'name': f"{score.lead.first_name} {score.lead.last_name}",
                'company': score.lead.company_name,
                'score': score.total_score,
                'grade': score.grade,
                'probability': score.conversion_probability
            })
        
        # Get recent scores (last 10)
        recent_scores = lead_scores.order_by('-last_calculated')[:10]
        for score in recent_scores:
            dashboard_data['recent_scores'].append({
                'id': score.lead.id,
                'name': f"{score.lead.first_name} {score.lead.last_name}",
                'score': score.total_score,
                'grade': score.grade,
                'calculated_at': score.last_calculated
            })
        
        return Response(dashboard_data)

    @action(detail=False)
    def insights(self, request):
        """AI-powered insights and trends"""
        session_key = self.get_session_key(request)
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

        lead_scores = LeadScore.objects.filter(lead__company=company)
        
        insights = {
            'key_insights': [],
            'trends': {},
            'recommendations': []
        }
        
        # Generate insights
        total_scores = lead_scores.count()
        if total_scores > 0:
            hot_leads = lead_scores.filter(grade__in=['hot', 'very_hot']).count()
            hot_percentage = (hot_leads / total_scores) * 100
            
            if hot_percentage > 30:
                insights['key_insights'].append({
                    'type': 'positive',
                    'title': 'Strong Lead Quality',
                    'message': f'{hot_percentage:.1f}% of your leads are hot or very hot!'
                })
            elif hot_percentage < 10:
                insights['key_insights'].append({
                    'type': 'warning',
                    'title': 'Lead Quality Concern',
                    'message': f'Only {hot_percentage:.1f}% of leads are hot. Consider improving lead sources.'
                })
            
            # Behavioral insights
            avg_behavioral = lead_scores.aggregate(avg=Avg('behavioral_score'))['avg'] or 0
            if avg_behavioral < 30:
                insights['recommendations'].append({
                    'priority': 'high',
                    'title': 'Improve Digital Engagement',
                    'action': 'Increase website content and email campaigns to boost behavioral scores'
                })
            
            # Engagement insights
            avg_engagement = lead_scores.aggregate(avg=Avg('engagement_score'))['avg'] or 0
            if avg_engagement < 40:
                insights['recommendations'].append({
                    'priority': 'medium',
                    'title': 'Enhance Lead Nurturing',
                    'action': 'Implement more personalized follow-up sequences'
                })
        
        return Response(insights)