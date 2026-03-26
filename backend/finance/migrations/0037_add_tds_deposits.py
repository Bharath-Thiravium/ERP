from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0036_add_gross_payment_tds_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='TDSDeposit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('deposit_date', models.DateField(help_text='Date TDS was deposited to government')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=15, help_text='Amount deposited in this instalment')),
                ('challan_number', models.CharField(blank=True, max_length=50, help_text='BSR/Challan number')),
                ('form16a_number', models.CharField(blank=True, max_length=50, help_text='Form 16A certificate number for this deposit')),
                ('certificate_received', models.BooleanField(default=False, help_text='Whether Form 16A received for this deposit')),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('payment', models.ForeignKey(
                    help_text="The payment whose TDS this deposit covers",
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='tds_deposits',
                    to='finance.payment',
                )),
                ('company', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    to='authentication.company',
                )),
            ],
            options={
                'db_table': 'finance_tds_deposits',
                'ordering': ['deposit_date', 'created_at'],
            },
        ),
    ]
