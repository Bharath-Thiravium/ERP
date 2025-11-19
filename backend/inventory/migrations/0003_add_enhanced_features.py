# Generated migration for enhanced inventory features

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0002_add_performance_indexes'),
        ('hr', '0001_initial'),
    ]

    operations = [
        # Add image_gallery field to Product
        migrations.AddField(
            model_name='product',
            name='image_gallery',
            field=models.JSONField(default=list, help_text='Uploaded image files'),
        ),
        
        # Create ProductBundle model
        migrations.CreateModel(
            name='ProductBundle',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('bundle_name', models.CharField(max_length=200)),
                ('bundle_code', models.CharField(max_length=50, unique=True)),
                ('description', models.TextField(blank=True)),
                ('bundle_price', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('discount_percentage', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('bundle_image', models.ImageField(blank=True, null=True, upload_to='bundle_images/')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='product_bundles', to='authentication.company')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='authentication.companyserviceuser')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        
        # Create ProductBundleItem model
        migrations.CreateModel(
            name='ProductBundleItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.DecimalField(decimal_places=2, default=1, max_digits=12)),
                ('unit_price_override', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('bundle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bundle_items', to='inventory.productbundle')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='inventory.product')),
            ],
        ),
        
        # Create CycleCount model
        migrations.CreateModel(
            name='CycleCount',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('count_name', models.CharField(max_length=100)),
                ('count_number', models.CharField(max_length=50, unique=True)),
                ('frequency', models.CharField(choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('monthly', 'Monthly'), ('quarterly', 'Quarterly')], default='monthly', max_length=20)),
                ('next_count_date', models.DateField()),
                ('last_count_date', models.DateField(blank=True, null=True)),
                ('abc_classes', models.JSONField(default=list, help_text='ABC classes to include')),
                ('status', models.CharField(choices=[('scheduled', 'Scheduled'), ('in_progress', 'In Progress'), ('completed', 'Completed'), ('cancelled', 'Cancelled')], default='scheduled', max_length=20)),
                ('items_counted', models.IntegerField(default=0)),
                ('discrepancies_found', models.IntegerField(default=0)),
                ('accuracy_percentage', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('categories', models.ManyToManyField(blank=True, to='inventory.category')),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cycle_counts', to='authentication.company')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='authentication.companyserviceuser')),
                ('warehouse', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cycle_counts', to='inventory.warehouse')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        
        # Create CycleCountItem model
        migrations.CreateModel(
            name='CycleCountItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('expected_quantity', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('counted_quantity', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('variance', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('is_counted', models.BooleanField(default=False)),
                ('notes', models.TextField(blank=True)),
                ('counted_at', models.DateTimeField(blank=True, null=True)),
                ('counted_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='hr.employee')),
                ('cycle_count', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='count_items', to='inventory.cyclecount')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='inventory.product')),
            ],
        ),
        
        # Add unique constraints
        migrations.AddConstraint(
            model_name='productbundle',
            constraint=models.UniqueConstraint(fields=('company', 'bundle_code'), name='unique_company_bundle_code'),
        ),
        migrations.AddConstraint(
            model_name='productbundleitem',
            constraint=models.UniqueConstraint(fields=('bundle', 'product'), name='unique_bundle_product'),
        ),
    ]