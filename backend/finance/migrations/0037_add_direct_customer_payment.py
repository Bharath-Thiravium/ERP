# Generated migration for direct customer payments

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0036_add_gross_payment_tds_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='payment_type',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('invoice', 'Invoice Payment'),
                    ('direct', 'Direct Payment'),
                ],
                default='invoice',
                help_text='Type of payment - linked to invoice or direct'
            ),
        ),
        migrations.AddField(
            model_name='payment',
            name='payment_purpose',
            field=models.CharField(
                max_length=100,
                blank=True,
                help_text='Purpose of direct payment (memo, penalty, incentive, etc.)'
            ),
        ),
        migrations.AlterField(
            model_name='payment',
            name='invoice',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='payments',
                to='finance.invoice',
                help_text='Invoice this payment is for (optional for direct payments)'
            ),
        ),
        migrations.AlterField(
            model_name='payment',
            name='proforma_invoice',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='payments',
                to='finance.proformainvoice',
                help_text='Proforma invoice this payment is for (optional for direct payments)'
            ),
        ),
    ]
