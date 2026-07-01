# CRM Module — Bug Report

**Audit date:** 2026-06-24  
**Method:** Read-only static analysis — no code was modified  
**Total bugs found:** 12

---

## B1 — Race Condition on Lead/Contact/Account/Opportunity ID Generation

**File:** `backend/crm/models.py:89–97`, `150–161`, `231–239`, `306–314`  
**Severity:** HIGH  
**Affects:** Lead, Contact, Account, Opportunity creation under concurrency

**Code (representative — Lead.save):**
```python
# models.py:89–97
last_lead = Lead.objects.filter(
    company=self.company,
    lead_id__startswith='LEAD-'
).order_by('-id').first()
if last_lead:
    last_number = int(last_lead.lead_id.split('-')[-1])
    self.lead_id = f"LEAD-{last_number + 1:06d}"
else:
    self.lead_id = "LEAD-000001"
```

**Root cause:** The read-then-write sequence (`order_by('-id').first()` → compute next ID → `save()`) is not protected by `SELECT FOR UPDATE`. Two concurrent `POST /crm/leads/` requests can both read the same `last_lead`, both compute `LEAD-000006`, and the second `save()` raises `django.db.IntegrityError` (unique constraint on `lead_id`).

**Reproduction:**
```bash
# Two parallel requests to the same endpoint
curl -X POST .../crm/leads/ -d '{...}' -H 'Authorization: Bearer <key>' &
curl -X POST .../crm/leads/ -d '{...}' -H 'Authorization: Bearer <key>' &
```
One request will fail with HTTP 500 / IntegrityError.

**Business Impact:** Any high-traffic period (campaign launch, import batch) triggers random lead creation failures. Affects all auto-ID entities: Lead, Contact, Account, Opportunity.

**Recommendation:** Wrap in `transaction.atomic()` with `select_for_update()`, or use `uuid4()` / database sequence for IDs.

---

## B2 — Ticket ID Race Condition in Serializer

**File:** `backend/crm/serializers.py:180–181`  
**Severity:** HIGH  
**Affects:** Ticket creation

**Code:**
```python
# serializers.py:180–181
ticket_count = Ticket.objects.filter(company=company).count() + 1
validated_data['ticket_id'] = f"{company.company_prefix}TKT{ticket_count:04d}"
```

**Root cause:** `count() + 1` is computed outside any transaction lock. Two concurrent ticket creates both see count=5, both try to create `ACMETKT0006`, second fails with unique constraint violation.

**Reproduction:** Two parallel `POST /crm/tickets/` requests → IntegrityError on second.

**Business Impact:** Support staff creating tickets simultaneously get random failures. Ticket IDs will also have gaps when failures occur.

**Recommendation:** Use `select_for_update()` or a DB sequence function. Same fix applies to `DealSerializer.create()` (line 246) and `CustomerInteractionSerializer.create()` (line 290).

---

## B3 — Deal ID Race Condition in Serializer

**File:** `backend/crm/serializers.py:246–247`  
**Severity:** HIGH  
**Affects:** Deal creation

**Code:**
```python
# serializers.py:246–247
deal_count = Deal.objects.filter(company=company).count() + 1
validated_data['deal_id'] = f"{company.company_prefix}DEAL{deal_count:04d}"
```

**Root cause:** Same count+1 pattern without locking. See B2.

**Business Impact:** Concurrent deal creation during busy sales periods fails unpredictably.

---

## B4 — CustomerInteraction ID Race Condition

**File:** `backend/crm/serializers.py:290–291`  
**Severity:** MEDIUM  
**Affects:** CustomerInteraction creation

**Code:**
```python
# serializers.py:290–291
interaction_count = CustomerInteraction.objects.filter(company=company).count() + 1
validated_data['interaction_id'] = f"{company.company_prefix}INT{interaction_count:04d}"
```

Same count+1 race. Low frequency but still broken under concurrency.

---

## B5 — Global unique=True on all Entity ID Fields Enables Cross-Tenant Collisions

**File:** `backend/crm/models.py:39, 108, 185, 264, 399, 562, 749`  
**Severity:** HIGH  
**Affects:** All tenants — first entity creation for any company

