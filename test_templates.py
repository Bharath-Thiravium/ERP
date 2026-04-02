#!/usr/bin/env python3
"""
Template Implementation Accuracy Test
Tests all 12 template previews + settings endpoints for the SAP company dashboard.

Usage:
  python3 test_templates.py                          # uses localhost
  python3 test_templates.py --host sap.athenas.co.in --https
  python3 test_templates.py --session <session_key>  # skip login, use existing key
  python3 test_templates.py --jwt <access_token>     # for preview endpoints
"""

import argparse
import json
import sys
import os
import re
import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ── Colours ──────────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

passed = failed = skipped = 0

def ok(msg):
    global passed; passed += 1
    print(f"  {GREEN}✓{RESET} {msg}")

def fail(msg, detail=""):
    global failed; failed += 1
    print(f"  {RED}✗{RESET} {msg}")
    if detail:
        print(f"    {RED}→ {detail}{RESET}")

def warn(msg):
    global skipped; skipped += 1
    print(f"  {YELLOW}⚠{RESET} {msg}")

def section(title):
    print(f"\n{BOLD}{CYAN}{'─'*60}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{'─'*60}{RESET}")

# ── Argument parsing ──────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--host",       default="127.0.0.1:8004")
parser.add_argument("--https",      action="store_true")
parser.add_argument("--session",    default="",  help="Service user session key")
parser.add_argument("--jwt",        default="",  help="Company user JWT access token")
parser.add_argument("--email",      default="",  help="Company user email for auto-login")
parser.add_argument("--password",   default="",  help="Company user password for auto-login")
parser.add_argument("--su-id",      default="",  help="Service user unique_service_id")
parser.add_argument("--su-pass",    default="",  help="Service user password")
parser.add_argument("--su-type",    default="finance", help="Service type (default: finance)")
args = parser.parse_args()

SCHEME = "https" if args.https else "http"
BASE   = f"{SCHEME}://{args.host}"
VERIFY = False  # skip SSL verify for self-signed certs

session_key = args.session
jwt_token   = args.jwt

# ── Step 1: Obtain JWT (company user) ────────────────────────────────────────
section("1. Authentication")

if jwt_token:
    ok(f"JWT provided via --jwt flag")
elif args.email and args.password:
    try:
        r = requests.post(
            f"{BASE}/api/auth/company/login/",
            json={"email": args.email, "password": args.password},
            verify=VERIFY, timeout=10
        )
        if r.status_code == 200 and r.json().get("access"):
            jwt_token = r.json()["access"]
            ok(f"Company login successful → JWT obtained")
        else:
            fail("Company login failed", f"HTTP {r.status_code}: {r.text[:200]}")
    except Exception as e:
        fail("Company login request failed", str(e))
else:
    warn("No JWT or credentials provided — preview endpoint tests will be skipped")
    warn("Pass --email / --password  OR  --jwt <token>  to test previews")

# ── Step 2: Obtain service user session key ───────────────────────────────────
if session_key:
    ok(f"Session key provided via --session flag")
elif args.su_id and args.su_pass:
    try:
        r = requests.post(
            f"{BASE}/api/auth/service-user/login/",
            json={
                "unique_service_id": args.su_id,
                "password": args.su_pass,
                "service_type": args.su_type,
            },
            verify=VERIFY, timeout=10
        )
        if r.status_code == 200 and r.json().get("session_key"):
            session_key = r.json()["session_key"]
            ok(f"Service user login successful → session key obtained")
        else:
            fail("Service user login failed", f"HTTP {r.status_code}: {r.text[:200]}")
    except Exception as e:
        fail("Service user login request failed", str(e))
else:
    warn("No session key or service user credentials — settings endpoint tests will be skipped")
    warn("Pass --session <key>  OR  --su-id / --su-pass  to test settings")

# ── Step 3: Template Info endpoint (public) ───────────────────────────────────
section("2. Template Info Endpoint (public)")

