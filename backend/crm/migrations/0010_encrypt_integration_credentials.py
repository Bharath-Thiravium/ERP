from django.db import migrations, models


def encrypt_existing_credentials(apps, schema_editor):
    """Encrypt any pre-existing plaintext CalendarIntegration.credentials and
    ThirdPartyIntegration.api_key values before the old plaintext columns are dropped."""
    from django.conf import settings
    from cryptography.fernet import Fernet
    import json

    key = settings.EMAIL_ENCRYPTION_KEY
    f = Fernet(key.encode() if isinstance(key, str) else key)

    CalendarIntegration = apps.get_model('crm', 'CalendarIntegration')
    for integration in CalendarIntegration.objects.all():
        if integration.credentials_new is None and integration.credentials:
            integration.credentials_new = f.encrypt(json.dumps(integration.credentials).encode())
            integration.save(update_fields=['credentials_new'])

    ThirdPartyIntegration = apps.get_model('crm', 'ThirdPartyIntegration')
    for integration in ThirdPartyIntegration.objects.all():
        if integration.encrypted_api_key is None and integration.api_key:
            integration.encrypted_api_key = f.encrypt(integration.api_key.encode())
            integration.save(update_fields=['encrypted_api_key'])


def noop_reverse(apps, schema_editor):
    """Data migration is one-way; nothing to reverse (old plaintext columns are gone)."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0009_fix_crm_issues'),
    ]

    operations = [
        # --- CalendarIntegration.credentials: JSONField (plaintext) -> BinaryField (Fernet-encrypted) ---
        migrations.AddField(
            model_name='calendarintegration',
            name='credentials_new',
            field=models.BinaryField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='thirdpartyintegration',
            name='encrypted_api_key',
            field=models.BinaryField(null=True, blank=True),
        ),
        migrations.RunPython(encrypt_existing_credentials, noop_reverse),
        migrations.RemoveField(
            model_name='calendarintegration',
            name='credentials',
        ),
        migrations.RenameField(
            model_name='calendarintegration',
            old_name='credentials_new',
            new_name='credentials',
        ),
        migrations.RemoveField(
            model_name='thirdpartyintegration',
            name='api_key',
        ),
    ]
