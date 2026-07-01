# CRM_PHASE1_IMPLEMENTATION_REPORT.md
## CRM Phase 1 — Critical Security & Data Integrity Fixes
**Project:** SAP-Python Multi-Tenant ERP
**Date:** 2026-07-01
**Status:** COMPLETE — `python manage.py check` passes with 0 issues; 17/17 CRM tests pass

---

## 1. Files Modified

| File | Change Summary |
|------|-----------------|
| `backend/crm/serializers.py` | Added shared `get_context_company()`/`validate_same_company()` helpers; added `validate_<field>()` FK-ownership checks across 13 serializers; added duplicate-detection `validate()` to Lead/Contact/Account/Opportunity serializers |
| `backend/crm/phase3_serializers.py` | Added FK-ownership checks to `MarketingCampaignSerializer.email_template` and `EmailSendSerializer.campaign` |
| `backend/crm/phase4_serializers.py` | Added FK-ownership checks to `IntegrationLogSerializer.integration`, `MobileSyncSerializer.device`, `ComplianceViolationSerializer.rule`; rebuilt `ThirdPartyIntegrationSerializer` around encrypted API key storage |
| `backend/crm/models.py` | `CalendarIntegration.credentials`: JSONField (plaintext) → BinaryField (Fernet-encrypted) with `set_credentials()`/`get_credentials()`; `Lead.lead_id`, `Contact.contact_id`, `Account.account_id`, `Opportunity.opportunity_id`, `Activity.activity_id`, `Campaign.campaign_id`: removed global `unique=True`, added `unique_together = ['company', '<field>']` |
| `backend/crm/phase4_models.py` | `ThirdPartyIntegration.api_key` (plaintext CharField) replaced with `encrypted_api_key` (BinaryField) + `set_api_key()`/`get_api_key()` |
| `backend/crm/calendar_integration.py` | Updated 4 call sites to use `get_credentials()`/`set_credentials()` instead of direct dict access on `CalendarIntegration.credentials` |
| `backend/crm/viewsets.py` | `CampaignViewSet.add_members` wrapped in `transaction.atomic()`; fixed a pre-existing bug in `LeadViewSet.convert_to_opportunity` where `company` was never passed to `.save()` (see Section 3) |
| `backend/crm/migrations/0010_encrypt_integration_credentials.py` | New migration: encrypts pre-existing `CalendarIntegration.credentials` / `ThirdPartyIntegration.api_key` data, then drops the old plaintext columns |
| `backend/crm/migrations/0011_percompany_unique_identifiers.py` | New migration: converts the 6 globally-unique ID fields to per-company `unique_together` constraints |
| `backend/crm/tests.py` | Added `CRMPhase1SecurityTest` — 14 regression tests |

---

## 2. Exact Fixes Implemented

### Fix 1 — Cross-Company ForeignKey Injection

**Root cause:** Every CRM serializer uses `fields = '__all__'`, so every FK field (both ModelSerializer auto-generated and explicit `PrimaryKeyRelatedField`) resolves against an unscoped `Model.objects.all()` queryset. A Company A caller could submit a Company B object's ID for any FK field and the serializer would accept it — the ViewSet's `get_queryset()` company filter has no effect on what a serializer field will accept on create/update.

**Fix:** Added shared helpers to `crm/serializers.py`:
```python
def get_context_company(context):
    """Resolve the authenticated company from serializer context (service user or company user)."""
    ...

def validate_same_company(value, context, label):
    """Ensure a referenced FK instance belongs to the authenticated company."""
    if value is None:
        return value
    company = get_context_company(context)
    if company is not None and getattr(value, 'company_id', None) != company.id:
        raise serializers.ValidationError(f'{label} not found or access denied.')
    return value
```

Added `validate_<field>()` methods (DRF runs these before `create()`/`update()`) to:

| Serializer | Fields validated |
|------------|-------------------|
| `OpportunitySerializer` | `account`, `contact` |
| `AccountSerializer` | `primary_contact` |
| `ActivitySerializer` | `lead`, `contact`, `account`, `opportunity` |
| `CampaignMemberSerializer` | `campaign`, `lead`, `contact` |
| `TicketSerializer` | `contact`, `account`, `category`, `sla` |
| `KnowledgeBaseSerializer` | `category` |
| `LeadScoreSerializer` | `lead` |
| `DealSerializer` | `account`, `contact`, `current_stage`, `opportunity` |
| `DealStageHistorySerializer` | `deal`, `stage` |
| `CustomerInteractionSerializer` | `contact`, `account`, `deal` |
| `CustomerHealthScoreSerializer` | `account` |
| `CustomerSegmentMembershipSerializer` | `segment`, `account` |
| `MarketingCampaignSerializer` (phase3) | `email_template` |
| `EmailSendSerializer` (phase3) | `campaign` |
| `IntegrationLogSerializer` (phase4) | `integration` |
| `MobileSyncSerializer` (phase4) | `device` |
| `ComplianceViolationSerializer` (phase4) | `rule` |

**Confirmed exploit path (most severe):** Before this fix, a Company A service user could `POST /api/crm/opportunities/` with `account: <Company B's account ID>` and the Opportunity would be created referencing Company B's account/revenue data — even though the Opportunity itself is correctly tagged with Company A's `company` field (injected by `CompanyScopedModelViewSet.perform_create()`). This left a cross-tenant data-linkage hole even though direct row ownership was correct.

---

### Fix 2 — Encrypt Third-Party API Credentials

**`CalendarIntegration.credentials`** — was `models.JSONField(default=dict)` with a `# Encrypted credentials` comment that was **not actually true** — the field stored plaintext OAuth access/refresh tokens. Fixed:
```python
credentials = models.BinaryField(null=True, blank=True)  # Store Fernet-encrypted bytes

def set_credentials(self, credentials_dict):
    ...
    self.credentials = f.encrypt(json.dumps(credentials_dict).encode())

def get_credentials(self):
    ...
    return json.loads(f.decrypt(bytes(self.credentials)).decode())
```
This mirrors the existing (already-correct) `EmailIntegration.credentials` pattern and reuses the same `settings.EMAIL_ENCRYPTION_KEY` Fernet key. Updated all 4 call sites in `calendar_integration.py` (`_update_stored_credentials`, `CalendarIntegrationManager.get_integration`) to use `get_credentials()`/`set_credentials()` instead of direct dict access.

**`ThirdPartyIntegration.api_key`** — was `models.CharField(max_length=500, blank=True)  # Encrypted` — again a misleading comment; the field was plaintext, and the serializer's `extra_kwargs = {'api_key': {'write_only': True}}` only hid it from API *responses*, it did not encrypt anything at rest. Fixed:
- Renamed the underlying storage field to `encrypted_api_key = models.BinaryField(null=True, blank=True)`
- Added `set_api_key()` / `get_api_key()` methods using the same Fernet pattern
- Rebuilt `ThirdPartyIntegrationSerializer` to expose `api_key` as a **virtual, write-only** field not backed directly by a model column:
```python
class ThirdPartyIntegrationSerializer(serializers.ModelSerializer):
    api_key = serializers.CharField(write_only=True, required=False, allow_blank=True)
    class Meta:
        model = ThirdPartyIntegration
        fields = [... 'api_key', ...]  # encrypted_api_key intentionally excluded

    def create(self, validated_data):
        api_key = validated_data.pop('api_key', '')
        instance = ThirdPartyIntegration(**validated_data)
        instance.set_api_key(api_key)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        api_key = validated_data.pop('api_key', None)
        instance = super().update(instance, validated_data)
        if api_key is not None:
            instance.set_api_key(api_key)
            instance.save()
        return instance
```
Plaintext `api_key` is never written to the database; only the Fernet-encrypted ciphertext (`encrypted_api_key`) is persisted, and it is never included in API responses (no serializer field maps to it).

**Migration safety:** `0010_encrypt_integration_credentials.py` adds the new encrypted columns, runs a data migration that encrypts any pre-existing plaintext values (defensive — the dev database had 0 rows in both tables, but this makes the migration safe to run against an environment with real data), then drops the old plaintext columns.

