import os
import pandas as pd
from django.core.management.base import BaseCommand
from django.conf import settings
from finance.models import HSNCode, SACCode


class Command(BaseCommand):
    help = 'Import HSN and SAC codes from Excel files'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hsn-file',
            type=str,
            default='frontend/src/assets/HSN_SAC.xlsx',
            help='Path to HSN codes Excel file'
        )
        parser.add_argument(
            '--sac-file',
            type=str,
            default='frontend/src/assets/sac.xlsx',
            help='Path to SAC codes Excel file'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing codes before importing'
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing HSN and SAC codes...')
            HSNCode.objects.all().delete()
            SACCode.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Cleared existing codes'))

        # Import HSN codes
        hsn_file_path = os.path.join(settings.BASE_DIR.parent, options['hsn_file'])
        if os.path.exists(hsn_file_path):
            self.import_hsn_codes(hsn_file_path)
        else:
            self.stdout.write(self.style.ERROR(f'HSN file not found: {hsn_file_path}'))

        # Import SAC codes
        sac_file_path = os.path.join(settings.BASE_DIR.parent, options['sac_file'])
        if os.path.exists(sac_file_path):
            self.import_sac_codes(sac_file_path)
        else:
            self.stdout.write(self.style.ERROR(f'SAC file not found: {sac_file_path}'))

    def import_hsn_codes(self, file_path):
        """Import HSN codes from Excel file"""
        self.stdout.write(f'Importing HSN codes from {file_path}...')
        
        try:
            # Read Excel file
            df = pd.read_excel(file_path)
            
            # Print column names to understand the structure
            self.stdout.write(f'Columns in HSN file: {list(df.columns)}')
            
            # Try to identify the correct columns (adjust based on actual file structure)
            code_col = None
            desc_col = None
            gst_col = None
            
            for col in df.columns:
                col_lower = str(col).lower()
                if 'hsn' in col_lower or 'code' in col_lower:
                    code_col = col
                elif 'description' in col_lower or 'desc' in col_lower:
                    desc_col = col
                elif 'gst' in col_lower or 'rate' in col_lower or 'tax' in col_lower:
                    gst_col = col
            
            if not code_col:
                self.stdout.write(self.style.ERROR('Could not find HSN code column'))
                return
            
            imported_count = 0
            for index, row in df.iterrows():
                try:
                    code = str(row[code_col]).strip()
                    description = str(row[desc_col]).strip() if desc_col else ''
                    gst_rate = float(row[gst_col]) if gst_col and pd.notna(row[gst_col]) else 0.0
                    
                    if code and code != 'nan':
                        hsn_code, created = HSNCode.objects.get_or_create(
                            code=code,
                            defaults={
                                'description': description,
                                'gst_rate': gst_rate
                            }
                        )
                        if created:
                            imported_count += 1
                        
                except Exception as e:
                    self.stdout.write(f'Error processing row {index}: {e}')
                    continue
            
            self.stdout.write(self.style.SUCCESS(f'Imported {imported_count} HSN codes'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error importing HSN codes: {e}'))

    def import_sac_codes(self, file_path):
        """Import SAC codes from Excel file"""
        self.stdout.write(f'Importing SAC codes from {file_path}...')
        
        try:
            # Read Excel file
            df = pd.read_excel(file_path)
            
            # Print column names to understand the structure
            self.stdout.write(f'Columns in SAC file: {list(df.columns)}')
            
            # For SAC file, use specific column mapping based on the file structure
            # Column 1 (Unnamed: 1) contains the actual SAC codes
            # Column 2 (Unnamed: 2) contains the service descriptions
            code_col = df.columns[1] if len(df.columns) > 1 else df.columns[0]  # Second column for SAC codes
            desc_col = df.columns[2] if len(df.columns) > 2 else None  # Third column for descriptions
            service_col = desc_col  # Use description as service name
            gst_col = None  # No GST rate in this file

            self.stdout.write(f'Using column "{code_col}" as SAC code column')
            self.stdout.write(f'Using column "{desc_col}" as description/service name column')

            if not code_col:
                self.stdout.write(self.style.ERROR('Could not find SAC code column'))
                return
            
            imported_count = 0
            for index, row in df.iterrows():
                try:
                    code = str(row[code_col]).strip()
                    service_name = str(row[service_col]).strip() if service_col else ''
                    description = str(row[desc_col]).strip() if desc_col else ''
                    gst_rate = float(row[gst_col]) if gst_col and pd.notna(row[gst_col]) else 0.0
                    
                    # Only import rows with valid numeric SAC codes
                    if code and code != 'nan' and code.isdigit() and len(code) >= 4:
                        sac_code, created = SACCode.objects.get_or_create(
                            code=code,
                            defaults={
                                'service_name': service_name,
                                'description': description,
                                'gst_rate': gst_rate
                            }
                        )
                        if created:
                            imported_count += 1
                        
                except Exception as e:
                    self.stdout.write(f'Error processing row {index}: {e}')
                    continue
            
            self.stdout.write(self.style.SUCCESS(f'Imported {imported_count} SAC codes'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error importing SAC codes: {e}'))
