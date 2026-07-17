from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0037_statutorysettings_overtime_enabled'),
    ]

    operations = [
        migrations.AddField(
            model_name='statutorysettings',
            name='pt_slabs',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Company-verified monthly PT slabs. Each item contains min_salary, max_salary (optional), and amount.',
            ),
        ),
    ]