**Verified via direct round-trip test:**
```
CalendarIntegration.credentials is bytes: True
CalendarIntegration.credentials round-trip: {'access_token': 'secret123', 'refresh_token': 'refresh456'}
ThirdPartyIntegration.encrypted_api_key is bytes: True
ThirdPartyIntegration.get_api_key() round-trip: sk_live_abc123
Raw encrypted bytes do NOT contain plaintext: True
```

**Not fixed — deferred (lower severity, Phase 2):** `MobileDevice.push_token` (CharField, `write_only` in serializer but plaintext at rest). Push tokens are revocable device identifiers, not "third-party API credentials" in the same sense as OAuth tokens/API keys — flagged for Phase 2 rather than expanding this pass's scope.

---

### Fix 3 — `transaction.atomic()` for Lead Conversion and Multi-Step Workflows

**`LeadViewSet.convert_to_opportunity`** (in `crm/viewsets.py`, the actually-routed ViewSet) was **already wrapped in `transaction.atomic()`** — no change needed there. However, while writing the end-to-end regression test for this exact method, a **separate, pre-existing, critical bug** was discovered and is now fixed (see Section 3a below).

**`CampaignViewSet.add_members`** — loops creating multiple `CampaignMember` rows (from `lead_ids` and `contact_ids`) with **no transaction wrapping**. A failure partway through (e.g. a DB error on the 3rd of 5 members) would leave a partially-added membership list with no rollback. Fixed:
```python
with transaction.atomic():
    # Add leads
    for lead_id in lead_ids:
        ...
    # Add contacts
    for contact_id in contact_ids:
        ...
```

