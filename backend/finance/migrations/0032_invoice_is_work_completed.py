from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0031_remove_proforma_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoice',
            name='is_work_completed',
            field=models.BooleanField(default=False, help_text='Whether the work/service for this invoice has been completed'),
        ),
    ]
