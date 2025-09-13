from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from django.db.models import Q

from .models import Notification
from .serializers import (
    NotificationSerializer, NotificationCreateSerializer,
    NotificationBulkCreateSerializer, NotificationMarkReadSerializer
)


class NotificationListCreateView(ListCreateAPIView):
    """List and create notifications"""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Notification.objects.filter(recipient=user)

        # Filter by read status
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')

        # Filter by notification type
        notification_type = self.request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)

        # Filter by priority
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)

        return queryset.order_by('-created_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return NotificationCreateSerializer
        return NotificationSerializer


class NotificationDetailView(RetrieveUpdateDestroyAPIView):
    """Notification detail view"""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        """Mark notification as read when retrieved"""
        notification = self.get_object()
        if not notification.is_read:
            notification.mark_as_read()
        return super().retrieve(request, *args, **kwargs)


class NotificationBulkCreateView(APIView):
    """Create bulk notifications (Master Admin only)"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not hasattr(request.user, 'master_admin'):
            return Response(
                {'error': 'Only master admins can create bulk notifications.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = NotificationBulkCreateSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            notifications = serializer.save()
            return Response({
                'message': f'Successfully created {len(notifications)} notifications.',
                'count': len(notifications)
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class NotificationMarkReadView(APIView):
    """Mark notifications as read"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = NotificationMarkReadSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            notifications = serializer.save()
            return Response({
                'message': f'Marked {len(notifications)} notifications as read.',
                'count': len(notifications)
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class NotificationStatsView(APIView):
    """Notification statistics"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        notifications = Notification.objects.filter(recipient=user)

        stats = {
            'total': notifications.count(),
            'unread': notifications.filter(is_read=False).count(),
            'read': notifications.filter(is_read=True).count(),
            'archived': notifications.filter(is_archived=True).count(),
            'by_priority': {
                'urgent': notifications.filter(priority='urgent').count(),
                'high': notifications.filter(priority='high').count(),
                'medium': notifications.filter(priority='medium').count(),
                'low': notifications.filter(priority='low').count(),
            },
            'by_type': {}
        }

        # Count by notification type
        for choice in Notification.NOTIFICATION_TYPES:
            notification_type = choice[0]
            count = notifications.filter(notification_type=notification_type).count()
            if count > 0:
                stats['by_type'][notification_type] = count

        return Response(stats)
