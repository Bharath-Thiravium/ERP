# Generated migration for enhanced document numbering system

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('company_dashboard', '0009_documentnumberingconfig_documentnumberinghistory_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='documentnumberingconfig',
            name='custom_pattern',
            field=models.CharField(blank=True, help_text='Custom pattern: {PREFIX}-{YEAR}-{NUMBER} or {COMPANY}-{PREFIX}-{YEAR}-{NUMBER}', max_length=100),
        ),
        migrations.AddField(
            model_name='documentnumberingconfig',
            name='include_company_prefix',
            field=models.BooleanField(default=False, help_text='Include company prefix in number'),
        ),
        migrations.AddField(
            model_name='documentnumberingconfig',
            name='year_format',
            field=models.CharField(choices=[('YY', '2-digit year (25)'), ('YYYY', '4-digit year (2025)'), ('FY', 'Financial year (2024-25)'), ('FY_SHORT', 'Short FY (24-25)'), ('NONE', 'No year')], default='YY', max_length=10),
        ),
        migrations.AddField(
            model_name='documentnumberingconfig',
            name='separator',
            field=models.CharField(default='-', help_text='Separator between parts', max_length=5),
        ),
        migrations.AlterField(
            model_name='documentnumberingconfig',
            name='document_type',
            field=models.CharField(choices=[('quotation', 'Quotation'), ('purchase_order', 'Purchase Order'), ('invoice', 'Invoice'), ('proforma_invoice', 'Proforma Invoice'), ('payment', 'Payment'), ('customer', 'Customer'), ('vendor', 'Vendor'), ('product', 'Product'), ('purchase_request', 'Purchase Request'), ('vendor_invoice', 'Vendor Invoice'), ('employee', 'Employee'), ('department', 'Department'), ('designation', 'Designation'), ('attendance', 'Attendance'), ('payroll', 'Payroll'), ('leave_request', 'Leave Request'), ('recruitment', 'Recruitment'), ('performance_review', 'Performance Review'), ('training', 'Training'), ('expense_claim', 'Expense Claim'), ('supplier', 'Supplier'), ('warehouse', 'Warehouse'), ('category', 'Category'), ('stock_entry', 'Stock Entry'), ('stock_transfer', 'Stock Transfer'), ('stock_adjustment', 'Stock Adjustment'), ('purchase_receipt', 'Purchase Receipt'), ('delivery_note', 'Delivery Note'), ('material_request', 'Material Request'), ('quality_inspection', 'Quality Inspection'), ('lead', 'Lead'), ('contact', 'Contact'), ('account', 'Account'), ('opportunity', 'Opportunity'), ('campaign', 'Campaign'), ('activity', 'Activity'), ('support_ticket', 'Support Ticket'), ('follow_up', 'Follow Up'), ('meeting', 'Meeting'), ('call_log', 'Call Log'), ('audit', 'Audit'), ('asset', 'Asset'), ('project', 'Project'), ('task', 'Task'), ('document', 'Document')], max_length=30),
        ),
    ]