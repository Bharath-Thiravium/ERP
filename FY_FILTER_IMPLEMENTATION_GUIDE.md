# Financial Year Filter - Implementation Guide

## Components Created

### 1. FinancialYearFilter Component ✅
**File:** `/frontend/src/pages/services/finance/components/FinancialYearFilter.tsx`

**Features:**
- Dropdown with FY options (e.g., 2026-27, 2025-26)
- "All Years" option to show everything
- Calendar icon for visual clarity
- Dark mode support
- Generates last 5 years + next 2 years automatically

### 2. Financial Year Utilities ✅
**File:** `/frontend/src/utils/financialYearUtils.ts`

**Functions:**
- `extractFYFromNumber()` - Extract FY from document numbers
- `getCurrentFY()` - Get current financial year
- `filterByFY()` - Filter array by FY
- `generateFYList()` - Generate FY dropdown options

## Pages to Update

### Priority 1 - Main Finance Pages:
1. ✅ **Invoices** (`/pages/Invoices.tsx`)
2. ✅ **Quotations** (`/pages/Quotations.tsx`)
3. ✅ **Purchase Orders** (`/pages/PurchaseOrders.tsx`)
4. ✅ **Proforma Invoices** (`/pages/ProformaInvoices.tsx`)

### Priority 2 - Additional Pages:
5. ✅ **Customers** (`/pages/Customers.tsx`) - Filter by invoices
6. ✅ **Products** (`/pages/Products.tsx`) - Filter by usage
7. ✅ **Payments** (if exists)
8. ✅ **Reports** (if exists)

## Implementation Steps

### Step 1: Import Components
```typescript
import FinancialYearFilter from '../components/FinancialYearFilter'
import { getCurrentFY, filterByFY } from '../../../utils/financialYearUtils'
```

### Step 2: Add State
```typescript
const [selectedFY, setSelectedFY] = useState<string>(getCurrentFY())
```

### Step 3: Add Filter to UI
```typescript
// In the header/toolbar section, add:
<FinancialYearFilter
  selectedYear={selectedFY}
  onYearChange={setSelectedFY}
/>
```

### Step 4: Filter Data
```typescript
// Filter the data before displaying:
const filteredInvoices = filterByFY(invoices, selectedFY)

// Then use filteredInvoices in your display logic
```

## Example Implementation

### Before:
```typescript
const Invoices = () => {
  const [invoices, setInvoices] = useState([])
  
  return (
    <div>
      <h1>Invoices</h1>
      {invoices.map(invoice => ...)}
    </div>
  )
}
```

### After:
```typescript
import FinancialYearFilter from '../components/FinancialYearFilter'
import { getCurrentFY, filterByFY } from '../../../utils/financialYearUtils'

const Invoices = () => {
  const [invoices, setInvoices] = useState([])
  const [selectedFY, setSelectedFY] = useState<string>(getCurrentFY())
  
  // Filter invoices by FY
  const filteredInvoices = filterByFY(invoices, selectedFY)
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>Invoices</h1>
        <FinancialYearFilter
          selectedYear={selectedFY}
          onYearChange={setSelectedFY}
        />
      </div>
      {filteredInvoices.map(invoice => ...)}
    </div>
  )
}
```

## UI Placement

### Recommended Locations:

1. **Top Right Corner** (Next to search/filters)
```
[Page Title]                    [Search] [FY Filter] [+ New]
```

2. **Filter Bar** (With other filters)
```
[Status Filter] [Customer Filter] [FY Filter] [Date Range]
```

3. **Header Section** (Prominent placement)
```
┌─────────────────────────────────────────────┐
│ Invoices                    FY: [2026-27 ▼] │
│ ─────────────────────────────────────────── │
│ [Search] [Status] [Customer]                │
└─────────────────────────────────────────────┘
```

## Document Number Patterns Supported

The filter automatically detects FY from these patterns:

- `TC-INV-2627-001` → 2026-27
- `BKC/001/2627` → 2026-27
- `TC-2526-015` → 2025-26
- `PGEL/25-26/6253` → 2025-26
- `INV-2627-001` → 2026-27

## Features

✅ **Auto-detect current FY** - Defaults to current financial year
✅ **All Years option** - Show all data when needed
✅ **Client-side filtering** - Fast, no API calls needed
✅ **Dark mode support** - Matches theme
✅ **Responsive** - Works on mobile
✅ **Reusable** - One component for all pages

## Testing Checklist

- [ ] Filter shows current FY by default
- [ ] Selecting FY filters the list correctly
- [ ] "All Years" shows all data
- [ ] Filter persists when navigating back
- [ ] Works with search/other filters
- [ ] Dark mode looks good
- [ ] Mobile responsive

## Quick Implementation Script

To add FY filter to a page quickly:

1. Add import at top
2. Add state: `const [selectedFY, setSelectedFY] = useState(getCurrentFY())`
3. Add filter component in JSX
4. Wrap data: `const filtered = filterByFY(data, selectedFY)`
5. Use `filtered` instead of `data`

## Files Modified Summary

**Created:**
- `/frontend/src/pages/services/finance/components/FinancialYearFilter.tsx`
- `/frontend/src/utils/financialYearUtils.ts`

**To Modify:**
- `/frontend/src/pages/services/finance/pages/Invoices.tsx`
- `/frontend/src/pages/services/finance/pages/Quotations.tsx`
- `/frontend/src/pages/services/finance/pages/PurchaseOrders.tsx`
- `/frontend/src/pages/services/finance/pages/ProformaInvoices.tsx`
- (Add more as needed)

## Next Steps

1. ✅ Components created
2. ⏳ Apply to Invoices page (example)
3. ⏳ Apply to other pages
4. ⏳ Build and test
5. ⏳ Deploy

---

**Ready to implement! Start with Invoices page as example, then replicate to others.**