**Not touched (out of scope, documented in Section 5):** `DealViewSet.create()` and several other "Phase 2/3/4" auxiliary ViewSets (tickets, deals, marketing automation, lead scoring, integrations' custom actions) call a `self.get_session_key()` method that **does not exist** on their base class `CRMBaseViewSet` (`crm/views.py`) — this is a pre-existing, wide-reaching **functional** bug (not a security issue; it fails closed with an `AttributeError` → 500, not a data leak) affecting roughly a dozen files. It predates this work and is unrelated to the 7 requested fixes; fixing it would be a large, disproportionate undertaking for a security-focused Phase 1 pass. See Section 5.

---

### Fix 3a — Pre-Existing Bug Found & Fixed: Lead Conversion Was Actually Broken

While building the end-to-end regression test for `convert_to_opportunity` (required by this task's verification list), the test failed with:
```
crm.models.Account.company.RelatedObjectDoesNotExist: Account has no company.
```

**Root cause:** `AccountSerializer`, `ContactSerializer`, and `OpportunitySerializer` all declare `company` as a `read_only` field (`Meta.read_only_fields = [..., 'company']`) — correct, since company must never be settable by the client. But `convert_to_opportunity` builds `account_data = {'company': company.id, ...}` and passes it to the serializer's `data=`, **not knowing** that a read-only field is silently dropped from `validated_data` by DRF. The subsequent `.save()` calls only passed `created_by=default_user` — never `company=company` — so `validated_data` reaching `Account.objects.create(**validated_data)` had no `company` at all, and the model's `save()` method crashed trying to auto-generate `account_id` via `self.company.id`.

**This means Lead Conversion has been broken in production since this pattern was introduced** — every call to `POST /api/crm/leads/{id}/convert_to_opportunity/` would raise a 500 error, not succeed. This was not something introduced by my changes; it predates this work.

**Fix (minimal, 3 lines):**
```python
account = account_serializer.save(company=company, created_by=default_user)
...
contact = contact_serializer.save(company=company, created_by=default_user)
...
opportunity = opportunity_serializer.save(
    company=company,
    created_by=default_user,
    owner_id=lead.assigned_to.id if lead.assigned_to else default_user.id
)
```

This is fixed because: (a) it is required to make the explicitly-named "Lead Conversion" workflow function at all, (b) the task's own verification checklist requires running Lead Conversion, and a broken Lead Conversion cannot be verified as working, (c) the fix is a minimal, mechanical 3-line change with no architectural impact.

---

### Fix 4 — Per-Company Unique Identifiers

**Root cause:** `Lead.lead_id`, `Contact.contact_id`, `Account.account_id`, `Opportunity.opportunity_id`, `Activity.activity_id`, and `Campaign.campaign_id` were all declared `models.CharField(max_length=50, unique=True)` — globally unique across the **entire platform**, not per company. The primary ID-generation path (`generate_auto_code()`) embeds the company's `company_prefix` (e.g. `ITECHLEA001`), which happens to avoid collisions in practice — but the **fallback path** inside each model's `save()` method (triggered whenever `generate_auto_code()` raises any exception) generates a company-agnostic format like `"LEAD-000001"`. Two different companies both hitting the fallback path for their first record would both attempt `"LEAD-000001"` and the second would fail with an `IntegrityError` due to the global constraint — a cross-tenant collision bug baked into the schema itself.

**Fix:** For each of the 6 models:
```python
# Before:
lead_id = models.CharField(max_length=50, unique=True)
# After:
lead_id = models.CharField(max_length=50)
class Meta:
    unique_together = ['company', 'lead_id']
```
(Same pattern applied to `contact_id`, `account_id`, `opportunity_id`, `activity_id`, `campaign_id`.)

**Migration:** `0011_percompany_unique_identifiers.py` alters each field and its unique constraint. Applied cleanly to the dev database (no existing rows required backfill).

**Verified:**
```python
# Same lead_id in two DIFFERENT companies — now succeeds (previously would collide):
Lead.objects.create(company=company_a, lead_id="LEAD-SHARED-001", ...)
Lead.objects.create(company=company_b, lead_id="LEAD-SHARED-001", ...)  # OK

# Same lead_id in the SAME company — still correctly rejected:
Lead.objects.create(company=company_a, lead_id="LEAD-DUPID-001", ...)
Lead.objects.create(company=company_a, lead_id="LEAD-DUPID-001", ...)  # IntegrityError
```

**Not touched (documented for Phase 2):** `Deal.deal_id`, `Ticket.ticket_id`, `CustomerInteraction.interaction_id` have the identical global-`unique=True` issue but live in the "Phase 2/3/4" auxiliary features already affected by the `get_session_key` bug (Section 5) — deferred to keep this change scoped to the explicitly-named core models (Lead/Account/Contact/Opportunity) plus the two structurally-identical, directly-adjacent models (Activity/Campaign) in the same primary `crm/viewsets.py`-served module.

---

### Fix 5 — Duplicate Detection for Leads, Contacts, Accounts, Opportunities

Implemented as **serializer-level business-rule validation** (soft rejection with a clear error message), not a hard database constraint — this preserves flexibility for legitimate edge cases (e.g. intentionally re-entering a contact) while blocking the common accidental-duplicate case that the audit flagged (no email/name uniqueness existed at all previously).

| Serializer | Duplicate rule |
|------------|-----------------|
| `LeadSerializer` | Reject if another Lead in the **same company** has the same email (case-insensitive) |
| `ContactSerializer` | Reject if another Contact in the **same company** has the same email (case-insensitive) |
| `AccountSerializer` | Reject if another Account in the **same company** has the same name (case-insensitive) |
| `OpportunitySerializer` | Reject if another Opportunity against the **same account** has the same name (case-insensitive) |

All four checks:
- Exclude `self.instance` on update (so editing a record doesn't flag itself as a duplicate of itself)
- Only compare within the same company (a shared email across two different companies is **not** flagged — confirmed via test)
- Can be bypassed via `context={'skip_duplicate_check': True}` for internal/trusted flows — added as a safety valve after discovering that `convert_to_opportunity` could otherwise reject a legitimate lead conversion if an Account/Contact with a matching name/email already existed. In practice, `convert_to_opportunity` doesn't pass a `request` in its serializer context at all, so the duplicate check (and the FK-ownership check) already no-op there by design — verified directly; the flag exists for defensive future-proofing only.

---

### Fix 6 — Tenant Isolation Review (CRM ViewSets & Serializers)

**Reviewed:** `crm/viewsets.py` (the actually-routed ViewSets: `LeadViewSet`, `ContactViewSet`, `AccountViewSet`, `OpportunityViewSet`, `ActivityViewSet`, `CampaignViewSet`, `SalesTargetViewSet`, `DashboardViewSet`) — all inherit `common.viewsets.CompanyScopedModelViewSet` (**not modified** — shared base class used by HR/Inventory/Finance/Analytics too, out of scope), which correctly:
- Filters `get_queryset()` by `company=request.service_user.company`
- Injects `company` automatically in `perform_create()` (ignoring any client-supplied value)
- Returns `404` (not `403`, to avoid confirming existence) when `get_object()` detects a cross-company object

No changes were needed to these ViewSets' tenant-scoping logic; it was already correct. The gap was entirely at the **serializer FK field** level (Fix 1) and the **model uniqueness constraint** level (Fix 4).

**Also reviewed:** `crm/views.py`'s `CRMBaseViewSet` (used as the base class for 9 other files: `security_views.py`, `lead_scoring_views.py`, `reporting_views.py`, `quote_views.py`, `marketing_views.py`, `pipeline_views.py`, `support_views.py`, `analytics_views.py`, `integration_views.py`). Its `get_queryset()`/`create()`/`update()` correctly scope by `su.company` — but many of these files' custom `@action` methods and `get_queryset()` overrides call `self.get_session_key()`, a method that **does not exist** on `CRMBaseViewSet` (only a same-named-but-differently-signatured method exists in one unrelated file, `lead_scoring_views.py:269`, which takes a `request` argument and is never actually the one being called). This causes an `AttributeError` on every affected request — i.e. those endpoints are currently **completely non-functional** (return 500), not insecure. See Section 5 — flagged for Phase 2, not fixed here (out of scope, large blast radius, purely a reliability bug not a security one).

---

### Fix 7 — API Contract Preservation

- All CRM endpoint URLs, HTTP methods, and response shapes are unchanged.
- `ThirdPartyIntegrationSerializer`'s public contract is unchanged from the caller's perspective: `api_key` is still accepted on create/update and still never appears in responses — only the internal storage mechanism changed (plaintext → encrypted).
- New error responses that did not previously exist:
  - `400 {"<field>": ["<Model> not found or access denied."]}` for any cross-tenant FK reference (previously silently succeeded — a security-driven, intentional contract change)
  - `400 {"email": ["A lead/contact with email \"...\" already exists for this company."]}` / `{"name": ["An account/opportunity named \"...\" already exists..."]}` for duplicates (previously silently succeeded)
- `convert_to_opportunity`'s response shape is unchanged; its previously-broken 500-error behavior is now a working 200 response (see Fix 3a) — a bug fix, not a contract change (there was no working contract to preserve).

---

## 3. Security Issues Resolved

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Cross-tenant FK injection across 16+ serializers (Opportunity→Account/Contact, Activity→Lead/Contact/Account/Opportunity, Account→primary_contact, Deal/Ticket/CustomerInteraction/etc.) | **Critical** | Fixed |
| 2 | `ThirdPartyIntegration.api_key` stored in plaintext despite a misleading "# Encrypted" comment | **Critical** | Fixed |
| 3 | `CalendarIntegration.credentials` (OAuth access/refresh tokens) stored in plaintext despite a misleading "# Encrypted credentials" comment | **Critical** | Fixed |
| 4 | Globally-unique `lead_id`/`contact_id`/`account_id`/`opportunity_id`/`activity_id`/`campaign_id` could collide across companies via the fallback ID-generation path | **Medium** | Fixed |
| 5 | No duplicate detection for Lead/Contact (by email) or Account/Opportunity (by name) — unlimited accidental duplicates | **Medium** | Fixed |
| 6 | `CampaignViewSet.add_members` multi-step membership creation had no transaction wrapping | **Low** | Fixed |
| 7 | **Lead Conversion was completely broken** (500 error on every call) due to `company` never being passed to `.save()` for the Account/Contact/Opportunity created during conversion | **Critical (functional)** | Fixed |
| 8 | `crm/views.py`'s `CRMBaseViewSet`-based auxiliary ViewSets (~10 files) call a non-existent `self.get_session_key()` method, crashing on nearly every request | **High (functional, not security — fails closed)** | Documented, deferred to Phase 2 |

---

## 4. Regression Tests Added

**`python manage.py check`**
```
System check identified no issues (0 silenced)
```

**`python manage.py test crm`** — 17 tests, all passing (3 pre-existing model tests + 14 new `CRMPhase1SecurityTest` tests):

| Test | Verifies |
|------|----------|
| `test_opportunity_serializer_rejects_cross_company_account` | Opportunity rejects Company B's account |
| `test_opportunity_serializer_rejects_cross_company_contact` | Opportunity rejects Company B's contact |
| `test_account_serializer_rejects_cross_company_primary_contact` | Account rejects Company B's contact as primary_contact |
| `test_activity_serializer_rejects_cross_company_lead` | Activity rejects Company B's lead |
| `test_lead_serializer_rejects_duplicate_email_same_company` | Lead duplicate-email detection (same company) |
| `test_lead_serializer_allows_same_email_different_company` | Duplicate check does NOT leak across tenants |
| `test_contact_serializer_rejects_duplicate_email_same_company` | Contact duplicate-email detection |
| `test_account_serializer_rejects_duplicate_name_same_company` | Account duplicate-name detection |
| `test_opportunity_serializer_rejects_duplicate_name_for_same_account` | Opportunity duplicate-name-per-account detection |
| `test_lead_id_unique_per_company_not_globally` | Same `lead_id` allowed across two different companies |
| `test_lead_id_still_unique_within_same_company` | Same `lead_id` still rejected within one company |
| `test_lead_conversion_end_to_end` | Full `convert_to_opportunity` flow creates Account/Contact/Opportunity and marks Lead won |
| `test_lead_conversion_rejects_already_converted_lead` | Re-converting a `won` lead returns 400, not a duplicate opportunity |
| `test_viewset_queryset_excludes_other_company_data` | `CompanyScopedModelViewSet.get_queryset()`/`get_object()` never expose cross-tenant rows |

```
Ran 17 tests in 4.168s
OK
```

---

## 5. Manual Verification Checklist

Run against a dev/staging environment with two approved companies (Company A, Company B), each with a Service User session key.

### Lead Creation
```bash
curl -X POST /api/crm/leads/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"first_name": "Jane", "last_name": "Doe", "email": "jane@example.com"}'
# Expected: 201, lead.company == Company A

# Duplicate email in same company
curl -X POST /api/crm/leads/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"first_name": "Jane", "last_name": "Doe2", "email": "jane@example.com"}'
# Expected: 400 {"email": ["A lead with email \"jane@example.com\" already exists for this company."]}
```

### Lead Conversion
```bash
curl -X POST /api/crm/leads/<lead_id>/convert_to_opportunity/ \
  -H "Authorization: Bearer <company_a_session_key>"
# Expected: 200 {"message": "Lead converted successfully", "opportunity_id": ..., "account_id": ..., "contact_id": ..., "lead_status": "won"}
# (Previously: 500 Internal Server Error — see Fix 3a)

# Re-converting the same (now-won) lead
curl -X POST /api/crm/leads/<lead_id>/convert_to_opportunity/ \
  -H "Authorization: Bearer <company_a_session_key>"
# Expected: 400 {"error": "Lead has already been converted to opportunity"}
```

### Opportunity Creation (cross-tenant rejection)
```bash
# Valid: own-company account
curl -X POST /api/crm/opportunities/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"name": "Deal 1", "account": <company_a_account_id>, "owner": <user_id>, "amount": 1000, "expected_close_date": "2026-08-01"}'
# Expected: 201

# Invalid: Company B's account
curl -X POST /api/crm/opportunities/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"name": "Deal 2", "account": <company_b_account_id>, "owner": <user_id>, "amount": 1000, "expected_close_date": "2026-08-01"}'
# Expected: 400 {"account": ["Account not found or access denied."]}
```

### Contact Creation
```bash
curl -X POST /api/crm/contacts/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"first_name": "Sam", "last_name": "Lee", "email": "sam@example.com"}'
# Expected: 201
```

### Account Creation
```bash
curl -X POST /api/crm/accounts/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"name": "Acme Corp"}'
# Expected: 201

# Duplicate name in same company
curl -X POST /api/crm/accounts/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"name": "acme corp"}'
# Expected: 400 {"name": ["An account named \"acme corp\" already exists for this company."]}
```

### Multi-Tenant Isolation
```bash
# Company A lists its own leads
curl /api/crm/leads/ -H "Authorization: Bearer <company_a_session_key>"
# Expected: only Company A leads

# Company A attempts to retrieve Company B's account directly by ID
curl /api/crm/accounts/<company_b_account_id>/ -H "Authorization: Bearer <company_a_session_key>"
# Expected: 404 Not Found

# Company A attempts to update Company B's contact
curl -X PATCH /api/crm/contacts/<company_b_contact_id>/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"first_name": "Hijacked"}'
# Expected: 404 Not Found (object not in Company A's scoped queryset)
```

### Encrypted Credential Storage
```bash
# Create a third-party integration with an API key
curl -X POST /api/crm/integrations/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"name": "SendGrid", "integration_type": "email_service", "provider": "SendGrid", "api_key": "sk_live_xxx"}'
# Expected: 201, response does NOT include api_key or encrypted_api_key

# Inspect the database directly (should show encrypted bytes, not "sk_live_xxx")
# SELECT encrypted_api_key FROM crm_thirdpartyintegration WHERE name='SendGrid';
```

---

## 6. Remaining CRM Phase 2 Work

| Item | Description | Priority |
|------|-------------|----------|
| `CRMBaseViewSet` auxiliary ViewSets broken (`get_session_key` bug) | ~10 files (`security_views.py`, `lead_scoring_views.py`, `reporting_views.py`, `quote_views.py`, `marketing_views.py`, `pipeline_views.py`, `support_views.py`, `analytics_views.py`, `integration_views.py`, `error_handlers.py`) call `self.get_session_key()`, which doesn't exist on `CRMBaseViewSet`. This is a **functional** bug (crashes, doesn't leak data) but affects dozens of endpoints (tickets, deals/pipeline, marketing automation, lead scoring, integrations' custom actions, security/compliance dashboards, reporting). Needs a dedicated bug-fix pass. | HIGH (functional) |
| Remaining globally-unique IDs | `Deal.deal_id`, `Ticket.ticket_id`, `CustomerInteraction.interaction_id` still use global `unique=True` instead of per-company scoping — same class of bug as Fix 4, deferred because these models live in the currently-broken auxiliary ViewSets above | MEDIUM |
| `MobileDevice.push_token` plaintext storage | Push notification tokens stored unencrypted; lower risk than OAuth/API credentials but should be encrypted for defense-in-depth | LOW |
| Ticket/Deal/CustomerInteraction ID-generation race condition | The fallback ID-generation path in `TicketSerializer`/`DealSerializer`/`CustomerInteractionSerializer.create()` uses `select_for_update()` on the *last* row, which provides no lock when a company has zero existing rows — two concurrent first-time creates could generate the same ID. Flagged by static analysis during this work; unrelated to the 7 requested fixes | MEDIUM |
| `LeadScore.calculate_total_score()` re-entrancy | Calls `self.save()`/`LeadScore.objects.filter(pk=self.pk).update(...)` in a pattern flagged as a possible infinite-loop risk by static analysis; not investigated as part of this security pass | LOW |
| User-FK (assigned_to/owner/account_manager) cross-company scoping | FK fields referencing `django.contrib.auth.models.User` (not CRM models) were not scoped in this pass — validating that an assigned user actually belongs to the same company requires cross-referencing `CompanyUser`/`CompanyServiceUser`, a more involved change deferred to Phase 2 | MEDIUM |
| `CustomerSegmentMembership.unique_together` doesn't verify cross-model company match | `unique_together = ['segment', 'account']` doesn't itself verify `segment.company == account.company` — the new `validate_segment`/`validate_account` FK checks (Fix 1) now catch cross-tenant references, but a same-company mismatch between two malformed records isn't separately guarded at the DB level | LOW |
