from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for ViewSets
router = DefaultRouter()

urlpatterns = [
    path('', include(router.urls)),

    # Notification endpoints
    path('notifications/', views.NotificationListCreateView.as_view(), name='notification_list_create'),
    path('notifications/<int:pk>/', views.NotificationDetailView.as_view(), name='notification_detail'),
    path('notifications/bulk-create/', views.NotificationBulkCreateView.as_view(), name='notification_bulk_create'),
    path('notifications/mark-read/', views.NotificationMarkReadView.as_view(), name='notification_mark_read'),
    path('notifications/stats/', views.NotificationStatsView.as_view(), name='notification_stats'),
]
