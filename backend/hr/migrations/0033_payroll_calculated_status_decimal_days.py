from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0032_attendance_day_override'),
    ]

    operations = [
        migrations.AlterField(
            model_name='payrollcycle',
            name='status',
            field=models.CharField(
                choices=[
                    ('draft', 'Draft'),
                    ('calculating', 'Calculating'),
                    ('calculated', 'Calculated'),
                    ('review', 'Under Review'),
                    ('approved', 'Approved'),
                    ('processing', 'Processing Payment'),
                    ('completed', 'Completed'),
                    ('cancelled', 'Cancelled'),
                ],
                default='draft',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='payslip',
            name='working_days',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=6),
        ),
        migrations.AlterField(
            model_name='payslip',
            name='present_days',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=6),
        ),
        migrations.AlterField(
            model_name='payslip',
            name='absent_days',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=6),
        ),
    ]