try:
    r = requests.get(f"{BASE}/api/company-dashboard/template-info/", verify=VERIFY, timeout=10)
    if r.status_code == 200:
        ok(f"GET /template-info/ → 200")
        data = r.json()
        if data.get("success"):
            ok("Response has success=true")
        else:
            fail("Response missing success=true", str(data)[:200])

        for key in ["quotation_templates", "po_templates", "proforma_templates", "invoice_templates"]:
            templates = data.get("data", {}).get(key, [])
            if len(templates) == 3:
                ok(f"  {key}: 3 templates returned")
            else:
                fail(f"  {key}: expected 3, got {len(templates)}")

        for tmpl in data.get("data", {}).get("quotation_templates", []):
            if tmpl.get("code") in ["AS", "BKGE", "TC"]:
                ok(f"  Template code '{tmpl['code']}' present with name: {tmpl.get('name','?')}")
            else:
                fail(f"  Unexpected template code: {tmpl.get('code')}")
    else:
        fail(f"GET /template-info/ → {r.status_code}", r.text[:200])
except Exception as e:
    fail("Template info request failed", str(e))

# ── Step 4: Settings endpoints (require session key) ─────────────────────────
section("3. Settings Endpoints (service user session)")

SETTINGS_ENDPOINTS = [
    ("quotation", "/api/company-dashboard/quotation-template-settings/", "selected_template"),
    ("po",        "/api/company-dashboard/po-template-settings/",        "selected_po_template"),
    ("proforma",  "/api/company-dashboard/proforma-template-settings/",  "selected_proforma_template"),
    ("invoice",   "/api/company-dashboard/invoice-template-settings/",   "selected_invoice_template"),
]

if session_key:
    for name, endpoint, field in SETTINGS_ENDPOINTS:
        try:
            r = requests.get(
                f"{BASE}{endpoint}",
                params={"session_key": session_key},
                verify=VERIFY, timeout=10
            )
            if r.status_code == 200:
                ok(f"GET {endpoint} → 200")
                data = r.json()
                if data.get("success"):
                    ok(f"  success=true")
                else:
                    fail(f"  success not true", str(data)[:150])
                if field in str(data.get("data", {})):
                    ok(f"  Field '{field}' present in response")
                else:
                    fail(f"  Field '{field}' missing from response", str(data.get("data"))[:150])
            elif r.status_code == 401:
                fail(f"GET {endpoint} → 401 Unauthorized (bad session key?)")
            else:
                fail(f"GET {endpoint} → {r.status_code}", r.text[:200])
        except Exception as e:
            fail(f"Settings GET {name} failed", str(e))

    # Test POST update for quotation settings
    try:
        r = requests.post(
            f"{BASE}/api/company-dashboard/quotation-template-settings/",
            params={"session_key": session_key},
            json={"selected_template": "AS"},
            verify=VERIFY, timeout=10
        )
        if r.status_code == 200 and r.json().get("success"):
            ok("POST quotation-template-settings (set AS) → 200 success")
        else:
            fail(f"POST quotation-template-settings → {r.status_code}", r.text[:200])
    except Exception as e:
        fail("POST quotation settings failed", str(e))

    # Test invalid template value rejection
    try:
        r = requests.post(
            f"{BASE}/api/company-dashboard/quotation-template-settings/",
            params={"session_key": session_key},
            json={"selected_template": "INVALID"},
            verify=VERIFY, timeout=10
        )
        if r.status_code == 400:
            ok("POST with invalid template value → 400 (correctly rejected)")
        else:
            fail(f"POST with invalid value should return 400, got {r.status_code}")
    except Exception as e:
        fail("Invalid template POST test failed", str(e))
else:
    warn("Skipping settings endpoint tests (no session key)")

# ── Step 5: Preview endpoints (require JWT) ───────────────────────────────────
section("4. Preview Endpoints (JWT auth)")

PREVIEW_ENDPOINTS = [
    ("quotation", "/api/company-dashboard/quotation-template-preview/"),
    ("po",        "/api/company-dashboard/po-template-preview/"),
    ("proforma",  "/api/company-dashboard/proforma-template-preview/"),
    ("invoice",   "/api/company-dashboard/invoice-template-preview/"),
]

STYLES = ["AS", "BKGE", "TC"]

