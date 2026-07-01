from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '1002_update_invoice_padding_from_6_to_3_digits'),
    ]

    atomic = False

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_customer_company_created
                ON finance_customer (company_id, created_at DESC);
            """,
            reverse_sql="""
                DROP INDEX CONCURRENTLY IF EXISTS idx_finance_customer_company_created;
            """,
        ),

        migrations.RunSQL(
            sql="""
                CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_payment_company_date_created
                ON finance_payments (company_id, payment_date DESC, created_at DESC);
            """,
            reverse_sql="""
                DROP INDEX CONCURRENTLY IF EXISTS idx_finance_payment_company_date_created;
            """,
        ),

        migrations.RunSQL(
            sql="""
                CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_invoice_company_date
                ON finance_invoices(company_id, invoice_date DESC);
            """,
            reverse_sql="""
                DROP INDEX CONCURRENTLY IF EXISTS idx_finance_invoice_company_date;
            """,
        ),
    ]