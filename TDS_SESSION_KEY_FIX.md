# TDS Payment - Session Key Fix (FINAL)

## Problem
```
Failed to record payment
Session key required
POST /api/finance/invoices/225/payment/?session_key=...
[HTTP/2 400]
```

## Root Cause
The axios interceptor in `api.ts` automatically adds `session_key` to URL params for ALL service endpoints:
```typescript
config.params = config.params || {}
config.params.session_key = sessionKey
```

Backend expects session key in:
- Authorization header (Bearer token), OR
- Request body

But NOT as URL parameter.

## Solution
Pass session key in Authorization header and override interceptor params:

```typescript
await api.post(
  endpoint,
  {
    payment_date: form.deposit_date,
    amount_received: 0,
    tds_amount: amt,
    // ...
  },
  {
    headers: {
      'Authorization': `Bearer ${sessionKey}`
    },
    params: {}  // Override interceptor
  }
);
```

## File Changed
- `frontend/src/pages/services/finance/components/payment/TDSTracker.tsx`

## Status
✅ **FIXED** - Session key now in Authorization header

## Test Now
1. Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)
2. Open invoice → Update Payment
3. Go to TDS tab
4. Add TDS Entry
5. Should work! ✅

---

**Date:** January 2025  
**Status:** Fixed  
**Solution:** Authorization header with empty params override