if jwt_token:
    headers = {"Authorization": f"Bearer {jwt_token}"}

    for doc_name, endpoint_base in PREVIEW_ENDPOINTS:
        for style in STYLES:
            url = f"{BASE}{endpoint_base}{style}/"
            try:
                r = requests.get(url, headers=headers, verify=VERIFY, timeout=20)
                if r.status_code == 200:
                    ok(f"GET {endpoint_base}{style}/ → 200")
                    ct = r.headers.get("Content-Type", "")
                    if "text/html" in ct:
                        ok(f"  Content-Type is text/html")
                    else:
                        fail(f"  Expected text/html, got: {ct}")

                    html = r.text

                    # ── Check logo panel exists ──
                    if "hdr-logo" in html:
                        ok(f"  Logo panel (hdr-logo) present in HTML")
                    else:
                        fail(f"  Logo panel (hdr-logo) MISSING from HTML")

                    # ── Check monogram fallback exists ──
                    if "monogram" in html:
                        ok(f"  Monogram fallback present")
                    else:
                        fail(f"  Monogram fallback MISSING")

                    # ── Check correct doc variable used ──
                    var_map = {
                        "quotation": "quotation.quotation_number",
                        "po":        "purchase_order.po_number",
                        "proforma":  "proforma.proforma_number",
                        "invoice":   "invoice.invoice_number",
                    }
                    # In rendered HTML the Django vars are replaced with values
                    # so check for doc-specific rendered content instead
                    doc_markers = {
                        "quotation": ["Quotation", "QT/"],
                        "po":        ["Purchase Order", "PO/"],
                        "proforma":  ["Proforma Invoice", "PI/"],
                        "invoice":   ["Invoice", "INV/"],
                    }
                    markers = doc_markers[doc_name]
                    found = any(m in html for m in markers)
                    if found:
                        ok(f"  Document type marker found in rendered HTML")
                    else:
                        fail(f"  Document type marker not found (expected one of {markers})")

                    # ── Style-specific checks ──
                    if style == "AS":
                        if "accent" in html or "top-bar" in html or "hdr-co" in html:
                            ok(f"  AS style structure confirmed")
                        else:
                            fail(f"  AS style structure not detected")

                    elif style == "BKGE":
                        if "strip" in html or "0f766e" in html:
                            ok(f"  BKGE style structure confirmed (teal colour)")
                        else:
                            fail(f"  BKGE style structure not detected")

                    elif style == "TC":
                        if "gold-rule" in html or "c9a84c" in html:
                            ok(f"  TC style structure confirmed (gold colour)")
                        else:
                            fail(f"  TC style structure not detected")

                        # TC-specific: HSN summary table
                        if "HSN" in html and "SAC" in html and "Tax Summary" in html:
                            ok(f"  TC: HSN/SAC Tax Summary table present")
                        else:
                            fail(f"  TC: HSN/SAC Tax Summary table MISSING")

                        # TC-specific: bank details
                        if "Bank Details" in html or "IFSC" in html:
                            ok(f"  TC: Bank details section present")
                        else:
                            fail(f"  TC: Bank details section MISSING")

                        # TC-specific: 3 signatures
                        sig_count = html.count("sigspace")
                        if sig_count >= 3:
                            ok(f"  TC: {sig_count} signature blocks present")
                        else:
                            fail(f"  TC: Expected 3 signature blocks, found {sig_count}")

                    # ── Check no broken Django template tags remain ──
                    broken = re.findall(r'\{\{[^}]*%%[^}]*\}\}|\{%[^%]*%%[^%]*%\}', html)
                    if broken:
                        fail(f"  Broken placeholder tags found: {broken[:3]}")
                    else:
                        ok(f"  No broken placeholder tags")

                    # ── Check no literal 'purchase_order' == 'invoice' artifacts ──
                    if "'invoice' == 'purchase_order'" in html or "'quotation' == 'purchase_order'" in html:
                        fail(f"  Broken sed artifact found in HTML")
                    else:
                        ok(f"  No sed artifacts detected")

                elif r.status_code == 401:
                    fail(f"GET {endpoint_base}{style}/ → 401 (JWT expired or invalid?)")
                elif r.status_code == 403:
                    fail(f"GET {endpoint_base}{style}/ → 403 (company not approved?)")
                else:
                    fail(f"GET {endpoint_base}{style}/ → {r.status_code}", r.text[:200])

            except Exception as e:
                fail(f"Preview {doc_name}/{style} request failed", str(e))

    # ── Test unauthenticated preview is rejected ──
    try:
        r = requests.get(
            f"{BASE}/api/company-dashboard/quotation-template-preview/AS/",
            verify=VERIFY, timeout=10
        )
        if r.status_code in [401, 403]:
            ok(f"Unauthenticated preview correctly rejected → {r.status_code}")
        else:
            fail(f"Unauthenticated preview should be 401/403, got {r.status_code}")
    except Exception as e:
        fail("Unauthenticated preview test failed", str(e))

    # ── Test invalid template name rejected ──
    try:
        r = requests.get(
            f"{BASE}/api/company-dashboard/quotation-template-preview/INVALID/",
            headers=headers, verify=VERIFY, timeout=10
        )
        if r.status_code == 400:
            ok("Invalid template name correctly rejected → 400")
        else:
            fail(f"Invalid template name should return 400, got {r.status_code}")
    except Exception as e:
        fail("Invalid template name test failed", str(e))

