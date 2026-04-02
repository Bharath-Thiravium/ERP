"""
Generate all 12 document templates from 3 master files.
Run from: /var/www/SAP-Python/backend/finance/templates/
"""
import os

BASE = os.path.dirname(os.path.abspath(__file__))

DOCS = [
    {
        "obj":         "quotation",
        "num_field":   "quotation_number",
        "date_field":  "quotation_date",
        "valid_field": "valid_until",
        "valid_label": "Valid Until",
        "title":       "Quotation",
        "title_lower": "quotation",
        "party_label": "Bill To",
        "styles": {
            "AS":   ("finance/quotation_templates/AS/quotation.html",   "finance/quotation_templates/AS/quotation.html"),
            "BKGE": ("finance/quotation_templates/BKGE/quotation.html", "finance/quotation_templates/BKGE/quotation.html"),
            "TC":   ("finance/quotation_templates/TC/quotation.html",   "finance/quotation_templates/TC/quotation.html"),
        },
    },
    {
        "obj":         "invoice",
        "num_field":   "invoice_number",
        "date_field":  "invoice_date",
        "valid_field": "due_date",
        "valid_label": "Due Date",
        "title":       "Invoice",
        "title_lower": "invoice",
        "party_label": "Bill To",
        "styles": {
            "AS":   ("invoice_templates/AS/invoice.html",   "finance/invoice_templates/AS/invoice.html"),
            "BKGE": ("invoice_templates/BKGE/invoice.html", "finance/invoice_templates/BKGE/invoice.html"),
            "TC":   ("invoice_templates/TC/invoice.html",   "finance/invoice_templates/TC/invoice.html"),
        },
    },
    {
        "obj":         "proforma",
        "num_field":   "proforma_number",
        "date_field":  "proforma_date",
        "valid_field": "due_date",
        "valid_label": "Due Date",
        "title":       "Proforma Invoice",
        "title_lower": "proforma invoice",
        "party_label": "Bill To",
        "styles": {
            "AS":   ("proforma_templates/AS/proforma_invoice.html",   "finance/proforma_templates/AS/proforma_invoice.html"),
            "BKGE": ("proforma_templates/BKGE/proforma_invoice.html", "finance/proforma_templates/BKGE/proforma_invoice.html"),
            "TC":   ("proforma_templates/TC/proforma_invoice.html",   "finance/proforma_templates/TC/proforma_invoice.html"),
        },
    },
    {
        "obj":         "purchase_order",
        "num_field":   "po_number",
        "date_field":  "po_date",
        "valid_field": "delivery_date",
        "valid_label": "Delivery Date",
        "title":       "Purchase Order",
        "title_lower": "purchase order",
        "party_label": "Vendor",
        "styles": {
            "AS":   ("po_templates/AS/purchase_order.html",   None),
            "BKGE": ("po_templates/BKGE/purchase_order.html", None),
            "TC":   ("po_templates/TC/purchase_order.html",   None),
        },
    },
]

MASTERS = {
    "AS":   open(os.path.join(BASE, "_master_AS.html")).read(),
    "BKGE": open(os.path.join(BASE, "_master_BKGE.html")).read(),
    "TC":   open(os.path.join(BASE, "_master_TC.html")).read(),
}

written = 0
for doc in DOCS:
    for style, (path1, path2) in doc["styles"].items():
        content = MASTERS[style]
        content = content.replace("%%DOC_TITLE%%",       doc["title"])
        content = content.replace("%%DOC_TITLE_LOWER%%", doc["title_lower"])
        content = content.replace("%%DOC_OBJ%%",         doc["obj"])
        content = content.replace("%%DOC_NUM_FIELD%%",   doc["num_field"])
        content = content.replace("%%DOC_DATE_FIELD%%",  doc["date_field"])
        content = content.replace("%%VALID_FIELD%%",     doc["valid_field"])
        content = content.replace("%%VALID_LABEL%%",     doc["valid_label"])
        content = content.replace("%%PARTY_LABEL%%",     doc["party_label"])
        content = content.replace("%%DOC_NUMBER_DISPLAY%%", "")

        for dest in [path1, path2]:
            if not dest:
                continue
            full = os.path.join(BASE, dest)
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, "w") as f:
                f.write(content)
            print(f"  wrote: {dest}")
            written += 1

print(f"\nDone — {written} files written.")
