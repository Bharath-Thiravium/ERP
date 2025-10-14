import os
import json
from datetime import datetime, timedelta
from django.http import JsonResponse, FileResponse, Http404
from django.utils import timezone
from django.db import models
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from authentication.permissions import IsMasterAdmin
from authentication.models import Company
from .models import DatabaseBackup, BackupUpload, RestoreOperation, SystemConfiguration, BackupSchedule, SystemMaintenance
from .serializers import (
    SystemConfigurationSerializer, DatabaseBackupSerializer, BackupUploadSerializer,
    RestoreOperationSerializer, BackupScheduleSerializer, SystemMaintenanceSerializer
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
        categories = SystemConfiguration.objects.values_list('category', flat=True).distinct().order_by('category')
        return Response({'categories': list(set(categories))})
    
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
    """Enhanced database backup management with multi-tenant support"""
    queryset = DatabaseBackup.objects.all()
    serializer_class = DatabaseBackupSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    
    def get_queryset(self):
        """Filter backups based on user permissions"""
        queryset = super().get_queryset()
        
        # Add filters based on query parameters
        backup_level = self.request.query_params.get('backup_level')
        company_id = self.request.query_params.get('company_id')
        service_type = self.request.query_params.get('service_type')
        
        if backup_level:
            queryset = queryset.filter(backup_level=backup_level)
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        if service_type:
            queryset = queryset.filter(service_type=service_type)
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['post'])
    def create_system_backup(self, request):
        """Create complete system backup"""
        try:
            backup_data = {
                'name': request.data.get('name', f"system_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"),
                'description': request.data.get('description', ''),
                'backup_level': 'system',
                'backup_type': request.data.get('backup_type', 'full'),
                'service_type': 'all',
                'compression': request.data.get('compression', 'gzip'),
                'created_by': request.user
            }
            
            backup = DatabaseBackup.objects.create(**backup_data)
            
            # Start backup process
            backup_manager = DatabaseBackupManager()
            success = backup_manager.create_backup(backup.id)
            
            if success:
                return Response({
                    'id': backup.id,
                    'name': backup.name,
                    'status': backup.status,
                    'backup_level': backup.backup_level
                }, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {'error': 'System backup creation failed'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"System backup creation failed: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def create_company_backup(self, request):
        """Create company-specific backup"""
        try:
            company_id = request.data.get('company_id')
            if not company_id:
                return Response(
                    {'error': 'Company ID is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            company = Company.objects.get(id=company_id)
            
            backup_data = {
                'name': request.data.get('name', f"company_{company.name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"),
                'description': request.data.get('description', f'Backup for {company.name}'),
                'backup_level': 'company',
                'backup_type': request.data.get('backup_type', 'full'),
                'service_type': request.data.get('service_type', 'all'),
                'company': company,
                'compression': request.data.get('compression', 'gzip'),
                'created_by': request.user
            }
            
            backup = DatabaseBackup.objects.create(**backup_data)
            
            # Start backup process
            backup_manager = DatabaseBackupManager()
            success = backup_manager.create_backup(backup.id)
            
            if success:
                return Response({
                    'id': backup.id,
                    'name': backup.name,
                    'status': backup.status,
                    'backup_level': backup.backup_level,
                    'company': company.name
                }, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {'error': 'Company backup creation failed'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Company backup creation failed: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def create_service_backup(self, request):
        """Create service-specific backup"""
        try:
            service_type = request.data.get('service_type')
            if not service_type or service_type not in ['finance', 'hr', 'inventory']:
                return Response(
                    {'error': 'Valid service type is required (finance, hr, or inventory)'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            company_id = request.data.get('company_id')
            if not company_id:
                return Response(
                    {'error': 'Company ID is required for service backup'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                company = Company.objects.get(id=company_id, approval_status='approved')
            except Company.DoesNotExist:
                return Response(
                    {'error': 'Company not found or not approved'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            backup_data = {
                'name': request.data.get('name', f"service_{service_type}_{company.name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"),
                'description': request.data.get('description', f'Backup for {service_type} service of {company.name}'),
                'backup_level': 'service',
                'backup_type': request.data.get('backup_type', 'full'),
                'service_type': service_type,
                'company': company,
                'compression': request.data.get('compression', 'gzip'),
                'created_by': request.user
            }
            
            backup = DatabaseBackup.objects.create(**backup_data)
            
            # Start backup process
            backup_manager = DatabaseBackupManager()
            success = backup_manager.create_backup(backup.id)
            
            if success:
                return Response({
                    'id': backup.id,
                    'name': backup.name,
                    'status': backup.status,
                    'backup_level': backup.backup_level,
                    'service_type': service_type,
                    'company': company.name,
                    'company_id': company.id
                }, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {'error': 'Service backup creation failed'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"Service backup creation failed: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def create_table_backup(self, request):
        """Create backup of specific tables"""
        try:
            selected_tables = request.data.get('selected_tables', [])
            if not selected_tables:
                return Response(
                    {'error': 'At least one table must be selected'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            company_id = request.data.get('company_id')
            company = None
            if company_id:
                company = Company.objects.get(id=company_id)
            
            backup_data = {
                'name': request.data.get('name', f"tables_{datetime.now().strftime('%Y%m%d_%H%M%S')}"),
                'description': request.data.get('description', f'Backup of selected tables'),
                'backup_level': 'table',
                'backup_type': request.data.get('backup_type', 'full'),
                'selected_tables': selected_tables,
                'company': company,
                'compression': request.data.get('compression', 'gzip'),
                'created_by': request.user
            }
            
            backup = DatabaseBackup.objects.create(**backup_data)
            
            # Start backup process
            backup_manager = DatabaseBackupManager()
            success = backup_manager.create_backup(backup.id)
            
            if success:
                return Response({
                    'id': backup.id,
                    'name': backup.name,
                    'status': backup.status,
                    'backup_level': backup.backup_level,
                    'selected_tables': selected_tables
                }, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {'error': 'Table backup creation failed'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"Table backup creation failed: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download backup file with enhanced security"""
        try:
            backup = self.get_object()
            
            if backup.status != 'completed' or not backup.file_path:
                raise Http404("Backup file not found")
            
            if not os.path.exists(backup.file_path):
                raise Http404("Backup file not found on disk")
            
            # Log download activity
            logger.info(f"Backup download: {backup.name} by user {request.user.id}")
            
            response = FileResponse(
                open(backup.file_path, 'rb'),
                as_attachment=True,
                filename=os.path.basename(backup.file_path)
            )
            
            # Add security headers
            response['X-Content-Type-Options'] = 'nosniff'
            response['X-Frame-Options'] = 'DENY'
            
            return response
            
        except Exception as e:
            logger.error(f"Download failed: {str(e)}")
            raise Http404("Backup file not found")
    
    @action(detail=False, methods=['get'])
    def available_tables(self, request):
        """Get list of available tables for selective backup"""
        try:
            from django.db import connection
            
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_type = 'BASE TABLE'
                    ORDER BY table_name
                """)
                tables = [row[0] for row in cursor.fetchall()]
            
            # Group tables by service
            grouped_tables = {
                'authentication': [],
                'finance': [],
                'hr': [],
                'inventory': [],
                'system': []
            }
            
            backup_manager = DatabaseBackupManager()
            
            for table in tables:
                categorized = False
                for service, service_tables in backup_manager.company_tables.items():
                    if any(table.startswith(st.split('_')[0]) for st in service_tables):
                        grouped_tables[service].append(table)
                        categorized = True
                        break
                
                if not categorized:
                    grouped_tables['system'].append(table)
            
            return Response(grouped_tables)
            
        except Exception as e:
            logger.error(f"Failed to get available tables: {str(e)}")
            return Response(
                {'error': 'Failed to retrieve table list'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def companies(self, request):
        """Get list of companies for backup selection"""
        try:
            companies = Company.objects.filter(approval_status='approved').values('id', 'name', 'email')
            return Response(list(companies))
        except Exception as e:
            logger.error(f"Failed to retrieve companies: {str(e)}")
            return Response(
                {'error': 'Failed to retrieve companies'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
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


class BackupUploadViewSet(viewsets.ModelViewSet):
    """Handle backup file uploads"""
    queryset = BackupUpload.objects.all()
    serializer_class = BackupUploadSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    parser_classes = [MultiPartParser, FormParser]
    
    @action(detail=False, methods=['post'])
    def upload_backup(self, request):
        """Upload backup file for restoration"""
        try:
            uploaded_file = request.FILES.get('backup_file')
            if not uploaded_file:
                return Response(
                    {'error': 'No file uploaded'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate file
            if not uploaded_file.name.endswith(('.sql', '.sql.gz')):
                return Response(
                    {'error': 'Invalid file format. Only .sql and .sql.gz files are allowed'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check file size (max 500MB)
            max_size = 500 * 1024 * 1024
            if uploaded_file.size > max_size:
                return Response(
                    {'error': 'File too large. Maximum size is 500MB'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Save file
            upload_dir = os.path.join(settings.BACKUP_DIR, 'uploads')
            os.makedirs(upload_dir, exist_ok=True)
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"upload_{timestamp}_{uploaded_file.name}"
            filepath = os.path.join(upload_dir, filename)
            
            with open(filepath, 'wb+') as destination:
                for chunk in uploaded_file.chunks():
                    destination.write(chunk)
            
            # Calculate checksum
            import hashlib
            hash_md5 = hashlib.md5()
            with open(filepath, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_md5.update(chunk)
            checksum = hash_md5.hexdigest()
            
            # Create upload record
            upload = BackupUpload.objects.create(
                name=request.data.get('name', uploaded_file.name),
                original_filename=uploaded_file.name,
                file_path=filepath,
                file_size=uploaded_file.size,
                checksum=checksum,
                uploaded_by=request.user
            )
            
            # Validate uploaded backup
            backup_manager = DatabaseBackupManager()
            backup_manager.validate_uploaded_backup(upload.id)
            
            return Response({
                'id': upload.id,
                'name': upload.name,
                'status': upload.status,
                'file_size_mb': round(upload.file_size / (1024 * 1024), 2)
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Backup upload failed: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RestoreOperationViewSet(viewsets.ModelViewSet):
    """Handle restore operations with rollback capability"""
    queryset = RestoreOperation.objects.all()
    serializer_class = RestoreOperationSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    
    @action(detail=False, methods=['post'])
    def restore_from_backup(self, request):
        """Restore from existing backup"""
        try:
            backup_id = request.data.get('backup_id')
            restore_type = request.data.get('restore_type', 'full_replace')
            
            if not backup_id:
                return Response(
                    {'error': 'Backup ID is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            backup = DatabaseBackup.objects.get(id=backup_id)
            
            # Create restore operation
            restore_op = RestoreOperation.objects.create(
                name=f"restore_{backup.name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                restore_type=restore_type,
                source_backup=backup,
                company=backup.company,
                service_type=backup.service_type,
                selected_tables=backup.selected_tables,
                created_by=request.user
            )
            
            # Start restore process
            backup_manager = DatabaseBackupManager()
            success = backup_manager.restore_backup(restore_op.id)
            
            if success:
                return Response({
                    'id': restore_op.id,
                    'name': restore_op.name,
                    'status': restore_op.status,
                    'restore_type': restore_type
                }, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {'error': 'Restore operation failed'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except DatabaseBackup.DoesNotExist:
            return Response(
                {'error': 'Backup not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Restore operation failed: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def restore_from_upload(self, request):
        """Restore from uploaded backup file"""
        try:
            upload_id = request.data.get('upload_id')
            restore_type = request.data.get('restore_type', 'full_replace')
            
            if not upload_id:
                return Response(
                    {'error': 'Upload ID is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            upload = BackupUpload.objects.get(id=upload_id)
            
            if upload.status != 'ready':
                return Response(
                    {'error': 'Upload is not ready for restore'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create restore operation
            restore_op = RestoreOperation.objects.create(
                name=f"restore_upload_{upload.name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                restore_type=restore_type,
                source_upload=upload,
                company=upload.company,
                created_by=request.user
            )
            
            # Start restore process
            backup_manager = DatabaseBackupManager()
            success = backup_manager.restore_backup(restore_op.id)
            
            if success:
                return Response({
                    'id': restore_op.id,
                    'name': restore_op.name,
                    'status': restore_op.status,
                    'restore_type': restore_type
                }, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {'error': 'Restore operation failed'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except BackupUpload.DoesNotExist:
            return Response(
                {'error': 'Upload not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Restore from upload failed: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def rollback(self, request, pk=None):
        """Rollback restore operation"""
        try:
            restore_op = self.get_object()
            
            if not restore_op.pre_restore_backup:
                return Response(
                    {'error': 'No pre-restore backup available for rollback'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create rollback restore operation
            rollback_op = RestoreOperation.objects.create(
                name=f"rollback_{restore_op.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                restore_type='full_replace',
                source_backup=restore_op.pre_restore_backup,
                created_by=request.user
            )
            
            # Execute rollback
            backup_manager = DatabaseBackupManager()
            success = backup_manager.restore_backup(rollback_op.id)
            
            if success:
                restore_op.status = 'rolled_back'
                restore_op.save()
                
                return Response({
                    'message': 'Rollback completed successfully',
                    'rollback_operation_id': rollback_op.id
                })
            else:
                return Response(
                    {'error': 'Rollback operation failed'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"Rollback failed: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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
            success = backup_manager.create_backup(backup.id)
            
            if success:
                schedule.last_run = timezone.now()
                schedule.save()
                
                return Response({
                    'id': backup.id,
                    'name': backup.name,
                    'status': backup.status
                })
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
        }
        
        # Backup stats
        backup_manager = DatabaseBackupManager()
        backup_stats = backup_manager.get_backup_statistics()
        
        # Recent backups
        recent_backups = DatabaseBackup.objects.order_by('-created_at')[:5]
        recent_backups_data = []
        for backup in recent_backups:
            recent_backups_data.append({
                'id': backup.id,
                'name': backup.name,
                'status': backup.status,
                'backup_level': backup.backup_level,
                'created_at': backup.created_at,
                'file_size_mb': backup.file_size_mb
            })
        
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