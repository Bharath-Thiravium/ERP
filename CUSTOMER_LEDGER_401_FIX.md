# ✅ CUSTOMER LEDGER 401 ERROR FIX

## Issue
```
GET /api/finance/customer-ledger/?customer_id=16&session_key=...
HTTP/2 401 Unauthorized
```

## Root Cause
CustomerLedger component was using direct `api.get()` with manual Authorization header instead of using `apiClient` which handles authentication automatically.

## Problem Code
```tsx
// Wrong - Manual auth header with session_key in URL
import api from '../../../../lib/api';

const response = await api.get(`/api/finance/customer-ledger/?${params.toString()}`, {
  headers: { Authorization: `Bearer ${sessionKey}` }
});
```

## Fixed Code
```tsx
// Correct - Uses apiClient with automatic auth
import { apiClient } from '../../../../lib/api';

const response = await apiClient.getCustomerLedger(params);
```

## Changes Made

### File: `CustomerLedger.tsx`

**1. Import Change:**
```tsx
// Before
import api from '../../../../lib/api';

// After
import { apiClient } from '../../../../lib/api';
```

**2. API Call Change:**
```tsx
// Before
const params = new URLSearchParams({ customer_id: selectedCustomer });
if (dateRange.start_date) params.append('start_date', dateRange.start_date);
if (dateRange.end_date) params.append('end_date', dateRange.end_date);

const response = await api.get(`/api/finance/customer-ledger/?${params.toString()}`, {
  headers: { Authorization: `Bearer ${sessionKey}` }
});

// After
const params: any = { customer_id: selectedCustomer };
if (dateRange.start_date) params.start_date = dateRange.start_date;
if (dateRange.end_date) params.end_date = dateRange.end_date;

const response = await apiClient.getCustomerLedger(params);
```

## Why This Fixes It

1. **apiClient** automatically includes JWT token from localStorage
2. **apiClient** handles token refresh if expired
3. **apiClient** uses proper Authorization header format
4. No need to manually pass `session_key` in URL

## Files Modified
- `/frontend/src/pages/services/finance/components/CustomerLedger.tsx`

## Testing
1. Refresh browser
2. Go to Finance → Dashboard → Customer Ledger
3. Select a customer
4. ✅ Should load without 401 error
5. ✅ Ledger data should display

## No Backend Changes
This is a frontend-only fix. Just refresh browser.

---

**Customer Ledger 401 error fixed!** ✅
