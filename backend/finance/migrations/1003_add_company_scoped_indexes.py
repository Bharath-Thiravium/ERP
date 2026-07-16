from django.db import migrations, connection


def create_indexes(apps, schema_editor):
    """
    Performance-only indexes. Uses CONCURRENTLY in production (atomic=False).
    Skipped entirely in test environments where tables may not yet exist at
    this migration step, since these indexes are non-structural.
    """
    import django.test
    # Skip during test runs — these are optional perf indexes, not structural.
    try:
        from django.test.utils import setup_test_environment
        if connection.settings_dict['NAME'].startswith('test_'):
            return
    except Exception:
        pass

    in_transaction = connection.in_atomic_block
    keyword = '' if in_transaction else 'CONCURRENTLY'
    with schema_editor.connection.cursor() as cursor:
        for sql in [
            f"CREATE INDEX {keyword} IF NOT EXISTS idx_finance_customer_company_created ON finance_customer (company_id, created_at DESC)",
            f"CREATE INDEX {keyword} IF NOT EXISTS idx_finance_payment_company_date_created ON finance_payment (company_id, payment_date DESC, created_at DESC)",
            f"CREATE INDEX {keyword} IF NOT EXISTS idx_finance_invoice_company_date ON finance_invoice (company_id, invoice_date DESC)",
        ]:
            cursor.execute(sql)


def drop_indexes(apps, schema_editor):
    if connection.settings_dict['NAME'].startswith('test_'):
        return
    in_transaction = connection.in_atomic_block
    keyword = '' if in_transaction else 'CONCURRENTLY'
    with schema_editor.connection.cursor() as cursor:
        for idx in [
            'idx_finance_customer_company_created',
            'idx_finance_payment_company_date_created',
            'idx_finance_invoice_company_date',
        ]:
            cursor.execute(f'DROP INDEX {keyword} IF EXISTS {idx}')


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '1002_update_invoice_padding_from_6_to_3_digits'),
    ]

    atomic = False

    operations = [
        migrations.RunPython(create_indexes, reverse_code=drop_indexes),
    ]
