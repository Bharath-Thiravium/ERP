# Generated migration for encrypted portal credentials

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0016_alter_employee_skills'),
    ]

    operations = [
        migrations.AlterField(
            model_name='portalcredentials',
            name='epfo_password',
            field=models.CharField(blank=True, help_text='Encrypted password', max_length=255),
        ),
        migrations.AlterField(
            model_name='portalcredentials',
            name='esic_password',
            field=models.CharField(blank=True, help_text='Encrypted password', max_length=255),
        ),
        migrations.AlterField(
            model_name='portalcredentials',
            name='it_password',
            field=models.CharField(blank=True, help_text='Encrypted password', max_length=255),
        ),
        migrations.AlterField(
            model_name='portalcredentials',
            name='pt_password',
            field=models.CharField(blank=True, help_text='Encrypted password', max_length=255),
        ),
    ]