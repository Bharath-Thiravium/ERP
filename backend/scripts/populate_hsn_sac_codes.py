#!/usr/bin/env python3
"""
Script to populate HSN and SAC codes with GST rates
This script adds essential HSN codes for products and SAC codes for services
"""

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from finance.models import HSNCode, SACCode

def populate_hsn_codes():
    """Populate common HSN codes for products"""
    hsn_codes_data = [
        # Electronics and IT Equipment
        {'code': '8471', 'description': 'Automatic data processing machines and units thereof; magnetic or optical readers, machines for transcribing data onto data media in coded form and machines for processing such data, not elsewhere specified or included', 'gst_rate': 18.00},
        {'code': '8517', 'description': 'Telephone sets, including telephones for cellular networks or for other wireless networks; other apparatus for the transmission or reception of voice, images or other data', 'gst_rate': 18.00},
        {'code': '8528', 'description': 'Monitors and projectors, not incorporating television reception apparatus; reception apparatus for television', 'gst_rate': 18.00},
        
        # Furniture
        {'code': '9401', 'description': 'Seats (other than those of heading 9402), whether or not convertible into beds, and parts thereof', 'gst_rate': 18.00},
        {'code': '9403', 'description': 'Other furniture and parts thereof', 'gst_rate': 18.00},
        
        # Paper and Stationery
        {'code': '4802', 'description': 'Uncoated paper and paperboard, of a kind used for writing, printing or other graphic purposes', 'gst_rate': 12.00},
        {'code': '4811', 'description': 'Paper, paperboard, cellulose wadding and webs of cellulose fibres, coated, impregnated, covered, surface-coloured, surface-decorated or printed', 'gst_rate': 18.00},
        
        # Textiles
        {'code': '6302', 'description': 'Bed linen, table linen, toilet linen and kitchen linen', 'gst_rate': 12.00},
        {'code': '6109', 'description': 'T-shirts, singlets and other vests, knitted or crocheted', 'gst_rate': 12.00},
        
        # Food Items
        {'code': '1006', 'description': 'Rice', 'gst_rate': 5.00},
        {'code': '1701', 'description': 'Cane or beet sugar and chemically pure sucrose, in solid form', 'gst_rate': 5.00},
        {'code': '0401', 'description': 'Milk and cream, not concentrated nor containing added sugar or other sweetening matter', 'gst_rate': 5.00},
        
        # Construction Materials
        {'code': '2523', 'description': 'Portland cement, aluminous cement, slag cement, supersulphate cement and similar hydraulic cements', 'gst_rate': 28.00},
        {'code': '7308', 'description': 'Structures (excluding prefabricated buildings of heading 9406) and parts of structures', 'gst_rate': 18.00},
        
        # Vehicles and Parts
        {'code': '8703', 'description': 'Motor cars and other motor vehicles principally designed for the transport of persons', 'gst_rate': 28.00},
        {'code': '8711', 'description': 'Motorcycles (including mopeds) and cycles fitted with an auxiliary motor', 'gst_rate': 28.00},
        
        # Chemicals and Pharmaceuticals
        {'code': '3004', 'description': 'Medicaments (excluding goods of heading 3002, 3005 or 3006) consisting of mixed or unmixed products for therapeutic or prophylactic uses', 'gst_rate': 12.00},
        {'code': '3401', 'description': 'Soap; organic surface-active products and preparations for use as soap', 'gst_rate': 18.00},
        
        # Machinery
        {'code': '8414', 'description': 'Air or vacuum pumps, air or other gas compressors and fans; ventilating or recycling hoods', 'gst_rate': 18.00},
        {'code': '8501', 'description': 'Electric motors and generators (excluding generating sets)', 'gst_rate': 18.00},
    ]
    
    created_count = 0
    for hsn_data in hsn_codes_data:
        hsn_code, created = HSNCode.objects.get_or_create(
            code=hsn_data['code'],
            defaults={
                'description': hsn_data['description'],
                'gst_rate': hsn_data['gst_rate']
            }
        )
        if created:
            created_count += 1
            print(f"✅ Created HSN Code: {hsn_code.code} - {hsn_code.description[:50]}... (GST: {hsn_code.gst_rate}%)")
        else:
            print(f"⚠️  HSN Code {hsn_code.code} already exists")
    
    print(f"\n📊 HSN Codes Summary: {created_count} new codes created, {len(hsn_codes_data) - created_count} already existed")