else:
    warn("Skipping preview endpoint tests (no JWT token)")

# ── Step 6: Template file integrity check ────────────────────────────────────
section("5. Template File Integrity (filesystem)")

TEMPLATE_FILES = {
    "finance/quotation_templates/AS/quotation.html":          ("quotation", "AS"),
    "finance/quotation_templates/BKGE/quotation.html":        ("quotation", "BKGE"),
    "finance/quotation_templates/TC/quotation.html":          ("quotation", "TC"),
    "invoice_templates/AS/invoice.html":                      ("invoice",   "AS"),
    "invoice_templates/BKGE/invoice.html":                    ("invoice",   "BKGE"),
    "invoice_templates/TC/invoice.html":                      ("invoice",   "TC"),
    "proforma_templates/AS/proforma_invoice.html":            ("proforma",  "AS"),
    "proforma_templates/BKGE/proforma_invoice.html":          ("proforma",  "BKGE"),
    "proforma_templates/TC/proforma_invoice.html":            ("proforma",  "TC"),
    "po_templates/AS/purchase_order.html":                    ("po",        "AS"),
    "po_templates/BKGE/purchase_order.html":                  ("po",        "BKGE"),
    "po_templates/TC/purchase_order.html":                    ("po",        "TC"),
}

TEMPLATE_BASE = "/var/www/SAP-Python/backend/finance/templates"

DOC_VAR_MAP = {
    "quotation": ("quotation.quotation_number", "quotation.quotation_date"),
    "invoice":   ("invoice.invoice_number",     "invoice.invoice_date"),
    "proforma":  ("proforma.proforma_number",   "proforma.proforma_date"),
    "po":        ("purchase_order.po_number",   "purchase_order.po_date"),
}

PARTY_LABEL_MAP = {
    "quotation": "Bill To",
    "invoice":   "Bill To",
    "proforma":  "Bill To",
    "po":        "Vendor",
}

