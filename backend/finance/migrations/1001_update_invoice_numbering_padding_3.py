from django.db import migrations


def update_invoice_numbering_rule(apps, schema_editor):
    NumberingRule = apps.get_model('finance', 'NumberingRule')
    invoice_rules = NumberingRule.objects.filter(module='invoice')

    for rule in invoice_rules:
        # Preserve manual overrides where the company explicitly opted out.
        if rule.allow_manual_override:
            continue

        rule.template = '{COMPANY}-{PREFIX}-{FY_SHORT}-{NUMBER}'
        rule.prefix = 'INV'
        rule.separator = '-'
        rule.padding = 3
        rule.reset_scope = 'yearly'
        rule.start_from = 1
        rule.save(update_fields=['template', 'prefix', 'separator', 'padding', 'reset_scope', 'start_from'])


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '1000_merge_20260426_0814'),
    ]

    operations = [
        migrations.RunPython(update_invoice_numbering_rule, migrations.RunPython.noop),
    ]
