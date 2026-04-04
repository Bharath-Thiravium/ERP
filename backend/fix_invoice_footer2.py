#!/usr/bin/env python3
import re

templates = [
    "/var/www/SAP-Python/backend/finance/templates/invoice_templates/AS/invoice.html",
    "/var/www/SAP-Python/backend/finance/templates/invoice_templates/BKGE/invoice.html",
    "/var/www/SAP-Python/backend/finance/templates/invoice_templates/TC/invoice.html",
    "/var/www/SAP-Python/backend/finance/templates/finance/invoice_templates/AS/invoice.html",
    "/var/www/SAP-Python/backend/finance/templates/finance/invoice_templates/BKGE/invoice.html",
    "/var/www/SAP-Python/backend/finance/templates/finance/invoice_templates/TC/invoice.html",
]

for path in templates:
    content = open(path, encoding='utf-8').read()
    original = content

    # 1. Remove the cgnotice div (the duplicate Athena text inside body)
    content = re.sub(
        r'<div class="cgnotice"[^>]*>.*?athenas\.co\.in.*?</div>\s*\n?',
        '',
        content,
        flags=re.DOTALL
    )

    # 2. Remove the entire Reference Details block
    #    Starts at {% if reference_details.quotation or reference_details.purchase_order ...%}
    #    Ends at the matching {% endif %}
    marker = '{% if reference_details.quotation or reference_details.purchase_order or reference_details.previous_invoices %}'
    if marker in content:
        start = content.index(marker)
        # Find matching {% endif %} accounting for nesting
        pos = start + len(marker)
        depth = 1
        while depth > 0 and pos < len(content):
            next_if    = content.find('{% if ', pos)
            next_endif = content.find('{% endif %}', pos)
            if next_endif == -1:
                break
            if next_if != -1 and next_if < next_endif:
                depth += 1
                pos = next_if + 6
            else:
                depth -= 1
                if depth == 0:
                    end = next_endif + len('{% endif %}')
                    break
                pos = next_endif + 11
        content = content[:start] + content[end:].lstrip('\n')

    if content != original:
        open(path, 'w', encoding='utf-8').write(content)
        print(f"UPDATED: {'/'.join(path.split('/')[-3:])}")
    else:
        print(f"NO CHANGE: {'/'.join(path.split('/')[-3:])}")