**Code:**
```python
# models.py:39
lead_id = models.CharField(max_length=50, unique=True)
# models.py:108
contact_id = models.CharField(max_length=50, unique=True)
# models.py:185
account_id = models.CharField(max_length=50, unique=True)
# models.py:264
opportunity_id = models.CharField(max_length=50, unique=True)
```

**Root cause:** `unique=True` without any company scoping enforces global uniqueness across ALL tenants. Company A creates `LEAD-000001`. When Company B's first-ever lead creation takes the fallback path (when `generate_auto_code` fails), it also tries to create `LEAD-000001` and gets `IntegrityError`.

**Reproduction:**
1. Have two tenants with zero leads.
2. Have `authentication.utils.generate_auto_code` raise an exception (or be absent).
3. Both run `POST /crm/leads/` simultaneously.
4. First succeeds with `LEAD-000001`, second fails.

**Business Impact:** New tenant onboarding randomly fails if auto-code generation is unavailable. More subtly, this limits the system to one company per lead-ID number if the fallback ever triggers.

**Recommendation:** Change `unique=True` to `unique_together = ['company', 'lead_id']` (and similarly for all other entity IDs).

---

## B6 — Lead Conversion Sets Status to 'won' Instead of a Conversion Status

**File:** `backend/crm/viewsets.py:141`, `backend/crm/views.py:390`  
**Severity:** MEDIUM  
**Affects:** Lead lifecycle reporting

**Code:**
```python
# viewsets.py:141
lead.status = 'won'
lead.save()
```

**Root cause:** The `convert_to_opportunity` action marks the lead as `'won'`. The Lead model has `'won'` in `STATUS_CHOICES` at index 6 (models.py:16), but there is no `'converted'` status. This conflates "we won this deal from the lead" with "we converted the lead into an opportunity to be tracked further."

**Business Impact:**
- CRM reports show the lead as 'won' even if the resulting opportunity later closes as 'lost'.
- Cannot distinguish converted leads from genuinely won leads in pipeline analytics.
- Conversion rate reports (`_generate_lead_analysis` in reporting_views.py:103) count converted leads as won, inflating the conversion rate metric.

**Recommendation:** Add `'converted'` to `Lead.STATUS_CHOICES` and use it in the conversion action.

---

## B7 — Lead Conversion Has No Atomic Transaction

**File:** `backend/crm/viewsets.py:91–148`, `backend/crm/views.py:341–395`  
**Severity:** HIGH  
**Affects:** Data integrity on lead conversion

**Code:**
```python
# viewsets.py:91–148 — three separate serializer.save() calls, no transaction.atomic()
account = account_serializer.save(created_by=default_user)   # step 1
contact = contact_serializer.save(created_by=default_user)   # step 2
opportunity = opportunity_serializer.save(...)                # step 3
lead.status = 'won'; lead.save()                             # step 4
```

**Root cause:** Four DB writes happen in sequence with no `transaction.atomic()` wrapper. If step 3 (Opportunity creation) fails (e.g., validation error on `expected_close_date`), steps 1 and 2 have already committed — an orphaned Account and Contact exist with no Opportunity or converted Lead.

**Reproduction:**
1. Create a lead with `expected_close_date=None`.
2. `POST /crm/leads/{id}/convert_to_opportunity/`.
3. Account and Contact are created; Opportunity creation fails on `expected_close_date` being required.
4. Account and Contact are orphaned in the database.

**Business Impact:** Ghost accounts and contacts pollute the CRM. The lead is not marked converted, so the conversion can be retried — creating more duplicates.

**Recommendation:** Wrap the entire conversion flow in `with transaction.atomic():`.

---

## B8 — Lead Conversion Creates Duplicate Accounts and Contacts

**File:** `backend/crm/viewsets.py:91–120`, `backend/crm/views.py:341–370`  
**Severity:** MEDIUM  
**Affects:** Data quality

**Code:**
```python
# viewsets.py:100–104
account_serializer = AccountSerializer(data=account_data)
if account_serializer.is_valid():
    account = account_serializer.save(created_by=default_user)
```

**Root cause:** The conversion creates a new Account without checking whether an Account with the same `email` or `name` already exists for the company. Every conversion of a lead from "Acme Corp" creates a new Account record for Acme Corp.

