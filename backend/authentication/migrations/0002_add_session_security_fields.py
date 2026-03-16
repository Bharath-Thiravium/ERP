# Generated manually for ServiceUserSession security enhancements

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0001_initial'),  # Adjust this to the latest migration
    ]

    operations = [
        migrations.AddField(
            model_name='serviceusersession',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='serviceusersession',
            name='last_seen_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='serviceusersession',
            name='expires_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='serviceusersession',
            name='revoked_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='serviceusersession',
            name='device_info',
            field=models.TextField(blank=True),
        ),
        migrations.AlterModelOptions(
            name='serviceusersession',
            options={'ordering': ['-created_at'], 'verbose_name': 'Service User Session', 'verbose_name_plural': 'Service User Sessions'},
        ),
    ]