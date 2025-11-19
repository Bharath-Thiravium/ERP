import csv
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from finance.models import HSNCode, SACCode


class Command(BaseCommand):
    help = 'Clear HSN codes and import from CSV, update missing SAC codes'

    def handle(self, *args, **options):
        # Step 1: Clear all HSN codes
        self.stdout.write('Clearing all HSN codes...')
        hsn_deleted = HSNCode.objects.all().delete()[0]
        self.stdout.write(self.style.SUCCESS(f'Deleted {hsn_deleted} HSN codes'))

        # Step 2: Import HSN codes from CSV
        hsn_file_path = os.path.join(settings.BASE_DIR.parent, 'HSN.csv')
        if os.path.exists(hsn_file_path):
            self.import_hsn_from_csv(hsn_file_path)
        else:
            self.stdout.write(self.style.ERROR(f'HSN file not found: {hsn_file_path}'))

        # Step 3: Compare and update SAC codes
        sac_file_path = os.path.join(settings.BASE_DIR.parent, 'SAC.csv')
        if os.path.exists(sac_file_path):
            self.update_missing_sac_codes(sac_file_path)
        else:
            self.stdout.write(self.style.ERROR(f'SAC file not found: {sac_file_path}'))

    def import_hsn_from_csv(self, file_path):
        """Import all HSN codes from CSV file"""
        self.stdout.write(f'Importing HSN codes from {file_path}...')
        
        imported_count = 0
        skipped_count = 0
        
        with open(file_path, 'r', encoding='utf-8-sig') as csvfile:
            reader = csv.DictReader(csvfile)
            
            for row in reader:
                try:
                    code = str(row['code']).strip()
                    description = str(row['description']).strip()
                    
                    if code and code != 'nan' and len(code) >= 2:
                        # Set default GST rate based on code patterns
                        gst_rate = self.get_default_gst_rate_hsn(code)
                        
                        HSNCode.objects.create(
                            code=code,
                            description=description,
                            gst_rate=gst_rate
                        )
                        imported_count += 1
                    else:
                        skipped_count += 1
                        
                except Exception as e:
                    self.stdout.write(f'Error importing HSN {row}: {e}')
                    skipped_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'Imported {imported_count} HSN codes, skipped {skipped_count}'))

    def update_missing_sac_codes(self, file_path):
        """Compare SAC codes and add missing ones"""
        self.stdout.write(f'Comparing SAC codes with {file_path}...')
        
        # Get existing SAC codes
        existing_codes = set(SACCode.objects.values_list('code', flat=True))
        
        csv_codes = set()
        missing_codes = []
        
        with open(file_path, 'r', encoding='utf-8-sig') as csvfile:
            reader = csv.DictReader(csvfile)
            
            for row in reader:
                try:
                    code = str(row['code']).strip()
                    description = str(row['description']).strip()
                    
                    if code and code != 'nan' and len(code) >= 4:
                        csv_codes.add(code)
                        
                        if code not in existing_codes:
                            missing_codes.append({
                                'code': code,
                                'description': description
                            })
                            
                except Exception as e:
                    continue
        
        # Import missing SAC codes
        imported_count = 0
        for sac_data in missing_codes:
            try:
                gst_rate = self.get_default_gst_rate_sac(sac_data['code'])
                
                SACCode.objects.create(
                    code=sac_data['code'],
                    service_name=sac_data['description'][:255],  # Limit length
                    description=sac_data['description'],
                    gst_rate=gst_rate
                )
                imported_count += 1
                
            except Exception as e:
                self.stdout.write(f'Error importing SAC {sac_data}: {e}')
        
        self.stdout.write(self.style.SUCCESS(f'Found {len(csv_codes)} codes in CSV'))
        self.stdout.write(self.style.SUCCESS(f'Existing codes in DB: {len(existing_codes)}'))
        self.stdout.write(self.style.SUCCESS(f'Missing codes found: {len(missing_codes)}'))
        self.stdout.write(self.style.SUCCESS(f'Imported {imported_count} missing SAC codes'))

    def get_default_gst_rate_hsn(self, code):
        """Get default GST rate for HSN code"""
        # Food items - 5%
        if code.startswith(('01', '02', '03', '04', '05', '10', '11', '17')):
            return 5.00
        # Textiles - 12%
        elif code.startswith(('50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63')):
            return 12.00
        # Medicines - 12%
        elif code.startswith('30'):
            return 12.00
        # Paper - 12%
        elif code.startswith(('48')):
            return 12.00
        # Electronics - 18%
        elif code.startswith(('84', '85')):
            return 18.00
        # Automobiles - 28%
        elif code.startswith('87'):
            return 28.00
        # Cement - 28%
        elif code.startswith('2523'):
            return 28.00
        # Default - 18%
        else:
            return 18.00

    def get_default_gst_rate_sac(self, code):
        """Get default GST rate for SAC code"""
        # Construction - 12%
        if code.startswith(('9954', '9972')):
            return 12.00
        # Transportation - 5%
        elif code.startswith('9965'):
            return 5.00
        # IT and Professional services - 18%
        elif code.startswith(('9982', '9983')):
            return 18.00
        # Default - 18%
        else:
            return 18.00