**Business Impact:** After 10 leads from the same company are converted, there are 10 separate Account records for the same real-world account. All opportunities, deals, and health scores are split across duplicates, breaking pipeline visibility.

**Recommendation:** Use `Account.objects.get_or_create(company=company, email=lead.email)` or check for existing accounts by name/email before creating.

---

## B9 — Pipeline Forecast Uses Python Loop Instead of DB Aggregation

**File:** `backend/crm/reporting_views.py:119`  
**Severity:** MEDIUM  
**Affects:** Report performance at scale

**Code:**
```python
# reporting_views.py:117–120
return {
    ...
    'weighted_pipeline': sum(deal.weighted_value for deal in deals),  # Python loop
    ...
}
```

Where `deals = Deal.objects.filter(company=company, status='open')` — all open deals loaded into Python memory and iterated.

**Root cause:** `deal.weighted_value` is a model property (models.py:787–789) that does arithmetic in Python. This forces loading all Deal objects into memory.

**Business Impact:** If a company has 10,000 open deals, the pipeline forecast endpoint loads all 10,000 Deal ORM objects — high memory usage and slow response.

**Recommendation:** Use database aggregation: `Sum(F('value') * F('probability') / 100)` (as done correctly in `_generate_pipeline_forecast` at line 110–113).

---

## B10 — `DashboardViewSet.is_global_model = True` May Bypass Security Checks

**File:** `backend/crm/viewsets.py:424–428`  
**Severity:** MEDIUM  
**Affects:** Dashboard endpoint security

**Code:**
```python
# viewsets.py:424–428
class DashboardViewSet(CompanyScopedModelViewSet):
    queryset = Lead.objects.none()  # Dummy queryset
    serializer_class = DashboardStatsSerializer
    is_global_model = True  # Skip company filtering for dashboard
```

**Root cause:** `is_global_model = True` is a flag in `CompanyScopedModelViewSet` that bypasses company filtering in `get_queryset()`. The `list()` override (line 430–435) then manually fetches company and calls the optimizer. If `CompanyScopedModelViewSet` has any action or mixin that queries using `get_queryset()` (e.g., a generic action), it would return global unscoped data.

**Business Impact:** Any future `@action` added to `DashboardViewSet` that relies on `get_queryset()` would return data from all companies.

---

## B11 — Ticket Assign Action Does Not Validate Company Scope of Agent

**File:** `backend/crm/support_views.py:77–93`  
**Severity:** MEDIUM  
**Affects:** Ticket assignment integrity

**Code:**
```python
# support_views.py:82–91
def assign(self, request, pk=None):
    ticket = self.get_object()
    agent_id = request.data.get('agent_id')
    if agent_id:
        agent = User.objects.get(id=agent_id)  # No company check
        ticket.assigned_to = agent
        ticket.save()
```

**Root cause:** `User.objects.get(id=agent_id)` fetches any Django user — no filter by company.

**Reproduction:**
```bash
# Assign ticket to a user from a different company
curl -X POST .../crm/tickets/5/assign/ \
  -d '{"agent_id": 99}' \
  -H 'Authorization: Bearer <session_key>'
# User 99 may be from a different tenant
```

**Business Impact:** Support tickets can be assigned to employees from other companies. That employee would then see the ticket if they have direct DB access or through a future bug in their tenant's view.

---

## B12 — Compliance Violation `deactivate()` Action Has No Session Validation

**File:** `backend/crm/security_views.py:96–106`  
**Severity:** LOW  
**Affects:** Compliance rule deactivation

**Code:**
```python
# security_views.py:96–106
@action(detail=True, methods=['post'])
def deactivate(self, request, pk=None):
    """Deactivate a compliance rule"""
    rule = self.get_object()
    rule.status = 'inactive'
    rule.save()
    return Response({...})
```

**Root cause:** Unlike the `activate()` action at line 75 (which validates the session key explicitly), the `deactivate()` action has no explicit session check. It relies entirely on the DRF authentication class. While the DRF auth class should catch unauthenticated requests, the inconsistency with `activate()` suggests a copy-paste error.

**Business Impact:** If DRF auth fails silently for any reason, compliance rules can be silently deactivated. Low probability given the auth class is set, but inconsistency is a maintainability risk.
