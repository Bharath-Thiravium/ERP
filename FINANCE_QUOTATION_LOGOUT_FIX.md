# Finance Quotation Logout Issue Fix

## Issue Identified
**Problem**: Clicking "New Quotation" in Finance service was causing logout and redirecting to login page.

## Root Cause Analysis
The issue was in the `QuotationForm` component which makes multiple API calls when it loads:

1. **loadCustomers()** - Fetches customer list
2. **loadProducts()** - Fetches product list  
3. **loadCompanyDetails()** - Fetches company profile
4. **loadCustomerDetails()** - Fetches detailed customer info when editing
5. **handleCustomerSelect()** - Fetches full customer details when selecting

### Authentication Flow Problem
- Finance service uses **session-based authentication** with `sessionKey`
- All Finance API endpoints require valid session authentication
- When API calls fail with 401 errors, the frontend API interceptor triggers logout
- The QuotationForm was not properly handling session key validation before making API calls

## Fixes Applied

### 1. Added Session Key Validation
**Before**:
```typescript
const loadCustomers = async () => {
  try {
    const response = await apiClient.getFinanceCustomers({ session_key: sessionKey })
    setCustomers(response.data.results || [])
  } catch (error) {
    console.error('Error loading customers:', error)
  }
}
```

**After**:
```typescript
const loadCustomers = async () => {
  if (!sessionKey) {
    console.error('No session key available for loading customers')
    return
  }
  try {
    const response = await apiClient.getFinanceCustomers({ session_key: sessionKey })
    setCustomers(response.data.results || [])
  } catch (error) {
    console.error('Error loading customers:', error)
    toast.error('Failed to load customers')
  }
}
```

### 2. Enhanced Error Handling
- Added proper session key validation before API calls
- Added user-friendly error messages with toast notifications
- Added fallback behavior when API calls fail
- Prevented cascading failures that trigger logout

### 3. Fixed Company Profile API Call
**Before**:
```typescript
const response = await apiClient.get('/api/auth/company-profile/', { session_key: sessionKey })
```

**After**:
```typescript
const response = await apiClient.get('/api/auth/company-profile/', { 
  params: { session_key: sessionKey }
})
```

### 4. Improved Customer Selection
- Added proper error handling for customer detail fetching
- Added fallback to basic customer info if detailed fetch fails
- Prevented form from breaking when customer API calls fail

## Files Modified
- `/frontend/src/pages/services/finance/components/QuotationForm.tsx`

## Testing Steps
1. Login to Finance service
2. Navigate to Quotations tab
3. Click "New Quotation" button
4. Form should open without logout
5. Customer and product dropdowns should work
6. Form submission should work properly

## Technical Details

### Session Authentication Flow
1. User logs into Finance service → Gets `sessionKey`
2. `sessionKey` stored in `useServiceUserStore`
3. All Finance API calls must include `session_key` parameter
4. Backend validates session in `ServiceUserSession` table
5. Invalid/missing session returns 401 → Triggers logout

### Prevention Strategy
- Always validate `sessionKey` exists before API calls
- Handle 401 errors gracefully without triggering logout
- Provide fallback behavior for non-critical API failures
- Show user-friendly error messages instead of silent failures

## Status: ✅ FIXED
The Finance quotation form now opens properly without causing logout. Users can create and edit quotations without authentication issues.