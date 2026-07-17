from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('hr', '0036_offer_response_and_candidate_conversion'),
    ]

    operations = [
        migrations.AddField(
            model_name='statutorysettings',
            name='overtime_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='statutorysettings',
            name='pf_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='statutorysettings',
            name='esi_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='statutorysettings',
            name='pt_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='statutorysettings',
            name='tds_enabled',
            field=models.BooleanField(default=False),
        ),
    ]
