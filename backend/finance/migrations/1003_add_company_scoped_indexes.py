from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '1002_update_invoice_padding_from_6_to_3_digits'),
    ]

    # CONCURRENTLY cannot run inside a transaction
    atomic = False

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_customer_company_created
                ON finance_customer (company_id, created_at DESC);

                CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_payment_company_date_created
                ON finance_payment (company_id, payment_date DESC, created_at DESC);

                CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_invoice_company_date
                ON finance_invoice (company_id, invoice_date DESC);
            """,
            reverse_sql="""
                DROP INDEX CONCURRENTLY IF EXISTS idx_finance_customer_company_created;
                DROP INDEX CONCURRENTLY IF EXISTS idx_finance_payment_company_date_created;
                DROP INDEX CONCURRENTLY IF EXISTS idx_finance_invoice_company_date;
            """,
        ),
    ]
