# Generated migration to add new models

from django.db import migrations, models
import django.db.models.deletion
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0004_remove_ai_features'),
        ('authentication', '0001_initial'),
    ]

    operations = [
        # Leave Management Models
        migrations.CreateModel(
            name='LeaveType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('code', models.CharField(max_length=20)),
                ('category', models.CharField(choices=[('earned', 'Earned Leave'), ('casual', 'Casual Leave'), ('sick', 'Sick Leave'), ('maternity', 'Maternity Leave'), ('paternity', 'Paternity Leave'), ('compensatory', 'Compensatory Off'), ('unpaid', 'Unpaid Leave')], max_length=20)),
                ('days_per_year', models.DecimalField(decimal_places=2, max_digits=5, validators=[django.core.validators.MinValueValidator(0)])),
                ('max_carry_forward', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('is_paid', models.BooleanField(default=True)),
                ('requires_approval', models.BooleanField(default=True)),
                ('min_days_notice', models.IntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='leave_types', to='authentication.company')),
            ],
            options={
                'unique_together': {('company', 'code')},
            },
        ),
        migrations.CreateModel(
            name='LeaveBalance',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('year', models.IntegerField()),
                ('opening_balance', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('credited', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('used', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('closing_balance', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='leave_balances', to='hr.employee')),
                ('leave_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='balances', to='hr.leavetype')),
            ],
            options={
                'unique_together': {('employee', 'leave_type', 'year')},
            },
        ),
        migrations.CreateModel(
            name='LeaveApplication',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('from_date', models.DateField()),
                ('to_date', models.DateField()),
                ('total_days', models.DecimalField(decimal_places=2, max_digits=5)),
                ('reason', models.TextField()),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected'), ('cancelled', 'Cancelled')], default='pending', max_length=20)),
                ('approved_date', models.DateTimeField(blank=True, null=True)),
                ('rejection_reason', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='leave_applications', to='hr.employee')),
                ('leave_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='applications', to='hr.leavetype')),
                ('approved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='approved_leaves', to='hr.employee')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Holiday',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('date', models.DateField()),
                ('holiday_type', models.CharField(choices=[('national', 'National Holiday'), ('regional', 'Regional Holiday'), ('optional', 'Optional Holiday'), ('company', 'Company Holiday')], default='national', max_length=20)),
                ('is_mandatory', models.BooleanField(default=True)),
                ('description', models.TextField(blank=True)),
                ('applicable_states', models.JSONField(blank=True, default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='holidays', to='authentication.company')),
            ],
            options={
                'ordering': ['date'],
                'unique_together': {('company', 'date', 'name')},
            },
        ),
        
        # Banking Models
        migrations.CreateModel(
            name='BankVerification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('verification_status', models.CharField(choices=[('pending', 'Pending'), ('verified', 'Verified'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('verification_method', models.CharField(default='penny_drop', max_length=50)),
                ('verification_reference', models.CharField(blank=True, max_length=100)),
                ('verified_date', models.DateTimeField(blank=True, null=True)),
                ('verification_response', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('employee', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='bank_verification', to='hr.employee')),
            ],
        ),
        migrations.CreateModel(
            name='SalaryPayment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('payment_method', models.CharField(choices=[('neft', 'NEFT'), ('rtgs', 'RTGS'), ('imps', 'IMPS'), ('upi', 'UPI')], default='neft', max_length=20)),
                ('payment_status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('bank_name', models.CharField(max_length=100)),
                ('account_number', models.CharField(max_length=20)),
                ('ifsc_code', models.CharField(max_length=11)),
                ('transaction_reference', models.CharField(blank=True, max_length=100)),
                ('utr_number', models.CharField(blank=True, max_length=50)),
                ('payment_date', models.DateTimeField(blank=True, null=True)),
                ('error_message', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('payroll_cycle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='salary_payments', to='hr.payrollcycle')),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='salary_payments', to='hr.employee')),
            ],
        ),
        migrations.CreateModel(
            name='DigitalSignature',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('certificate_path', models.CharField(max_length=500)),
                ('certificate_password', models.CharField(max_length=255)),
                ('issuer', models.CharField(max_length=200)),
                ('valid_from', models.DateField()),
                ('valid_to', models.DateField()),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('company', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='digital_signature', to='authentication.company')),
            ],
        ),
        migrations.CreateModel(
            name='SignedDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('document_type', models.CharField(choices=[('form16', 'Form 16'), ('payslip', 'Payslip'), ('certificate', 'Certificate'), ('return', 'Government Return')], max_length=20)),
                ('document_path', models.CharField(max_length=500)),
                ('signed_path', models.CharField(max_length=500)),
                ('signature_hash', models.CharField(max_length=255)),
                ('signed_date', models.DateTimeField(auto_now_add=True)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='signed_documents', to='authentication.company')),
            ],
        ),
        
        # ESI Medical Model
        migrations.CreateModel(
            name='ESIMedicalBenefit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('claim_type', models.CharField(choices=[('medical', 'Medical Treatment'), ('maternity', 'Maternity Benefit'), ('disability', 'Temporary Disability'), ('dependent', 'Dependent Medical')], max_length=20)),
                ('claim_date', models.DateField()),
                ('treatment_date', models.DateField()),
                ('hospital_name', models.CharField(max_length=200)),
                ('claim_amount', models.DecimalField(decimal_places=2, max_digits=10, validators=[django.core.validators.MinValueValidator(0)])),
                ('approved_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('claim_number', models.CharField(max_length=50, unique=True)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('submitted', 'Submitted'), ('under_review', 'Under Review'), ('approved', 'Approved'), ('rejected', 'Rejected'), ('paid', 'Paid')], default='draft', max_length=20)),
                ('documents', models.JSONField(blank=True, default=list)),
                ('remarks', models.TextField(blank=True)),
                ('rejection_reason', models.TextField(blank=True)),
                ('submitted_date', models.DateTimeField(blank=True, null=True)),
                ('approved_date', models.DateTimeField(blank=True, null=True)),
                ('payment_date', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='esi_medical_claims', to='hr.employee')),
            ],
        ),
    ]
