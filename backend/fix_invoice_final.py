#!/usr/bin/env python3
"""Remove ALL reference_details usage from all invoice templates."""
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

    # 1. Remove any remaining {% if reference_details... %}...{% endif %} blocks
    marker = '{% if reference_details'
    while marker in content:
        start = content.index(marker)
        pos = start + len(marker)
        depth = 1
        end = len(content)
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

    # 2. Remove duplicate cgnotice div (body notice) — keep only footer span
    content = re.sub(
        r'<div class="cgnotice"[^>]*>.*?</div>\s*\n?',
        '',
        content,
        flags=re.DOTALL
    )

    if content != original:
        open(path, 'w', encoding='utf-8').write(content)
        athena = content.count('athenas.co.in')
        ref = content.count('reference_details')
        cg = content.count('cgnotice')
        print(f"UPDATED {'/'.join(path.split('/')[-3:])}: athena={athena} ref={ref} cgnotice={cg}")
    else:
        print(f"NO CHANGE: {'/'.join(path.split('/')[-3:])}")
