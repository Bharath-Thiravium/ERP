# Generated migration to remove multicompany models

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0008_add_customer_bank_fields'),
    ]

    operations = [
        # Remove multicompany models
        migrations.DeleteModel(
            name='AdvancedTDSDeductee',
        ),
        migrations.DeleteModel(
            name='InterStateTransaction',
        ),
        migrations.DeleteModel(
            name='ReverseChargeTransaction',
        ),
        migrations.DeleteModel(
            name='ImportExportTransaction',
        ),
        migrations.DeleteModel(
            name='Branch',
        ),
        migrations.DeleteModel(
            name='TDSSection',
        ),
    ]