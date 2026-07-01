from django.db import migrations, models


class Migration(migrations.Migration):
    """Fix globally-unique Lead/Contact/Account/Opportunity/Activity/Campaign
    identifiers so uniqueness is enforced per company, not across the whole
    platform. Previously two different companies could not both have a
    'LEAD-000001' etc. even though these codes are meant to be scoped to a
    single tenant."""

    dependencies = [
        ('crm', '0010_encrypt_integration_credentials'),
    ]

    operations = [
        migrations.AlterField(
            model_name='lead',
            name='lead_id',
            field=models.CharField(max_length=50),
        ),
        migrations.AlterUniqueTogether(
            name='lead',
            unique_together={('company', 'lead_id')},
        ),
        migrations.AlterField(
            model_name='contact',
            name='contact_id',
            field=models.CharField(max_length=50),
        ),
        migrations.AlterUniqueTogether(
            name='contact',
            unique_together={('company', 'contact_id')},
        ),
        migrations.AlterField(
            model_name='account',
            name='account_id',
            field=models.CharField(max_length=50),
        ),
        migrations.AlterUniqueTogether(
            name='account',
            unique_together={('company', 'account_id')},
        ),
        migrations.AlterField(
            model_name='opportunity',
            name='opportunity_id',
            field=models.CharField(max_length=50),
        ),
        migrations.AlterUniqueTogether(
            name='opportunity',
            unique_together={('company', 'opportunity_id')},
        ),
        migrations.AlterField(
            model_name='activity',
            name='activity_id',
            field=models.CharField(max_length=50),
        ),
        migrations.AlterUniqueTogether(
            name='activity',
            unique_together={('company', 'activity_id')},
        ),
        migrations.AlterField(
            model_name='campaign',
            name='campaign_id',
            field=models.CharField(max_length=50),
        ),
        migrations.AlterUniqueTogether(
            name='campaign',
            unique_together={('company', 'campaign_id')},
        ),
    ]
