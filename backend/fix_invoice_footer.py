#!/usr/bin/env python3
import os

ATHENA_TEXT = 'This invoice was generated with the help of <a href="https://www.athenas.co.in/accounts/" style="color:inherit;text-decoration:none">ᗩTᕼᙓᑎᗩ\'𝔖</a>'

templates = [
    "/var/www/SAP-Python/backend/finance/templates/invoice_templates/AS/invoice.html",
    "/var/www/SAP-Python/backend/finance/templates/invoice_templates/BKGE/invoice.html",
    "/var/www/SAP-Python/backend/finance/templates/invoice_templates/TC/invoice.html",
    "/var/www/SAP-Python/backend/finance/templates/finance/invoice_templates/AS/invoice.html",
    "/var/www/SAP-Python/backend/finance/templates/finance/invoice_templates/BKGE/invoice.html",
    "/var/www/SAP-Python/backend/finance/templates/finance/invoice_templates/TC/invoice.html",
]

old_texts = [
    "This is a computer-generated document. No physical signature is required.",
    "Computer-generated document — no physical signature required",
    "Computer-generated document.",
    "Computer-generated document",
]

for path in templates:
    content = open(path, encoding='utf-8').read()
    original = content
    for old in old_texts:
        content = content.replace(old, ATHENA_TEXT)
    if content != original:
        open(path, 'w', encoding='utf-8').write(content)
        print(f"UPDATED: {'/'.join(path.split('/')[-3:])}")
    else:
        print(f"NO CHANGE: {'/'.join(path.split('/')[-3:])}")
