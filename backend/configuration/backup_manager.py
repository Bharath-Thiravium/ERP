import os
import subprocess
import gzip
import shutil
import json
import hashlib
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from django.db import connection, transaction
from .models import DatabaseBackup, BackupUpload, RestoreOperation
from authentication.models import Company
from psycopg2 import sql as psql
import logging

logger = logging.getLogger(__name__)


class DatabaseBackupManager:
    """Advanced multi-tenant backup manager"""
    
    def __init__(self):
        self.backup_dir = str(getattr(settings, 'BACKUP_DIR', '/tmp/backups'))
        self.ensure_backup_directory()
        
        # Company table mappings for selective backups
        self.company_tables = {
            'authentication': [
                'authentication_company',
                'authentication_companyuser', 
                'authentication_companyservice',
                'authentication_companyserviceuser'
            ],
            'finance': [
                'finance_customer',
                'finance_customershippingaddress',
                'finance_products',
                'finance_quotations',
                'finance_quotation_items',
                'finance_purchase_orders',
                'finance_purchase_order_items',
                'finance_proforma_invoices',
                'finance_proforma_invoice_items',
                'finance_invoices',
                'finance_invoice_items',
                'finance_payments'
            ],
            'hr': [
                'hr_department',
                'hr_designation',
                'hr_employee',
                'hr_attendance',
                'hr_attendancelog',
                'hr_payrollcycle',
                'hr_payrollreport',
                'hr_payslip',
                'hr_performancereview'
            ],
            'inventory': [
                'inventory_category',
                'inventory_supplier',
                'inventory_warehouse',
                'inventory_product',
                'inventory_productvariant',
                'inventory_stocklevel',
                'inventory_stockmovement',
                'inventory_stockalert',
                'inventory_purchaseorder',
                'inventory_purchaseorderitem'
            ]
        }
    
    def ensure_backup_directory(self):
        """Ensure backup directory exists"""
        os.makedirs(self.backup_dir, exist_ok=True)
        
        # Create subdirectories for organization
        for subdir in ['system', 'company', 'service', 'uploads', 'temp']:
            os.makedirs(os.path.join(self.backup_dir, subdir), exist_ok=True)
    
    def create_backup(self, backup_id):
        """Create backup based on level and scope"""
        try:
            backup = DatabaseBackup.objects.get(id=backup_id)
            backup.status = 'running'
            backup.started_at = timezone.now()
            backup.save()
            
            # Route to appropriate backup method
            if backup.backup_level == 'system':
                success = self._create_system_backup(backup)
            elif backup.backup_level == 'company':
                success = self._create_company_backup(backup)
            elif backup.backup_level == 'service':
                success = self._create_service_backup(backup)
            elif backup.backup_level == 'table':
                success = self._create_table_backup(backup)
            elif backup.backup_level == 'incremental':
                success = self._create_incremental_backup(backup)
            else:
                raise ValueError(f"Unknown backup level: {backup.backup_level}")
            
            if success:
                backup.status = 'completed'
                backup.completed_at = timezone.now()
                backup.checksum = self._calculate_checksum(backup.file_path)
                backup.file_size = os.path.getsize(backup.file_path)
            else:
                backup.status = 'failed'
                backup.completed_at = timezone.now()
            
            backup.save()
            return success
            
        except Exception as e:
            backup.status = 'failed'
            backup.error_message = str(e)
            backup.completed_at = timezone.now()
            backup.save()
            logger.error(f"Backup {backup_id} failed: {str(e)}")
            return False
    
    def _create_system_backup(self, backup):
        """Create complete system backup"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"system_{backup.name}_{timestamp}.sql"
        filepath = os.path.join(self.backup_dir, 'system', filename)
        
        return self._execute_pg_dump(backup, filepath)
    
    def _create_company_backup(self, backup):
        """Create company-specific backup"""
        if not backup.company:
            raise ValueError("Company backup requires company selection")
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"company_{backup.company.id}_{backup.name}_{timestamp}.sql"
        filepath = os.path.join(self.backup_dir, 'company', filename)
        
        # Get all tables for this company
        tables_to_backup = []
        for service, tables in self.company_tables.items():
            if backup.service_type == 'all' or backup.service_type == service:
                tables_to_backup.extend(tables)
        
        return self._execute_selective_backup(backup, filepath, tables_to_backup, backup.company.id)
    
    def _create_service_backup(self, backup):
        """Create service-specific backup"""
        if backup.service_type not in self.company_tables:
            raise ValueError(f"Unknown service type: {backup.service_type}")
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"service_{backup.service_type}_{backup.name}_{timestamp}.sql"
        filepath = os.path.join(self.backup_dir, 'service', filename)
        
        tables_to_backup = self.company_tables[backup.service_type]
        company_id = backup.company.id if backup.company else None
        
        return self._execute_selective_backup(backup, filepath, tables_to_backup, company_id)
    
    def _create_table_backup(self, backup):
        """Create backup of specific tables"""
        if not backup.selected_tables:
            raise ValueError("Table backup requires table selection")
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"tables_{backup.name}_{timestamp}.sql"
        filepath = os.path.join(self.backup_dir, 'service', filename)
        
        company_id = backup.company.id if backup.company else None
        
        return self._execute_selective_backup(backup, filepath, backup.selected_tables, company_id)
    
    def _create_incremental_backup(self, backup):
        """Create incremental backup (changes since last backup)"""
        # Find last backup for comparison
        last_backup = DatabaseBackup.objects.filter(
            backup_level=backup.backup_level,
            company=backup.company,
            status='completed',
            created_at__lt=backup.created_at
        ).order_by('-created_at').first()
        
        if not last_backup:
            # No previous backup, create full backup
            return self._create_system_backup(backup)
        
        # For now, implement as selective backup with timestamp filtering
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"incremental_{backup.name}_{timestamp}.sql"
        filepath = os.path.join(self.backup_dir, 'service', filename)
        
        # Get tables that have changed since last backup
        tables_to_backup = self._get_changed_tables(last_backup.completed_at)
        company_id = backup.company.id if backup.company else None
        
        return self._execute_selective_backup(backup, filepath, tables_to_backup, company_id)
    
    def _execute_pg_dump(self, backup, filepath):
        """Execute PostgreSQL dump command"""
        db_settings = settings.DATABASES['default']
        
        cmd = [
            'pg_dump',
            '-h', db_settings['HOST'],
            '-p', str(db_settings['PORT']),
            '-U', db_settings['USER'],
            '-d', db_settings['NAME'],
            '-f', filepath,
            '--verbose'
        ]
        
        # Add backup type specific options
        if backup.backup_type == 'schema':
            cmd.append('--schema-only')
        elif backup.backup_type == 'data':
            cmd.append('--data-only')
        
        env = os.environ.copy()
        env['PGPASSWORD'] = db_settings['PASSWORD']
        
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        if result.returncode == 0:
            # Compress if needed
            if backup.compression == 'gzip':
                compressed_filepath = f"{filepath}.gz"
                with open(filepath, 'rb') as f_in:
                    with gzip.open(compressed_filepath, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                os.remove(filepath)
                backup.file_path = compressed_filepath
            else:
                backup.file_path = filepath
            
            return True
        else:
            backup.error_message = result.stderr
            return False
    
    def _execute_selective_backup(self, backup, filepath, tables, company_id=None):
        """Execute selective backup for specific tables and company"""
        db_settings = settings.DATABASES['default']
        
        # Create temporary SQL file with selective data
        temp_sql = filepath + '.temp'
        
        try:
            with open(temp_sql, 'w') as f:
                # Write header
                f.write("-- Selective Backup\n")
                f.write(f"-- Created: {timezone.now()}\n")
                f.write(f"-- Backup Level: {backup.backup_level}\n")
                f.write(f"-- Company ID: {company_id}\n")
                f.write(f"-- Tables: {', '.join(tables)}\n\n")
                
                # For each table, export structure and data
                for table in tables:
                    if company_id and self._table_has_company_field(table):
                        # Export company-specific data
                        self._export_company_table_data(f, table, company_id, backup.backup_type)
                    else:
                        # Export all data for this table
                        self._export_table_data(f, table, backup.backup_type)
            
            # Compress if needed
            if backup.compression == 'gzip':
                with open(temp_sql, 'rb') as f_in:
                    with gzip.open(filepath + '.gz', 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                os.remove(temp_sql)
                backup.file_path = filepath + '.gz'
            else:
                shutil.move(temp_sql, filepath)
                backup.file_path = filepath
            
            return True
            
        except Exception as e:
            backup.error_message = str(e)
            if os.path.exists(temp_sql):
                os.remove(temp_sql)
            return False
    
    def _table_has_company_field(self, table_name):
        """Check if table has company_id field"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = %s AND column_name = 'company_id'
            """, [table_name])
            return cursor.fetchone() is not None
    
    def _export_company_table_data(self, file_obj, table_name, company_id, backup_type):
        """Export company-specific table data"""
        if backup_type == 'schema':
            return
        
        with connection.cursor() as cursor:
            # Get table structure first
            if backup_type != 'data':
                cursor.execute(
                    psql.SQL("SELECT * FROM {} WHERE company_id = %s LIMIT 0").format(psql.Identifier(table_name)),
                    [company_id]
                )
                columns = [desc[0] for desc in cursor.description]

                file_obj.write(f"-- Table: {table_name} (Company: {company_id})\n")
                file_obj.write(f"DELETE FROM {table_name} WHERE company_id = {company_id};\n")

            # Export data
            cursor.execute(
                psql.SQL("SELECT * FROM {} WHERE company_id = %s").format(psql.Identifier(table_name)),
                [company_id]
            )
            rows = cursor.fetchall()
            
            if rows:
                columns = [desc[0] for desc in cursor.description]
                for row in rows:
                    values = []
                    for value in row:
                        if value is None:
                            values.append('NULL')
                        elif isinstance(value, str):
                            escaped_value = value.replace("'", "''")
                            values.append(f"'{escaped_value}'")
                        else:
                            values.append(str(value))
                    
                    file_obj.write(f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({', '.join(values)});\n")
            
            file_obj.write("\n")
    
    def _export_table_data(self, file_obj, table_name, backup_type):
        """Export complete table data"""
        if backup_type == 'schema':
            return
        
        with connection.cursor() as cursor:
            cursor.execute(psql.SQL("SELECT * FROM {}").format(psql.Identifier(table_name)))
            rows = cursor.fetchall()
            
            if rows:
                columns = [desc[0] for desc in cursor.description]
                file_obj.write(f"-- Table: {table_name}\n")
                file_obj.write(f"DELETE FROM {table_name};\n")
                
                for row in rows:
                    values = []
                    for value in row:
                        if value is None:
                            values.append('NULL')
                        elif isinstance(value, str):
                            escaped_value = value.replace("'", "''")
                            values.append(f"'{escaped_value}'")
                        else:
                            values.append(str(value))
                    
                    file_obj.write(f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({', '.join(values)});\n")
            
            file_obj.write("\n")
    
    def _get_changed_tables(self, since_timestamp):
        """Get tables that have changed since timestamp"""
        return list(self.company_tables.keys())
    
    def _calculate_checksum(self, filepath):
        """Calculate MD5 checksum of file"""
        hash_md5 = hashlib.md5()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    
    def restore_backup(self, restore_operation_id):
        """Restore from backup with rollback capability"""
        try:
            restore_op = RestoreOperation.objects.get(id=restore_operation_id)
            restore_op.status = 'pre_backup'
            restore_op.started_at = timezone.now()
            restore_op.save()
            
            # Create pre-restore backup for rollback
            pre_backup = self._create_pre_restore_backup(restore_op)
            if pre_backup:
                restore_op.pre_restore_backup = pre_backup
                restore_op.save()
            
            # Execute restore based on type
            restore_op.status = 'restoring'
            restore_op.save()
            
            success = self._execute_restore(restore_op)
            
            if success:
                restore_op.status = 'completed'
                restore_op.completed_at = timezone.now()
            else:
                restore_op.status = 'failed'
                restore_op.completed_at = timezone.now()
            
            restore_op.save()
            return success
            
        except Exception as e:
            restore_op.status = 'failed'
            restore_op.error_message = str(e)
            restore_op.completed_at = timezone.now()
            restore_op.save()
            logger.error(f"Restore operation {restore_operation_id} failed: {str(e)}")
            return False
    
    def _create_pre_restore_backup(self, restore_op):
        """Create backup before restore for rollback"""
        backup_name = f"pre_restore_{restore_op.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        backup = DatabaseBackup.objects.create(
            name=backup_name,
            description=f"Pre-restore backup for operation {restore_op.id}",
            backup_level='system',
            backup_type='full',
            compression='gzip',
            company=restore_op.company,
            created_by=restore_op.created_by
        )
        
        success = self.create_backup(backup.id)
        return backup if success else None
    
    def _execute_restore(self, restore_op):
        """Execute the actual restore operation"""
        source_file = self._get_restore_source_file(restore_op)
        if not source_file:
            return False
        
        db_settings = settings.DATABASES['default']
        
        # Prepare file for restore
        restore_file = source_file
        if source_file.endswith('.gz'):
            restore_file = source_file.replace('.gz', '')
            with gzip.open(source_file, 'rb') as f_in:
                with open(restore_file, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
        
        try:
            # Detect if this is a pg_dump backup (has CREATE TABLE statements)
            is_pg_dump = False
            check_file = restore_file
            with open(check_file, 'r', errors='ignore') as f:
                for line in f:
                    if 'PostgreSQL database dump' in line:
                        is_pg_dump = True
                        break
                    if len(line) > 0:
                        break

            env = os.environ.copy()
            env['PGPASSWORD'] = db_settings['PASSWORD']

            if is_pg_dump:
                # Step 1: Drop all existing tables to avoid "already exists" errors
                drop_cmd = [
                    'psql',
                    '-h', db_settings['HOST'],
                    '-p', str(db_settings['PORT']),
                    '-U', db_settings['USER'],
                    '-d', db_settings['NAME'],
                    '-c', "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"
                ]
                subprocess.run(drop_cmd, env=env, capture_output=True, text=True)

            cmd = [
                'psql',
                '-h', db_settings['HOST'],
                '-p', str(db_settings['PORT']),
                '-U', db_settings['USER'],
                '-d', db_settings['NAME'],
                '-f', restore_file
            ]

            result = subprocess.run(cmd, env=env, capture_output=True, text=True)

            if source_file.endswith('.gz') and restore_file != source_file:
                os.remove(restore_file)

            return result.returncode == 0
            
        except Exception as e:
            restore_op.error_message = str(e)
            return False
    
    def _get_restore_source_file(self, restore_op):
        """Get source file for restore operation"""
        if restore_op.source_backup:
            return restore_op.source_backup.file_path
        elif restore_op.source_upload:
            return restore_op.source_upload.file_path
        return None
    
    def validate_uploaded_backup(self, upload_id):
        """Validate uploaded backup file"""
        try:
            upload = BackupUpload.objects.get(id=upload_id)
            upload.status = 'validating'
            upload.save()
            
            # Basic file validation
            if not os.path.exists(upload.file_path):
                upload.status = 'failed'
                upload.validation_errors = ['File not found']
                upload.save()
                return False
            
            # Check file format
            if not upload.file_path.endswith(('.sql', '.sql.gz')):
                upload.status = 'failed'
                upload.validation_errors = ['Invalid file format']
                upload.save()
                return False
            
            # Verify checksum
            calculated_checksum = self._calculate_checksum(upload.file_path)
            if calculated_checksum != upload.checksum:
                upload.status = 'failed'
                upload.validation_errors = ['Checksum mismatch']
                upload.save()
                return False
            
            # Parse backup metadata
            metadata = self._parse_backup_metadata(upload.file_path)
            upload.backup_metadata = metadata
            upload.detected_backup_level = metadata.get('backup_level', 'unknown')
            upload.detected_service_type = metadata.get('service_type', 'unknown')
            
            upload.status = 'ready'
            upload.is_valid_backup = True
            upload.save()
            
            return True
            
        except Exception as e:
            upload.status = 'failed'
            upload.validation_errors = [str(e)]
            upload.save()
            return False
    
    def _parse_backup_metadata(self, filepath):
        """Parse backup file to extract metadata"""
        metadata = {}
        
        try:
            if filepath.endswith('.gz'):
                with gzip.open(filepath, 'rt') as f:
                    first_lines = [f.readline() for _ in range(10)]
            else:
                with open(filepath, 'r') as f:
                    first_lines = [f.readline() for _ in range(10)]
            
            # Parse header comments for metadata
            for line in first_lines:
                if line.startswith('-- Backup Level:'):
                    metadata['backup_level'] = line.split(':')[1].strip()
                elif line.startswith('-- Company ID:'):
                    metadata['company_id'] = line.split(':')[1].strip()
                elif line.startswith('-- Tables:'):
                    metadata['tables'] = line.split(':')[1].strip()
            
        except Exception as e:
            logger.error(f"Failed to parse backup metadata: {str(e)}")
        
        return metadata
    
    def get_backup_statistics(self):
        """Get backup statistics"""
        total_backups = DatabaseBackup.objects.count()
        successful_backups = DatabaseBackup.objects.filter(status='completed').count()
        failed_backups = DatabaseBackup.objects.filter(status='failed').count()
        
        # Calculate total backup size
        from django.db import models as django_models
        total_size = DatabaseBackup.objects.filter(
            status='completed',
            file_size__isnull=False
        ).aggregate(total=django_models.Sum('file_size'))['total'] or 0
        
        # Recent backup success rate
        recent_backups = DatabaseBackup.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=30)
        )
        recent_success_rate = 0
        if recent_backups.count() > 0:
            recent_successful = recent_backups.filter(status='completed').count()
            recent_success_rate = (recent_successful / recent_backups.count()) * 100
        
        return {
            'total_backups': total_backups,
            'successful_backups': successful_backups,
            'failed_backups': failed_backups,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'recent_success_rate': round(recent_success_rate, 1)
        }
    
    def cleanup_old_backups(self, retention_days=30):
        """Clean up old backup files"""
        cutoff_date = timezone.now() - timedelta(days=retention_days)
        old_backups = DatabaseBackup.objects.filter(
            created_at__lt=cutoff_date,
            status='completed'
        )
        
        cleaned_count = 0
        for backup in old_backups:
            try:
                if backup.file_path and os.path.exists(backup.file_path):
                    os.remove(backup.file_path)
                backup.delete()
                cleaned_count += 1
            except Exception as e:
                logger.error(f"Failed to clean up backup {backup.id}: {str(e)}")
        
        logger.info(f"Cleaned up {cleaned_count} old backups")
        return cleaned_count