for rel_path, (doc_type, style) in TEMPLATE_FILES.items():
    full_path = os.path.join(TEMPLATE_BASE, rel_path)
    if not os.path.exists(full_path):
        fail(f"File missing: {rel_path}")
        continue

    with open(full_path) as f:
        content = f.read()

    ok(f"File exists: {rel_path}")

    # Check logo panel
    if "hdr-logo" in content:
        ok(f"  [{style}] Logo panel (hdr-logo) present")
    else:
        fail(f"  [{style}] Logo panel MISSING in {rel_path}")

    # Check logo_path variable used (not company.logo.url)
    if "company.logo.url" in content:
        fail(f"  [{style}] Still uses company.logo.url (should use logo_path)")
    else:
        ok(f"  [{style}] Uses logo_path (not company.logo.url)")

    # Check monogram fallback
    if "monogram" in content:
        ok(f"  [{style}] Monogram fallback present")
    else:
        fail(f"  [{style}] Monogram fallback MISSING")

    # Check correct doc variable
    num_var, date_var = DOC_VAR_MAP[doc_type]
    if num_var in content:
        ok(f"  [{style}] Correct doc variable: {num_var}")
    else:
        fail(f"  [{style}] Wrong doc variable — expected {num_var}")

    # Check party label
    expected_label = PARTY_LABEL_MAP[doc_type]
    if expected_label in content:
        ok(f"  [{style}] Party label '{expected_label}' correct")
    else:
        fail(f"  [{style}] Party label '{expected_label}' MISSING")

    # Check no broken placeholders remain
    if "%%" in content:
        remaining = re.findall(r'%%\w+%%', content)
        fail(f"  [{style}] Unreplaced placeholders: {remaining}")
    else:
        ok(f"  [{style}] No unreplaced placeholders")

    # Check no sed artifacts
    if "'invoice' == 'purchase_order'" in content or "{% if 'quotation' ==" in content:
        fail(f"  [{style}] Sed artifact found")
    else:
        ok(f"  [{style}] No sed artifacts")

    # TC-specific checks
    if style == "TC":
        if "hsn" in content and "Tax Summary" in content:
            ok(f"  [TC] HSN Tax Summary table present")
        else:
            fail(f"  [TC] HSN Tax Summary table MISSING in {rel_path}")

        if "bankbox" in content or "bank-box" in content:
            ok(f"  [TC] Bank details section present")
        else:
            fail(f"  [TC] Bank details section MISSING in {rel_path}")

        sig_count = content.count("sigspace")
        if sig_count >= 3:
            ok(f"  [TC] {sig_count} signature blocks present")
        else:
            fail(f"  [TC] Expected 3 signatures, found {sig_count} in {rel_path}")

    # BKGE-specific checks
    if style == "BKGE":
        if "0f766e" in content:
            ok(f"  [BKGE] Teal colour scheme confirmed")
        else:
            fail(f"  [BKGE] Teal colour missing in {rel_path}")

        if "words" in content or "Amount in Words" in content:
            ok(f"  [BKGE] Amount in Words section present")
        else:
            fail(f"  [BKGE] Amount in Words MISSING in {rel_path}")

# ── Step 7: PDF service logo_path injection check ────────────────────────────
section("6. PDF Service logo_path Injection")

SERVICE_FILES = {
    "quotation_pdf_service.py": "quotation_pdf_service.py",
    "invoice_service.py":       "invoice_service.py",
    "proforma_pdf_service.py":  "proforma_pdf_service.py",
    "po_pdf_service.py":        "po_pdf_service.py",
}

SERVICE_BASE = "/var/www/SAP-Python/backend/finance"

for filename, label in SERVICE_FILES.items():
    full = os.path.join(SERVICE_BASE, filename)
    if not os.path.exists(full):
        fail(f"Service file missing: {filename}")
        continue
    with open(full) as f:
        src = f.read()
    if "'logo_path'" in src or '"logo_path"' in src:
        ok(f"{label}: logo_path injected into context")
    else:
        fail(f"{label}: logo_path NOT found in context")
    if "_get_logo_path" in src:
        ok(f"{label}: _get_logo_path method present")
    else:
        fail(f"{label}: _get_logo_path method MISSING")
    if "file://" in src:
        ok(f"{label}: file:// URI used for WeasyPrint")
    else:
        fail(f"{label}: file:// URI MISSING (WeasyPrint won't load logo)")

# ── Summary ───────────────────────────────────────────────────────────────────
section("Summary")
total = passed + failed + skipped
print(f"  {GREEN}Passed : {passed}{RESET}")
print(f"  {RED}Failed : {failed}{RESET}")
print(f"  {YELLOW}Skipped: {skipped}{RESET}")
print(f"  Total  : {total}\n")

if failed == 0:
    print(f"{GREEN}{BOLD}  ✓ All checks passed.{RESET}\n")
else:
    print(f"{RED}{BOLD}  ✗ {failed} check(s) failed — review output above.{RESET}\n")

sys.exit(0 if failed == 0 else 1)
