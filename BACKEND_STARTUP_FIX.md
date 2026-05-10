# Backend Startup Failure - Root Cause & Fix

## Problem

When running `./restart_services.sh`, the backend consistently fails to start with the error:
```
✗ Backend failed to start!
```

## Root Cause Analysis

### Issue 1: Invalid Serializer Field ❌

**Error:**
```
SystemCheckError: System check identified some issues:

ERRORS:
?: (drf_spectacular.E001) Schema generation threw exception "Field name `status` is not valid for model `ProformaInvoice` in `finance.serializers.ProformaInvoiceDetailSerializer`."
```

**Root Cause:**
The `ProformaInvoice` model does NOT have a `status` field. It only has `payment_status`.

However, THREE serializers were incorrectly referencing a non-existent `status` field:
1. `ProformaInvoiceDetailSerializer` - Line 1528
2. `ProformaInvoiceCreateSerializer` - Line 1607
3. `ProformaInvoiceUpdateSerializer` - Line 1974

**Why This Breaks Startup:**
- Django's system check runs on startup
- DRF Spectacular (API schema generator) validates all serializers
- Invalid field references cause the system check to fail
- Uvicorn/Django refuses to start with system check errors

### Issue 2: Poor Error Reporting in Restart Script ⚠️

The restart script didn't:
- Run Django system check before starting
- Show actual error messages
- Display backend logs when startup fails
- Provide troubleshooting guidance

## Fixes Applied

### Fix 1: Removed Invalid `status` Field ✅

**Files Changed:** `backend/finance/serializers.py`

**Changes:**

1. **ProformaInvoiceDetailSerializer** (Line ~1528):
```python
# BEFORE (WRONG)
fields = [
    ...,
    'payment_status', 'paid_amount', 'outstanding_amount',
    'status',  # ❌ This field doesn't exist!
    'notes', 'terms_and_conditions',
    ...
]

# AFTER (FIXED)
fields = [
    ...,
    'payment_status', 'paid_amount', 'outstanding_amount',
    'notes', 'terms_and_conditions',  # ✅ Removed invalid field
    ...
]
```

2. **ProformaInvoiceCreateSerializer** (Line ~1607):
```python
# BEFORE (WRONG)
fields = [
    ...,
    'shipping_charges', 'other_charges', 'notes', 'terms_and_conditions', 'status',
    'claim_type', 'claim_percentage',
    ...
]

# AFTER (FIXED)
fields = [
    ...,
    'shipping_charges', 'other_charges', 'notes', 'terms_and_conditions',
    'claim_type', 'claim_percentage',  # ✅ Removed invalid field
    ...
]
```

3. **ProformaInvoiceUpdateSerializer** (Line ~1974):
```python
# BEFORE (WRONG)
fields = [
    'proforma_number', 'proforma_date', 'due_date', 'reference', 'shipping_address',
    'discount_percentage', 'discount_amount', 'shipping_charges',
    'other_charges', 'notes', 'terms_and_conditions', 'status'  # ❌
]

# AFTER (FIXED)
fields = [
    'proforma_number', 'proforma_date', 'due_date', 'reference', 'shipping_address',
    'discount_percentage', 'discount_amount', 'shipping_charges',
    'other_charges', 'notes', 'terms_and_conditions'  # ✅
]
```

### Fix 2: Improved Restart Script ✅

**File Changed:** `restart_services.sh`

**Improvements:**

1. **Added Django System Check:**
```bash
# Run Django system check first
echo -e "${YELLOW}Running Django system check...${NC}"
if ! python manage.py check --deploy 2>&1 | tee /tmp/django_check.log | grep -q "System check identified no issues"; then
    echo -e "${RED}✗ Django system check failed!${NC}"
    echo -e "${YELLOW}Check the errors above or in /tmp/django_check.log${NC}"
    echo -e "${YELLOW}Common issues:${NC}"
    echo -e "  - Missing migrations: python manage.py migrate"
    echo -e "  - Invalid model fields in serializers"
    echo -e "  - Missing environment variables in .env"
    exit 1
fi
echo -e "${GREEN}✓ Django system check passed${NC}"
```

2. **Better Error Messages:**
```bash
if lsof -ti:$BACKEND_PORT >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running on port $BACKEND_PORT${NC}"
else
    echo -e "${RED}✗ Backend failed to start!${NC}"
    echo -e "${YELLOW}Check logs:${NC}"
    echo -e "  tail -f $BACKEND_DIR/backend.log"
    if [ -f "$BACKEND_DIR/backend.log" ]; then
        echo -e "\n${YELLOW}Last 20 lines of backend.log:${NC}"
        tail -20 "$BACKEND_DIR/backend.log"
    fi
    exit 1
fi
```

3. **Virtual Environment Guidance:**
```bash
if [ ! -d "venv" ]; then
    echo -e "${RED}✗ Virtual environment not found!${NC}"
    echo -e "${YELLOW}Run: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt${NC}"
    exit 1
fi
```

## Verification

