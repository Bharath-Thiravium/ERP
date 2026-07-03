from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import permissions
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg, F
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Ticket, TicketCategory, SLA, KnowledgeBase
from .serializers import TicketSerializer, TicketCategorySerializer, SLASerializer, KnowledgeBaseSerializer
from .views import CRMBaseViewSet


class TicketViewSet(CRMBaseViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    filterset_fields = ['status', 'priority', 'source', 'category', 'assigned_to']
    search_fields = ['subject', 'description', 'ticket_id', 'contact__first_name', 'contact__last_name']
    ordering_fields = ['created_at', 'updated_at', 'priority', 'response_due', 'resolution_due']
    ordering = ['-created_at']

    def create(self, request, *args, **kwargs):
        """Override create to auto-assign SLA and due dates"""
        su = self._get_service_user()
        if not su:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            data = request.data.copy()
            data['company'] = su.company.id
            user_id = su.created_by.id if su.created_by else None
            if not user_id:
                from django.contrib.auth.models import User
                admin_user = User.objects.filter(is_superuser=True).first()
                user_id = admin_user.id if admin_user else None
            if not user_id:
                return Response({'error': 'No valid user found'}, status=status.HTTP_400_BAD_REQUEST)
            data['created_by'] = user_id
            priority = data.get('priority', 'medium')
            try:
                sla = SLA.objects.get(company=su.company, priority=priority, is_active=True)
                data['sla'] = sla.id
                now = timezone.now()
                data['response_due'] = now + timedelta(hours=sla.response_time_hours)
                data['resolution_due'] = now + timedelta(hours=sla.resolution_time_hours)
            except SLA.DoesNotExist:
                pass
            from django.contrib.auth.models import User
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            instance = serializer.save(created_by=User.objects.get(id=user_id))
            return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': f'Ticket creation failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """Assign ticket to agent"""
        ticket = self.get_object()
        agent_id = request.data.get('agent_id')
        
        if agent_id:
            from django.contrib.auth.models import User
            try:
                agent = User.objects.get(id=agent_id)
                ticket.assigned_to = agent
                ticket.save()
                return Response({'message': 'Ticket assigned successfully'})
            except User.DoesNotExist:
                return Response({'error': 'Agent not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'error': 'Agent ID required'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        """Mark first response"""
        ticket = self.get_object()
        if not ticket.first_response_at:
            ticket.first_response_at = timezone.now()
            ticket.save()
        return Response({'message': 'Response recorded'})

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve ticket"""
        ticket = self.get_object()
        ticket.status = 'resolved'
        ticket.resolved_at = timezone.now()
        ticket.save()
        return Response({'message': 'Ticket resolved'})

    @action(detail=True, methods=['post'])
    def rate(self, request, pk=None):
        """Customer satisfaction rating"""
        ticket = self.get_object()
        rating = request.data.get('rating')
        comment = request.data.get('comment', '')
        
        if rating and 1 <= int(rating) <= 5:
            ticket.satisfaction_rating = int(rating)
            ticket.satisfaction_comment = comment
            ticket.save()
            return Response({'message': 'Rating recorded'})
        
        return Response({'error': 'Invalid rating'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False)
    def overdue(self, request):
        """Get overdue tickets"""
        queryset = self.get_queryset().filter(
            resolution_due__lt=timezone.now(),
            status__in=['open', 'in_progress', 'pending']
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False)
    def sla_dashboard(self, request):
        """SLA performance dashboard"""
        queryset = self.get_queryset()
        
        stats = {
            'total_tickets': queryset.count(),
            'open_tickets': queryset.filter(status='open').count(),
            'overdue_tickets': queryset.filter(
                resolution_due__lt=timezone.now(),
                status__in=['open', 'in_progress', 'pending']
            ).count(),
            'avg_response_time': 0,
            'avg_resolution_time': 0,
            'satisfaction_avg': queryset.filter(
                satisfaction_rating__isnull=False
            ).aggregate(avg_rating=Avg('satisfaction_rating'))['avg_rating'] or 0
        }
        
        # Calculate average response time
        responded_tickets = queryset.filter(first_response_at__isnull=False)
        if responded_tickets.exists():
            response_times = []
            for ticket in responded_tickets:
                delta = ticket.first_response_at - ticket.created_at
                response_times.append(delta.total_seconds() / 3600)  # Convert to hours
            stats['avg_response_time'] = sum(response_times) / len(response_times)
        
        # Calculate average resolution time
        resolved_tickets = queryset.filter(resolved_at__isnull=False)
        if resolved_tickets.exists():
            resolution_times = []
            for ticket in resolved_tickets:
                delta = ticket.resolved_at - ticket.created_at
                resolution_times.append(delta.total_seconds() / 3600)  # Convert to hours
            stats['avg_resolution_time'] = sum(resolution_times) / len(resolution_times)
        
        return Response(stats)


class TicketCategoryViewSet(CRMBaseViewSet):
    queryset = TicketCategory.objects.all()
    serializer_class = TicketCategorySerializer
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering = ['name']


class SLAViewSet(CRMBaseViewSet):
    queryset = SLA.objects.all()
    serializer_class = SLASerializer
    filterset_fields = ['priority', 'is_active']
    ordering = ['priority']


class KnowledgeBaseViewSet(CRMBaseViewSet):
    queryset = KnowledgeBase.objects.all()
    serializer_class = KnowledgeBaseSerializer
    filterset_fields = ['category', 'is_published']
    search_fields = ['title', 'content', 'tags']
    ordering = ['-created_at']

    @action(detail=True, methods=['post'])
    def mark_helpful(self, request, pk=None):
        """Mark article as helpful"""
        article = self.get_object()
        article.helpful_count = F('helpful_count') + 1
        article.save()
        article.refresh_from_db()
        return Response({'helpful_count': article.helpful_count})

    @action(detail=True, methods=['post'])
    def view(self, request, pk=None):
        """Increment view count"""
        article = self.get_object()
        article.view_count = F('view_count') + 1
        article.save()
        article.refresh_from_db()
        return Response({'view_count': article.view_count})

    @action(detail=False)
    def search(self, request):
        """Advanced search with AI-like features"""
        query = request.query_params.get('q', '')
        if not query:
            return Response([])
        
        queryset = self.get_queryset().filter(is_published=True)
        
        # Search in title, content, and tags
        queryset = queryset.filter(
            Q(title__icontains=query) |
            Q(content__icontains=query) |
            Q(tags__icontains=query)
        )
        
        # Order by relevance (title matches first, then content)
        queryset = queryset.extra(
            select={
                'title_match': "CASE WHEN title ILIKE %s THEN 1 ELSE 0 END",
                'content_match': "CASE WHEN content ILIKE %s THEN 1 ELSE 0 END"
            },
            select_params=[f'%{query}%', f'%{query}%'],
            order_by=['-title_match', '-content_match', '-helpful_count', '-view_count']
        )
        
        serializer = self.get_serializer(queryset[:10], many=True)  # Limit to top 10 results
        return Response(serializer.data)