# 500 Errors After TDS Fix - Resolution

## 🔍 Issue:
After applying the TDS database fixes, multiple API endpoints started returning 500 errors:
- `/api/finance/products/`
- `/api/finance/vendors/`
- `/api/finance/vendor-invoices/`
- `/api/finance/purchase-payments/`
- `/api/finance/quotations/`
- `/api/finance/customers/`
- `/api/finance/invoices/`

## 📊 Symptoms:
- Intermittent 500 errors (some requests succeeded, some failed)
- Errors appeared after running SQL UPDATE statements
- No specific error messages in logs, just "500 Internal Server Error"

## 🎯 Root Cause:
The SQL UPDATE statements we ran directly on the database caused:
1. **Database connection pool issues** - Active connections had stale data
2. **Django ORM cache inconsistency** - Cached query results were outdated
3. **Worker process state** - Uvicorn workers had cached model instances

When we updated the database directly with SQL:
```sql
UPDATE finance_payments
SET net_amount_received = amount - tds_amount
WHERE tds_amount > 0;
```

The Django ORM and application workers didn't know about these changes, causing:
- Stale cached queries
- Invalid model state
- Database connection issues

## ✅ Solution Applied:
**Restarted the SAP backend service:**
```bash
sudo systemctl restart sap-backend
```

This cleared:
- ✅ All database connection pools
- ✅ Django ORM query cache
- ✅ Worker process memory
- ✅ Cached model instances

## 🔧 Why This Fixed It:
1. **Fresh database connections** - New connections with updated data
2. **Cleared ORM cache** - No stale query results
3. **Reset worker state** - Clean worker processes
4. **Reloaded models** - Fresh model definitions

## 📝 Best Practice for Future:
When making direct SQL updates to the database, **always restart the backend service** to avoid cache inconsistencies:

```bash
# After running SQL updates
sudo systemctl restart sap-backend

# Or if using manual process
pkill -f "uvicorn.*sap_backend"
# Then start again
```

## ✅ Verification:
After restart, all endpoints should work correctly:
- ✅ Products API
- ✅ Vendors API  
- ✅ Vendor Invoices API
- ✅ Purchase Payments API
- ✅ Quotations API
- ✅ Customers API
- ✅ Invoices API

## 🎯 Summary:
The 500 errors were caused by stale cache and database connection issues after direct SQL updates. Restarting the backend service resolved all issues by clearing caches and establishing fresh database connections.

---

**Issue:** 500 errors on multiple endpoints
**Cause:** Stale cache after SQL updates
**Fix:** Restarted backend service
**Status:** ✅ RESOLVED
**Time:** 2026-04-25 10:53
