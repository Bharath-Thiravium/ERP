from django.db import migrations, connection
import re


def update_invoice_padding_6_to_3_digits(apps, schema_editor):
    # Skip in test environments — no real data to renumber.
    if connection.settings_dict['NAME'].startswith('test_'):
        return

    Invoice = apps.get_model('finance', 'Invoice')
    NumberingCounter = apps.get_model('finance', 'NumberingCounter')

    old_pattern = r'^([A-Z]+)-([A-Z]+)-(\d{4})-(\d{6})$'
    invoices_by_scope = {}

    for invoice in Invoice.objects.all():
        if not invoice.invoice_number:
            continue
        match = re.match(old_pattern, invoice.invoice_number)
        if not match:
            continue
        company_code, prefix, fy_short, seq_str = match.groups()
        key = (invoice.company_id, fy_short)
        invoices_by_scope.setdefault(key, []).append(
            (invoice.pk, int(seq_str), company_code, prefix, fy_short)
        )

    for (company_id, scope_key), invoice_list in invoices_by_scope.items():
        invoice_list.sort(key=lambda x: x[1])
        for idx, (pk, old_seq, company_code, prefix, fy_short) in enumerate(invoice_list, start=1):
            new_num = f"{company_code}-{prefix}-{fy_short}-{str(idx).zfill(3)}"
            Invoice.objects.filter(pk=pk).update(invoice_number=new_num)

        counter, created = NumberingCounter.objects.get_or_create(
            company_id=company_id,
            module='invoice',
            scope_key=scope_key,
            defaults={'next_value': len(invoice_list) + 1},
        )
        if not created:
            counter.next_value = len(invoice_list) + 1
            counter.save(update_fields=['next_value'])


def reverse_update(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '1001_update_invoice_numbering_padding_3'),
    ]

    operations = [
        migrations.RunPython(update_invoice_padding_6_to_3_digits, reverse_update),
    ]
