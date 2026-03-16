# Generated manually to fix service_type field length
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0016_alter_securitylog_event_type_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='service',
            name='service_type',
            field=models.CharField(
                choices=[
                    ('finance', 'Finance Management'),
                    ('hr', 'Human Resources'),
                    ('inventory', 'Inventory Management'),
                    ('orders', 'Order Management'),
                    ('analytics', 'Analytics & Reporting'),
                    ('crm', 'Customer Relationship Management'),
                    ('procurement', 'Procurement'),
                    ('manufacturing', 'Manufacturing'),
                    ('quality', 'Quality Management'),
                    ('maintenance', 'Maintenance'),
                    ('athens_sustainability', 'Athens Sustainability'),
                ],
                max_length=30,
                unique=True
            ),
        ),
    ]