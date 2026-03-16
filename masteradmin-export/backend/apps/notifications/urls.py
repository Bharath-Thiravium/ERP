from django.urls import path
from .views import (
    NotificationListCreateView,
    NotificationDetailView,
    NotificationBulkCreateView,
    NotificationMarkReadView,
    NotificationStatsView
)

urlpatterns = [
    path('', NotificationListCreateView.as_view(), name='notification_list_create'),
    path('<int:pk>/', NotificationDetailView.as_view(), name='notification_detail'),
    path('bulk-create/', NotificationBulkCreateView.as_view(), name='notification_bulk_create'),
    path('mark-read/', NotificationMarkReadView.as_view(), name='notification_mark_read'),
    path('stats/', NotificationStatsView.as_view(), name='notification_stats'),
]