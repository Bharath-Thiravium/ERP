# Backend Startup Fix - Quick Reference

## Problem
```
✗ Backend failed to start!
```

## Root Cause
Invalid `status` field in ProformaInvoice serializers (field doesn't exist in model)

## Fix Applied ✅

### 1. Fixed Serializers
**File:** `backend/finance/serializers.py`

Removed invalid `status` field from:
- ProformaInvoiceDetailSerializer (line ~1528)
- ProformaInvoiceCreateSerializer (line ~1607)  
- ProformaInvoiceUpdateSerializer (line ~1974)

### 2. Improved Restart Script
**File:** `restart_services.sh`

Added:
- Django system check before starting
- Better error messages
- Log display on failure

## Quick Test

```bash
# Test 1: System check
cd /var/www/SAP-Python/backend
source venv/bin/activate
python manage.py check --deploy

# Expected: "System check identified no issues (0 silenced)."

# Test 2: Restart services
cd /var/www/SAP-Python
./restart_services.sh

# Expected: "✓ All services restarted successfully!"
```

## If Still Failing

### Check Logs
```bash
tail -f /var/www/SAP-Python/backend/backend.log
```

### Common Issues

**Missing migrations:**
```bash
cd backend
source venv/bin/activate
python manage.py migrate
```

**Database not running:**
```bash
sudo systemctl start postgresql
sudo systemctl start redis-server
```

**Missing dependencies:**
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

**Port in use:**
```bash
lsof -ti:8004 | xargs kill -9
```

## Status

✅ Serializer errors fixed
✅ System check passes
✅ Backend starts successfully
✅ Restart script improved

## Full Documentation

See `BACKEND_STARTUP_FIX.md` for complete details.
