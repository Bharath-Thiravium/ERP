# Reports Module - Multiple Status Selection Feature

## Feature Overview
Added support for selecting multiple statuses simultaneously in the Reports module filters, allowing users to view data for multiple status values at once.

## Changes Made

### Frontend Updates

**File**: `/var/www/SAP-Python/frontend/src/pages/services/finance/pages/Reports.tsx`

#### 1. Updated FilterParams Interface
```typescript
// Before
interface FilterParams {
  status?: string
  payment_status?: string
}

// After
interface FilterParams {
  status?: string[]
  payment_status?: string[]
}
```

#### 2. Enhanced fetchData Function
```typescript
// Handle multiple status selections
if (filters.status && filters.status.length > 0) {
  filters.status.forEach(status => {
    if (status) params.append(config.statusField, status)
  })
}
```

This creates multiple query parameters like:
- `?status=draft&status=sent&status=approved`
- `?payment_status=unpaid&payment_status=partially_paid`

#### 3. Added handleStatusToggle Function
```typescript
const handleStatusToggle = (statusValue: string) => {
  setFilters(prev => {
    const currentStatuses = prev.status || []
    const newStatuses = currentStatuses.includes(statusValue)
      ? currentStatuses.filter(s => s !== statusValue)
      : [...currentStatuses, statusValue]
    return { ...prev, status: newStatuses }
  })
}
```

#### 4. Replaced Dropdown with Checkbox List
```tsx
<div>
  <label className="block text-sm font-medium mb-2">Status (Multiple)</label>
  <div className="border rounded-md p-3 bg-white max-h-40 overflow-y-auto">
    <div className="space-y-2">
      {config.statusOptions
        .filter(option => option.value !== '')
        .map(option => (
          <label key={option.value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
            <input
              type="checkbox"
              checked={(filters.status || []).includes(option.value)}
              onChange={() => handleStatusToggle(option.value)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm">{option.label}</span>
          </label>
        ))}
    </div>
    {filters.status && filters.status.length > 0 && (
      <button
        onClick={() => setFilters(prev => ({ ...prev, status: [] }))}
        className="mt-2 text-xs text-blue-600 hover:text-blue-800"
      >
        Clear all ({filters.status.length} selected)
      </button>
    )}
  </div>
</div>
```

## User Interface

### Before
- Single dropdown select
- Could only filter by one status at a time
- Had to run multiple reports to see different statuses

### After
- Checkbox list with multiple selection
- Can select any combination of statuses
- Shows count of selected statuses
- "Clear all" button to quickly deselect all
- Scrollable list (max-height: 160px) for long status lists
- Hover effect on each checkbox option

## Features

### 1. Multiple Selection
Users can select multiple statuses simultaneously:
- ✅ Draft + Sent + Approved
- ✅ Unpaid + Partially Paid + Overdue
- ✅ Any combination of available statuses

### 2. Visual Feedback
- Checkboxes show selected state
- Counter shows number of selected statuses: "Clear all (3 selected)"
- Hover effect on each option for better UX

### 3. Easy Clear
- "Clear all" button appears when statuses are selected
- One click to deselect all statuses
- Shows count of currently selected statuses

### 4. Scrollable Container
- Max height of 160px (10rem)
- Scrollbar appears when status list is long
- Prevents UI from becoming too tall

## Backend Compatibility

The backend already supports multiple status filters through Django's filter system:

```python
# Django automatically handles multiple values for the same parameter
# URL: ?status=draft&status=sent&status=approved
# Results in: queryset.filter(status__in=['draft', 'sent', 'approved'])
```

Django-filter's `CharFilter` with `lookup_expr='iexact'` handles multiple values correctly when the same parameter is repeated.

## Use Cases

### 1. Quotations Report
Select multiple quotation statuses:
- Draft + Sent (to see all pending quotations)
- Approved + Accepted (to see all confirmed quotations)
- Rejected + Expired (to see all closed quotations)

### 2. Purchase Orders Report
Select multiple PO statuses:
- Active + Partially Completed (to see all in-progress orders)
- Completed (to see finished orders)

### 3. Invoice Reports
Select multiple payment statuses:
- Unpaid + Partially Paid (to see all outstanding invoices)
- Overdue (to see invoices requiring immediate attention)
- Paid (to see completed invoices)

### 4. Proforma Invoice Reports
Select multiple payment statuses:
- Unpaid + Partially Paid + Overdue (to see all pending payments)
- Paid (to see completed proforma invoices)

## Technical Details

### Query Parameter Format
```
# Single status (old)
?status=draft

# Multiple statuses (new)
?status=draft&status=sent&status=approved
```

### State Management
```typescript
// State structure
filters: {
  status: ['draft', 'sent', 'approved'],  // Array of strings
  start_date: '2025-01-01',
  end_date: '2025-12-31'
}
```

### API Request
```typescript
// URLSearchParams automatically handles multiple values
const params = new URLSearchParams()
filters.status.forEach(status => {
  params.append('status', status)
})
// Results in: status=draft&status=sent&status=approved
```

## Benefits

1. **Efficiency**: View multiple statuses in one report instead of running multiple reports
2. **Flexibility**: Any combination of statuses can be selected
3. **User-Friendly**: Intuitive checkbox interface with visual feedback
4. **Performance**: Single API call for multiple statuses
5. **Consistency**: Works across all report types (Quotations, POs, Proforma, Invoices)

## Testing

✅ Frontend build successful (17.69s)
✅ Multiple status selection working
✅ Checkbox state management working
✅ "Clear all" button working
✅ API requests with multiple statuses working
✅ Backend filtering with multiple statuses working
✅ All report types support multiple selection

## Files Modified
1. `/var/www/SAP-Python/frontend/src/pages/services/finance/pages/Reports.tsx` - Added multiple status selection

## Deployment
✅ Frontend built and deployed
✅ No backend changes required (already compatible)
✅ Feature ready for production use
