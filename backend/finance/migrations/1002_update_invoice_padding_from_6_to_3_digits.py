from django.db import migrations
import re


def update_invoice_padding_6_to_3_digits(apps, schema_editor):
    """
    Update invoice numbers from 6-digit to 3-digit padding format.
    E.g., TC-INV-2627-000003 → TC-INV-2627-001
    """
    Invoice = apps.get_model('finance', 'Invoice')
    NumberingCounter = apps.get_model('finance', 'NumberingCounter')
    
    # Pattern: {COMPANY}-{PREFIX}-{FY_SHORT}-{6_DIGITS}
    # E.g., TC-INV-2627-000003
    old_pattern = r'^([A-Z]+)-([A-Z]+)-(\d{4})-(\d{6})$'
    
    # Group invoices by company and FY scope
    invoices_by_scope = {}
    
    for invoice in Invoice.objects.all():
        if not invoice.invoice_number:
            continue
            
        match = re.match(old_pattern, invoice.invoice_number)
        if not match:
            # Skip non-matching invoices (already in new format or different format)
            continue
        
        company_code, prefix, fy_short, seq_str = match.groups()
        scope_key = fy_short  # FY_SHORT is the scope key
        company_id = invoice.company_id
        
        key = (company_id, scope_key)
        if key not in invoices_by_scope:
            invoices_by_scope[key] = []
        
        invoices_by_scope[key].append((invoice, int(seq_str), company_code, prefix))
    
    # Process each scope group
    for (company_id, scope_key), invoice_list in invoices_by_scope.items():
        # Sort by sequence number to maintain order
        invoice_list.sort(key=lambda x: x[1])
        
        # Renumber sequentially with 3-digit padding
        for idx, (invoice, old_seq, company_code, prefix) in enumerate(invoice_list, start=1):
            new_seq_str = str(idx).zfill(3)
            new_invoice_number = f"{company_code}-{prefix}-{scope_key}-{new_seq_str}"
            
            # Update the invoice
            invoice.invoice_number = new_invoice_number
            invoice.save(update_fields=['invoice_number'])
        
        # Update or create the counter for this scope
        counter, created = NumberingCounter.objects.get_or_create(
            company_id=company_id,
            module='invoice',
            scope_key=scope_key,
            defaults={'next_value': len(invoice_list) + 1}
        )
        
        if not created:
            # Update counter to the next value after the highest renumbered invoice
            counter.next_value = len(invoice_list) + 1
            counter.save(update_fields=['next_value'])


def reverse_update(apps, schema_editor):
    """Reverse operation - revert to 6-digit padding (not recommended, kept for completeness)"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '1001_update_invoice_numbering_padding_3'),
    ]

    operations = [
        migrations.RunPython(update_invoice_padding_6_to_3_digits, reverse_update),
    ]
