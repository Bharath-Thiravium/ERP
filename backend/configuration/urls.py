from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'system-config', views.SystemConfigurationViewSet)
router.register(r'backups', views.DatabaseBackupViewSet)
router.register(r'backup-schedules', views.BackupScheduleViewSet)
router.register(r'maintenance', views.SystemMaintenanceViewSet)

urlpatterns = [
    path('api/configuration/', include(router.urls)),
    path('api/configuration/dashboard/', views.configuration_dashboard, name='configuration-dashboard'),
    path('api/configuration/test-auth/', views.test_auth, name='test-auth'),
]