def populate_sac_codes():
    """Populate common SAC codes for services"""
    sac_codes_data = [
        # Professional Services
        {'code': '998212', 'service_name': 'Accounting and bookkeeping services', 'description': 'Services related to accounting, bookkeeping, auditing and tax preparation', 'gst_rate': 18.00},
        {'code': '998219', 'service_name': 'Legal services', 'description': 'Legal advisory, representation and documentation services', 'gst_rate': 18.00},
        {'code': '998311', 'service_name': 'Engineering services', 'description': 'Engineering design, consulting and technical services', 'gst_rate': 18.00},
        {'code': '998399', 'service_name': 'Other professional services', 'description': 'Other professional, technical and business services', 'gst_rate': 18.00},
        
        # IT and Software Services
        {'code': '998313', 'service_name': 'Information technology consulting services', 'description': 'IT consulting, system integration and technology advisory services', 'gst_rate': 18.00},
        {'code': '998314', 'service_name': 'Software development services', 'description': 'Custom software development, programming and application services', 'gst_rate': 18.00},
        {'code': '998315', 'service_name': 'Data processing services', 'description': 'Data processing, hosting and related services', 'gst_rate': 18.00},
        
        # Maintenance and Repair
        {'code': '998729', 'service_name': 'Maintenance and repair services', 'description': 'Maintenance and repair services for machinery, equipment and other goods', 'gst_rate': 18.00},
        {'code': '998721', 'service_name': 'Installation services', 'description': 'Installation services for machinery, equipment and other goods', 'gst_rate': 18.00},
        
        # Marketing and Advertising
        {'code': '998391', 'service_name': 'Marketing and advertising services', 'description': 'Advertising, marketing, promotional and related services', 'gst_rate': 18.00},
        {'code': '998392', 'service_name': 'Market research services', 'description': 'Market research and public opinion polling services', 'gst_rate': 18.00},
        
        # Training and Education
        {'code': '998521', 'service_name': 'Training services', 'description': 'Professional training and skill development services', 'gst_rate': 18.00},
        {'code': '998522', 'service_name': 'Educational services', 'description': 'Educational and instructional services', 'gst_rate': 18.00},
        
        # Transportation (Lower GST)
        {'code': '996511', 'service_name': 'Transportation of goods by road', 'description': 'Transportation and logistics services for goods', 'gst_rate': 5.00},
        {'code': '996512', 'service_name': 'Transportation of passengers by road', 'description': 'Passenger transportation services by road', 'gst_rate': 5.00},
        
        # Food and Catering (Lower GST)
        {'code': '997212', 'service_name': 'Catering services', 'description': 'Food catering and related services', 'gst_rate': 5.00},
        {'code': '997213', 'service_name': 'Restaurant services', 'description': 'Restaurant and food service activities', 'gst_rate': 5.00},
        
        # Financial Services
        {'code': '997111', 'service_name': 'Banking services', 'description': 'Banking and financial intermediation services', 'gst_rate': 18.00},
        {'code': '997112', 'service_name': 'Insurance services', 'description': 'Insurance and related financial services', 'gst_rate': 18.00},
        
        # Construction Services
        {'code': '995411', 'service_name': 'Construction services', 'description': 'Construction and related engineering services', 'gst_rate': 18.00},
        {'code': '995412', 'service_name': 'Architectural services', 'description': 'Architectural design and planning services', 'gst_rate': 18.00},
        
        # Healthcare Services
        {'code': '998611', 'service_name': 'Healthcare services', 'description': 'Medical and healthcare services', 'gst_rate': 12.00},
        {'code': '998612', 'service_name': 'Diagnostic services', 'description': 'Medical diagnostic and laboratory services', 'gst_rate': 12.00},
        
        # Security Services
        {'code': '998291', 'service_name': 'Security services', 'description': 'Security and investigation services', 'gst_rate': 18.00},
        {'code': '998292', 'service_name': 'Cleaning services', 'description': 'Cleaning and housekeeping services', 'gst_rate': 18.00},
    ]
    
    created_count = 0
    for sac_data in sac_codes_data:
        sac_code, created = SACCode.objects.get_or_create(
            code=sac_data['code'],
            defaults={
                'service_name': sac_data['service_name'],
                'description': sac_data['description'],
                'gst_rate': sac_data['gst_rate']
            }
        )
        if created:
            created_count += 1
            print(f"✅ Created SAC Code: {sac_code.code} - {sac_code.service_name} (GST: {sac_code.gst_rate}%)")
        else:
            print(f"⚠️  SAC Code {sac_code.code} already exists")
    
    print(f"\n📊 SAC Codes Summary: {created_count} new codes created, {len(sac_codes_data) - created_count} already existed")

def main():
    """Main function to populate both HSN and SAC codes"""
    print("🚀 Starting HSN and SAC codes population...")
    print("=" * 60)
    
    print("\n📦 Populating HSN Codes for Products...")
    populate_hsn_codes()
    
    print("\n🔧 Populating SAC Codes for Services...")
    populate_sac_codes()
    
    print("\n" + "=" * 60)
    print("✅ HSN and SAC codes population completed!")
    print("\nNow you can:")
    print("1. Create products and select appropriate HSN codes")
    print("2. Create services and select appropriate SAC codes")
    print("3. GST rates will be automatically populated based on your selection")
    print("\n💡 Example: Select SAC code '998212 - Accounting and bookkeeping services' for 18% GST")

if __name__ == '__main__':
    main()
