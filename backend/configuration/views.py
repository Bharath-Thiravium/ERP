import os
import json
from datetime import datetime, timedelta
from django.http import JsonResponse, FileResponse, Http404
from django.utils import timezone
from django.db import models
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from authentication.permissions import IsMasterAdmin
from .models import SystemConfiguration, DatabaseBackup, BackupSchedule, SystemMaintenance
from .serializers import (
    SystemConfigurationSerializer, DatabaseBackupSerializer,
    BackupScheduleSerializer, SystemMaintenanceSerializer
)
from .backup_manager import DatabaseBackupManager
import logging

logger = logging.getLogger(__name__)


class SystemConfigurationViewSet(viewsets.ModelViewSet):
    """System configuration management"""
    queryset = SystemConfiguration.objects.all()
    serializer_class = SystemConfigurationSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    
    def perform_create(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Get all configuration categories"""
        categories = SystemConfiguration.objects.values_list('category', flat=True).distinct()
        return Response({'categories': list(categories)})
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get configurations grouped by category"""
        category = request.query_params.get('category')
        if category:
            configs = self.queryset.filter(category=category)
        else:
            configs = self.queryset.all()
        
        serializer = self.get_serializer(configs, many=True)
        return Response(serializer.data)


class DatabaseBackupViewSet(viewsets.ModelViewSet):
    """Database backup management"""
    queryset = DatabaseBackup.objects.all()
    serializer_class = DatabaseBackupSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['post'])
    def create_backup(self, request):
        """Create a new backup"""
        try:
            backup_data = {
                'name': request.data.get('name', f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"),
                'backup_type': request.data.get('backup_type', 'full'),
                'description': request.data.get('description', ''),
                'compression': request.data.get('compression', 'gzip'),
                'created_by': request.user
            }
            
            backup = DatabaseBackup.objects.create(**backup_data)
            
            # Start backup process asynchronously
            backup_manager = DatabaseBackupManager()
            success = backup_manager.create_backup(backup.id, backup.backup_type)
            
            if success:
                serializer = self.get_serializer(backup)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {'error': 'Backup creation failed'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"Backup creation failed: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore from backup"""
        try:
            backup = self.get_object()
            
            if backup.status != 'completed':
                return Response(
                    {'error': 'Can only restore from completed backups'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            backup_manager = DatabaseBackupManager()
            success = backup_manager.restore_backup(backup.id)
            
            if success:
                return Response({'message': 'Restore completed successfully'})
            else:
                return Response(
                    {'error': 'Restore failed'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"Restore failed: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download backup file"""
        try:
            backup = self.get_object()
            
            if backup.status != 'completed' or not backup.file_path:
                raise Http404("Backup file not found")
            
            if not os.path.exists(backup.file_path):
                raise Http404("Backup file not found on disk")
            
            response = FileResponse(
                open(backup.file_path, 'rb'),
                as_attachment=True,
                filename=os.path.basename(backup.file_path)
            )
            return response
            
        except Exception as e:
            logger.error(f"Download failed: {str(e)}")
            raise Http404("Backup file not found")
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get backup statistics"""
        backup_manager = DatabaseBackupManager()
        stats = backup_manager.get_backup_statistics()
        return Response(stats)
    
    @action(detail=False, methods=['post'])
    def cleanup(self, request):
        """Clean up old backups"""
        retention_days = request.data.get('retention_days', 30)
        backup_manager = DatabaseBackupManager()
        cleaned_count = backup_manager.cleanup_old_backups(retention_days)
        
        return Response({
            'message': f'Cleaned up {cleaned_count} old backups',
            'cleaned_count': cleaned_count
        })


class BackupScheduleViewSet(viewsets.ModelViewSet):
    """Backup schedule management"""
    queryset = BackupSchedule.objects.all()
    serializer_class = BackupScheduleSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def run_now(self, request, pk=None):
        """Run scheduled backup immediately"""
        try:
            schedule = self.get_object()
            
            # Create backup based on schedule
            backup_data = {
                'name': f"{schedule.name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                'backup_type': schedule.backup_type,
                'description': f"Scheduled backup: {schedule.name}",
                'created_by': request.user
            }
            
            backup = DatabaseBackup.objects.create(**backup_data)
            
            # Start backup process
            backup_manager = DatabaseBackupManager()
            success = backup_manager.create_backup(backup.id, backup.backup_type)
            
            if success:
                schedule.last_run = timezone.now()
                schedule.save()
                
                serializer = DatabaseBackupSerializer(backup)
                return Response(serializer.data)
            else:
                return Response(
                    {'error': 'Scheduled backup failed'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"Scheduled backup failed: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SystemMaintenanceViewSet(viewsets.ModelViewSet):
    """System maintenance management"""
    queryset = SystemMaintenance.objects.all()
    serializer_class = SystemMaintenanceSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# Configuration Dashboard API
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsMasterAdmin])
def configuration_dashboard(request):
    """Get configuration dashboard data"""
    
    try:
        # System info
        system_info = {
            'database_engine': settings.DATABASES['default']['ENGINE'],
            'database_name': settings.DATABASES['default']['NAME'],
            'backup_directory': str(getattr(settings, 'BACKUP_DIR', '/tmp/backups')),
            'python_version': f"{os.sys.version_info.major}.{os.sys.version_info.minor}.{os.sys.version_info.micro}",
            'django_version': getattr(settings, 'DJANGO_VERSION', 'Unknown'),
        }
        
        # Configuration stats
        config_stats = {
            'total_configurations': SystemConfiguration.objects.count(),
            'categories': SystemConfiguration.objects.values_list('category', flat=True).distinct().count(),
            'encrypted_configs': SystemConfiguration.objects.filter(is_encrypted=True).count(),
        }
        
        # Backup stats
        backup_manager = DatabaseBackupManager()
        backup_stats = backup_manager.get_backup_statistics()
        
        # Recent backups
        recent_backups = DatabaseBackup.objects.order_by('-created_at')[:5]
        recent_backups_data = DatabaseBackupSerializer(recent_backups, many=True).data
        
        # Scheduled backups
        active_schedules = BackupSchedule.objects.filter(is_active=True).count()
        
        # Maintenance tasks
        pending_maintenance = SystemMaintenance.objects.filter(status='scheduled').count()
        
        return Response({
            'system_info': system_info,
            'config_stats': config_stats,
            'backup_stats': backup_stats,
            'recent_backups': recent_backups_data,
            'active_schedules': active_schedules,
            'pending_maintenance': pending_maintenance,
            'timestamp': timezone.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Configuration dashboard error: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsMasterAdmin])
def test_auth(request):
    """Test authentication endpoint"""
    return Response({
        'authenticated': request.user.is_authenticated,
        'user_id': request.user.id if request.user.is_authenticated else None,
        'username': request.user.username if request.user.is_authenticated else None,
        'has_master_admin': hasattr(request.user, 'master_admin'),
        'is_superuser': request.user.is_superuser if request.user.is_authenticated else False,
    })