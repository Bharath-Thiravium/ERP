# Generated data migration to populate unique_service_id

from django.db import migrations

def populate_unique_service_ids(apps, schema_editor):
    CompanyServiceUser = apps.get_model('authentication', 'CompanyServiceUser')
    Company = apps.get_model('authentication', 'Company')
    
    # Get all service users
    service_users = CompanyServiceUser.objects.all()
    
    # Track counts for each company+username combination
    username_counts = {}
    
    for user in service_users:
        company_prefix = user.company.company_prefix
        username = user.username
        
        # Create base key for tracking
        base_key = f"{company_prefix}_{username}"
        
        # Increment count for this combination
        if base_key not in username_counts:
            username_counts[base_key] = 0
        username_counts[base_key] += 1
        
        # Generate unique service ID
        unique_id = f"{base_key}_{str(username_counts[base_key]).zfill(3)}"
        
        # Update the record
        user.unique_service_id = unique_id
        user.save()

def reverse_populate_unique_service_ids(apps, schema_editor):
    CompanyServiceUser = apps.get_model('authentication', 'CompanyServiceUser')
    CompanyServiceUser.objects.all().update(unique_service_id=None)

class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0009_add_unique_service_id_nullable'),
    ]

    operations = [
        migrations.RunPython(
            populate_unique_service_ids,
            reverse_populate_unique_service_ids
        ),
    ]