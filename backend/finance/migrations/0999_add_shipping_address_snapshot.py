# Generated migration to add shipping address snapshot fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0040_alter_customer_customer_code'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoice',
            name='shipping_address_snapshot',
            field=models.TextField(blank=True, null=True, help_text='Snapshot of shipping address at invoice creation'),
        ),
        migrations.AddField(
            model_name='invoice',
            name='shipping_label',
            field=models.CharField(max_length=100, blank=True, null=True, help_text='Shipping address label'),
        ),
        migrations.AddField(
            model_name='invoice',
            name='shipping_line1',
            field=models.CharField(max_length=255, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='invoice',
            name='shipping_line2',
            field=models.CharField(max_length=255, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='invoice',
            name='shipping_city',
            field=models.CharField(max_length=100, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='invoice',
            name='shipping_state',
            field=models.CharField(max_length=100, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='invoice',
            name='shipping_pincode',
            field=models.CharField(max_length=10, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='invoice',
            name='shipping_country',
            field=models.CharField(max_length=100, blank=True, null=True, default='India'),
        ),
    ]
