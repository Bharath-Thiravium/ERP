# Generated manually for finance numbering foundations

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0012_company_use_document_numbering'),
        ('finance', '0028_invoice_is_revised_invoice_revised_at_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='NumberingRule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('module', models.CharField(choices=[('quotation', 'Quotation'), ('purchase_order', 'Purchase Order'), ('proforma_invoice', 'Proforma Invoice'), ('invoice', 'Invoice'), ('customer_payment', 'Customer Payment'), ('purchase_request', 'Purchase Request'), ('purchase_payment', 'Purchase Payment'), ('vendor_invoice', 'Vendor Invoice')], max_length=50)),
                ('template', models.CharField(help_text='Template supporting {PREFIX},{SEP},{YY},{YYYY},{MM},{SEQ}', max_length=255)),
                ('prefix', models.CharField(blank=True, default='', max_length=50)),
                ('separator', models.CharField(blank=True, default='-', max_length=5)),
                ('padding', models.PositiveIntegerField(default=4)),
                ('reset_scope', models.CharField(choices=[('never', 'Never'), ('yearly', 'Yearly'), ('monthly', 'Monthly')], default='never', max_length=10)),
                ('start_from', models.PositiveIntegerField(default=1)),
                ('allow_manual_override', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='numbering_rules', to='authentication.company')),
            ],
            options={
                'db_table': 'finance_numbering_rules',
            },
        ),
        migrations.CreateModel(
            name='NumberingCounter',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('module', models.CharField(max_length=50)),
                ('scope_key', models.CharField(blank=True, default='', max_length=20)),
                ('next_value', models.PositiveIntegerField(default=1)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='numbering_counters', to='authentication.company')),
            ],
            options={
                'db_table': 'finance_numbering_counters',
            },
        ),
        migrations.AlterField(
            model_name='invoice',
            name='invoice_number',
            field=models.CharField(db_index=True, max_length=50),
        ),
        migrations.AlterField(
            model_name='payment',
            name='payment_number',
            field=models.CharField(db_index=True, max_length=50),
        ),
        migrations.AlterField(
            model_name='proformainvoice',
            name='proforma_number',
            field=models.CharField(db_index=True, max_length=50),
        ),
        migrations.AlterField(
            model_name='purchaseorder',
            name='internal_po_number',
            field=models.CharField(db_index=True, help_text='Our internal PO number', max_length=50),
        ),
        migrations.AlterField(
            model_name='purchasepayment',
            name='payment_number',
            field=models.CharField(db_index=True, max_length=50),
        ),
        migrations.AlterField(
            model_name='purchaserequest',
            name='request_number',
            field=models.CharField(db_index=True, max_length=50),
        ),
        migrations.AlterField(
            model_name='quotation',
            name='quotation_number',
            field=models.CharField(db_index=True, max_length=50),
        ),
        migrations.AlterField(
            model_name='vendorinvoice',
            name='our_reference_number',
            field=models.CharField(db_index=True, max_length=50),
        ),
        migrations.AlterField(
            model_name='vendorinvoice',
            name='vendor_invoice_number',
            field=models.CharField(db_index=True, max_length=100),
        ),
        migrations.AddConstraint(
            model_name='numberingcounter',
            constraint=models.UniqueConstraint(fields=('company', 'module', 'scope_key'), name='finance_numbering_counter_scope_unique'),
        ),
        migrations.AddConstraint(
            model_name='numberingrule',
            constraint=models.UniqueConstraint(fields=('company', 'module'), name='finance_numbering_rule_company_module_unique'),
        ),
        migrations.AddConstraint(
            model_name='purchaseorder',
            constraint=models.UniqueConstraint(fields=('company', 'po_number'), name='finance_po_company_po_number_uniq'),
        ),
        migrations.AddConstraint(
            model_name='vendorinvoice',
            constraint=models.UniqueConstraint(fields=('company', 'vendor_invoice_number'), name='finance_vendor_invoice_company_number_uniq'),
        ),
        migrations.AddIndex(
            model_name='numberingcounter',
            index=models.Index(fields=['company', 'module', 'scope_key'], name='finance_numbering_counter_idx'),
        ),
        migrations.AddIndex(
            model_name='numberingrule',
            index=models.Index(fields=['company', 'module'], name='finance_numbering_rule_idx'),
        ),
        migrations.AddIndex(
            model_name='quotation',
            index=models.Index(fields=['company', 'quotation_number'], name='fin_qt_no_idx'),
        ),
        migrations.AddIndex(
            model_name='purchaseorder',
            index=models.Index(fields=['company', 'po_number'], name='finance_po_company_po_idx'),
        ),
        migrations.AddIndex(
            model_name='purchaseorder',
            index=models.Index(fields=['company', 'internal_po_number'], name='fin_po_int_idx'),
        ),
        migrations.AddIndex(
            model_name='proformainvoice',
            index=models.Index(fields=['company', 'proforma_number'], name='finance_pi_company_no_idx'),
        ),
        migrations.AddIndex(
            model_name='invoice',
            index=models.Index(fields=['company', 'invoice_number'], name='finance_inv_company_no_idx'),
        ),
        migrations.AddIndex(
            model_name='payment',
            index=models.Index(fields=['company', 'payment_number'], name='finance_pay_company_no_idx'),
        ),
        migrations.AddIndex(
            model_name='purchaserequest',
            index=models.Index(fields=['company', 'request_number'], name='finance_pr_company_no_idx'),
        ),
        migrations.AddIndex(
            model_name='purchasepayment',
            index=models.Index(fields=['company', 'payment_number'], name='finance_pp_company_no_idx'),
        ),
        migrations.AddIndex(
            model_name='vendorinvoice',
            index=models.Index(fields=['company', 'vendor_invoice_number'], name='fin_vi_no_idx'),
        ),
        migrations.AddIndex(
            model_name='vendorinvoice',
            index=models.Index(fields=['company', 'our_reference_number'], name='finance_vi_company_ref_idx'),
        ),
    ]