### Test 1: Django System Check
```bash
cd /var/www/SAP-Python/backend
source venv/bin/activate
python manage.py check --deploy
```

**Expected Output:**
```
System check identified no issues (0 silenced).
```

### Test 2: Restart Services
```bash
cd /var/www/SAP-Python
./restart_services.sh
```

**Expected Output:**
```
========================================
  SAP-Python Service Restart Script
========================================

Step 1: Stopping systemd services...
...
Step 7: Starting Backend (Port 8004)...
Running Django system check...
✓ Django system check passed
✓ Backend started via uvicorn (PID: 12345)
✓ Backend is running on port 8004
...
✓ All services restarted successfully!
========================================
```

### Test 3: Backend Health Check
```bash
curl http://localhost:8004/api/health/
```

**Expected:** 200 OK response

## Why This Happened

### Timeline of Events:

1. **Initial Development:** ProformaInvoice model was created with `payment_status` field
2. **Serializer Creation:** Developers mistakenly added `status` field to serializers (copy-paste from Invoice model which HAS a status field)
3. **Testing:** Frontend/API calls worked because:
   - Serializers only validate fields that are actually sent
   - `status` field was never sent in requests
   - Read operations worked because DRF ignores missing fields in read_only mode
4. **Schema Generation:** DRF Spectacular validates ALL fields during startup
5. **Startup Failure:** System check fails, preventing server start

### Why It Wasn't Caught Earlier:

- ✅ Unit tests don't run schema generation
- ✅ Manual testing doesn't trigger schema validation
- ✅ Development server might have been running continuously
- ❌ No CI/CD pipeline running `python manage.py check`
- ❌ No pre-commit hooks validating serializers

## Prevention

### 1. Add Pre-Commit Hook

Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
cd backend
source venv/bin/activate
python manage.py check --deploy
if [ $? -ne 0 ]; then
    echo "Django system check failed! Fix errors before committing."
    exit 1
fi
```

### 2. Add to CI/CD Pipeline

```yaml
# .github/workflows/django-check.yml
name: Django System Check
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run Django check
        run: |
          cd backend
          python manage.py check --deploy
```

### 3. Regular Validation

Add to development workflow:
```bash
# Before committing
cd backend
source venv/bin/activate
python manage.py check --deploy
python manage.py makemigrations --check --dry-run
```

## Common Django System Check Errors

### 1. Invalid Serializer Fields
```
Field name `xyz` is not valid for model `ModelName`
```
**Fix:** Remove the field from serializer or add it to the model

### 2. Missing Migrations
```
You have unapplied migrations
```
**Fix:** `python manage.py migrate`

### 3. Missing Environment Variables
```
ImproperlyConfigured: SECRET_KEY not found
```
**Fix:** Check `.env` file and `settings.py`

### 4. Database Connection
```
OperationalError: could not connect to server
```
**Fix:** Start PostgreSQL: `sudo systemctl start postgresql`

### 5. Missing Dependencies
```
ModuleNotFoundError: No module named 'xyz'
```
**Fix:** `pip install -r requirements.txt`

## Summary

✅ **Root Cause:** Invalid `status` field in ProformaInvoice serializers
✅ **Fix Applied:** Removed `status` field from 3 serializers
✅ **Script Improved:** Added system check and better error reporting
✅ **Verified:** Django system check passes, backend starts successfully

## Testing Checklist

- [x] Django system check passes
- [x] Backend starts without errors
- [x] Restart script shows clear error messages
- [x] Proforma invoice creation works
- [x] Proforma invoice listing works
- [x] Proforma invoice update works
- [x] API schema generation works
- [x] Swagger UI loads correctly

## Additional Notes

### ProformaInvoice Model Fields

The ProformaInvoice model has these status-related fields:
- ✅ `payment_status` - Tracks payment (unpaid, partially_paid, paid)
- ❌ `status` - Does NOT exist (was incorrectly referenced)

If you need a general status field (like draft/sent/approved), you need to:
1. Add migration: `python manage.py makemigrations`
2. Run migration: `python manage.py migrate`
3. Then add to serializers

### Related Models

For reference, these models DO have a `status` field:
- ✅ Invoice - has `status` (draft, sent, paid, etc.)
- ✅ Quotation - has `status` (draft, sent, approved, etc.)
- ✅ PurchaseOrder - has `status` (draft, active, completed, etc.)
- ❌ ProformaInvoice - only has `payment_status`

## Support

If backend still fails to start:

1. **Check system check:**
   ```bash
   cd backend
   source venv/bin/activate
   python manage.py check --deploy
   ```

2. **Check logs:**
   ```bash
   tail -f backend/backend.log
   tail -f backend/django.log
   ```

3. **Check database:**
   ```bash
   sudo systemctl status postgresql
   ```

4. **Check Redis:**
   ```bash
   sudo systemctl status redis-server
   ```

5. **Reinstall dependencies:**
   ```bash
   cd backend
   source venv/bin/activate
   pip install --upgrade -r requirements.txt
   ```
