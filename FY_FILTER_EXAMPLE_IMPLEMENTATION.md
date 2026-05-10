# Example: Adding FY Filter to Invoices Page

## Step-by-Step Implementation

### 1. Add Imports (at top of file)

```typescript
// Add these imports after existing imports
import FinancialYearFilter from '../components/FinancialYearFilter'
import { getCurrentFY } from '../../../../utils/financialYearUtils'
```

### 2. Add State (in component)

```typescript
// Add this state after existing useState declarations
const [selectedFY, setSelectedFY] = useState<string>(getCurrentFY())
```

### 3. Add Filter to UI (in JSX)

Find the section with the "Create Invoice" button and add the FY filter next to it:

```typescript
// BEFORE:
<div className="flex justify-between items-center mb-6">
  <h1 className="text-2xl font-bold">Invoices</h1>
  <button onClick={() => setShowDirectInvoiceModal(true)}>
    <Plus /> Create Invoice
  </button>
</div>

// AFTER:
<div className="flex justify-between items-center mb-6">
  <h1 className="text-2xl font-bold">Invoices</h1>
  <div className="flex items-center gap-4">
    <FinancialYearFilter
      selectedYear={selectedFY}
      onYearChange={setSelectedFY}
    />
    <button onClick={() => setShowDirectInvoiceModal(true)}>
      <Plus /> Create Invoice
    </button>
  </div>
</div>
```

### 4. Pass FY to InvoiceList Component

```typescript
// BEFORE:
<InvoiceList
  sessionKey={sessionKey}
  refreshKey={refreshKey}
  filterStatus={invoiceFilter}
/>

// AFTER:
<InvoiceList
  sessionKey={sessionKey}
  refreshKey={refreshKey}
  filterStatus={invoiceFilter}
  selectedFY={selectedFY}
/>
```

### 5. Update InvoiceList Component

In `/components/InvoiceList.tsx`, add FY filtering:

```typescript
// Add to interface
interface InvoiceListProps {
  sessionKey: string
  refreshKey: number
  filterStatus: string
  selectedFY?: string  // Add this
}

// Add import
import { filterByFY } from '../../../../utils/financialYearUtils'

// In component, filter the invoices:
const filteredInvoices = filterByFY(invoices, selectedFY || '')

// Use filteredInvoices instead of invoices in display
```

## Complete Code Example

### Invoices.tsx (Modified sections)

```typescript
import React, { useState, useEffect } from 'react';
import { Plus, FileText, IndianRupee, AlertCircle, List } from 'lucide-react';
import DirectCreateTaxInvoiceModal from '../components/DirectCreateTaxInvoiceModal';
import InvoiceList from '../components/InvoiceList';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import FinanceCard from '../components/FinanceCard';
import MetricCard from '../components/MetricCard';
// ADD THESE:
import FinancialYearFilter from '../components/FinancialYearFilter'
import { getCurrentFY } from '../../../../utils/financialYearUtils'

interface InvoicesProps {
  sessionKey: string;
}

const Invoices: React.FC<InvoicesProps> = ({ sessionKey }) => {
  const [stats, setStats] = useState<InvoiceStats>({...});
  const [loading, setLoading] = useState(true);
  const [showDirectInvoiceModal, setShowDirectInvoiceModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [invoiceFilter, setInvoiceFilter] = useState('');
  // ADD THIS:
  const [selectedFY, setSelectedFY] = useState<string>(getCurrentFY())

  // ... rest of the code ...

  return (
    <div className="p-6">
      {/* Header with FY Filter */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Invoices
        </h1>
        <div className="flex items-center gap-4">
          {/* ADD THIS: */}
          <FinancialYearFilter
            selectedYear={selectedFY}
            onYearChange={setSelectedFY}
          />
          <button
            onClick={() => setShowDirectInvoiceModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* ... stats cards ... */}
      </div>

      {/* Invoice List with FY Filter */}
      <InvoiceList
        sessionKey={sessionKey}
        refreshKey={refreshKey}
        filterStatus={invoiceFilter}
        selectedFY={selectedFY}  {/* ADD THIS */}
      />

      {/* Modals */}
      {showDirectInvoiceModal && (
        <DirectCreateTaxInvoiceModal
          isOpen={showDirectInvoiceModal}
          onClose={() => setShowDirectInvoiceModal(false)}
          onSuccess={handleInvoiceCreated}
        />
      )}
    </div>
  );
};

export default Invoices;
```

## Apply Same Pattern to Other Pages

Use the same 5 steps for:
- Quotations.tsx
- PurchaseOrders.tsx
- ProformaInvoices.tsx
- Customers.tsx
- Products.tsx

## Visual Result

```
┌────────────────────────────────────────────────────────┐
│ Invoices                    FY: [2026-27 ▼] [+ Create] │
├────────────────────────────────────────────────────────┤
│ [Total: ₹X] [Paid: ₹Y] [Outstanding: ₹Z] [Overdue: N] │
├────────────────────────────────────────────────────────┤
│ [Status Filter] [Search]                               │
├────────────────────────────────────────────────────────┤
│ Invoice List (Filtered by FY 2026-27)                  │
│ - TC-INV-2627-001                                      │
│ - TC-INV-2627-002                                      │
│ (Only showing FY 2026-27 invoices)                     │
└────────────────────────────────────────────────────────┘
```

## Benefits

✅ Users can quickly switch between financial years
✅ Reduces clutter by showing only relevant data
✅ Improves performance (less data to render)
✅ Better for year-end reporting
✅ Consistent across all finance pages

---

**Ready to implement! Start with Invoices page, then copy pattern to others.**
