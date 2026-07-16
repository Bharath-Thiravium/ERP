from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '1004_add_tds_to_quotation'),
    ]

    operations = [
        # Invoice: GST supply classification fields
        migrations.AddField(
            model_name='invoice',
            name='gst_supply_type',
            field=models.CharField(
                max_length=30,
                blank=True,
                default='',
                help_text='Regular B2B / SEZ supplies with payment / SEZ supplies without payment / Deemed Exp / Intra-State supplies attracting IGST',
            ),
        ),
        migrations.AddField(
            model_name='invoice',
            name='ecommerce_gstin',
            field=models.CharField(max_length=15, blank=True, default='', help_text='E-commerce operator GSTIN'),
        ),
        migrations.AddField(
            model_name='invoice',
            name='cess_amount',
            field=models.DecimalField(max_digits=15, decimal_places=2, default=0, help_text='Cess amount on invoice'),
        ),
        migrations.AddField(
            model_name='invoice',
            name='original_document_number',
            field=models.CharField(max_length=50, blank=True, default='', help_text='Original invoice/note number for amendments'),
        ),
        migrations.AddField(
            model_name='invoice',
            name='original_document_date',
            field=models.DateField(null=True, blank=True, help_text='Original document date for amendments'),
        ),
        migrations.AddField(
            model_name='invoice',
            name='is_amendment',
            field=models.BooleanField(default=False, help_text='True if this is an amendment to a previously filed document'),
        ),
        migrations.AddField(
            model_name='invoice',
            name='gstr1_excluded',
            field=models.BooleanField(default=False, help_text='Manually exclude from GSTR-1 export'),
        ),
        # InvoiceItem: cess per line
        migrations.AddField(
            model_name='invoiceitem',
            name='cess_amount',
            field=models.DecimalField(max_digits=15, decimal_places=2, default=0, help_text='Cess amount for this line item'),
        ),
        # GSTR-1 Audit Log model
        migrations.CreateModel(
            name='Gstr1ExportLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('company_id', models.IntegerField(db_index=True)),
                ('company_gstin', models.CharField(max_length=15)),
                ('return_month', models.CharField(max_length=20)),
                ('financial_year', models.CharField(max_length=10)),
                ('from_date', models.DateField()),
                ('to_date', models.DateField()),
                ('exported_by_id', models.IntegerField()),
                ('exported_by_name', models.CharField(max_length=255)),
                ('exported_at', models.DateTimeField(auto_now_add=True)),
                ('file_name', models.CharField(max_length=255)),
                ('b2b_count', models.IntegerField(default=0)),
                ('b2cs_count', models.IntegerField(default=0)),
                ('cdnr_count', models.IntegerField(default=0)),
                ('cdnra_count', models.IntegerField(default=0)),
                ('hsn_b2b_count', models.IntegerField(default=0)),
                ('hsn_b2c_count', models.IntegerField(default=0)),
                ('docs_count', models.IntegerField(default=0)),
                ('validation_status', models.CharField(max_length=20, default='passed')),
                ('export_status', models.CharField(max_length=20, default='success')),
                ('error_message', models.TextField(blank=True)),
            ],
            options={'db_table': 'finance_gstr1_export_logs', 'ordering': ['-exported_at']},
        ),
    ]
