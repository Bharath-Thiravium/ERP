# Financial Year Filtering - Quick Reference

## ✅ What's Implemented

### New API Endpoints

1. **Get Financial Years List**
   ```
   GET /api/finance/financial-years/
   ```
   Returns all available FYs for dropdown

2. **Get FY Details with Quarters**
   ```
   GET /api/finance/financial-years/info/?financial_year=2026-27
   ```
   Returns FY dates and quarterly breakdown

3. **Get FY Summary Dashboard**
   ```
   GET /api/finance/financial-years/summary/?financial_year=2026-27
   ```
   Returns aggregated statistics for all modules

### Modules Supporting FY Filter

All these endpoints now accept `financial_year` query parameter:

| Module | Endpoint | Date Field |
|--------|----------|------------|
| **Quotations** | `/api/finance/quotations/` | `quotation_date` |
| **Purchase Orders** | `/api/finance/purchase-orders/` | `po_date` |
| **Proforma Invoices** | `/api/finance/proforma-invoices/` | `proforma_date` |
| **Tax Invoices** | `/api/finance/invoices/` | `invoice_date` |
| **Payments** | `/api/finance/payments/` | `payment_date` |

---

## 🎯 Default Behavior

**⚠️ IMPORTANT:** All lists now show **CURRENT FY ONLY** by default!

- **No parameter:** Shows current FY (2026-27)
- **`financial_year=2025-26`:** Shows specific FY
- **`financial_year=all`:** Shows ALL years

### Examples

```bash
# Default - Current FY only
GET /api/finance/invoices/?session_key=XXX

# Specific FY
GET /api/finance/invoices/?session_key=XXX&financial_year=2025-26

# All historical data
GET /api/finance/invoices/?session_key=XXX&financial_year=all
```

---

### 1. Get Available FYs
```javascript
const response = await fetch('/api/finance/financial-years/?session_key=XXX');
const data = await response.json();
// Use data.financial_years for dropdown
// Use data.current_financial_year for default selection
```

### 2. Filter Records by FY
```javascript
// Add financial_year parameter to any list endpoint
const url = `/api/finance/invoices/?session_key=XXX&financial_year=2026-27`;
const response = await fetch(url);
```

### 3. Get FY Summary
```javascript
const url = `/api/finance/financial-years/summary/?session_key=XXX&financial_year=2026-27`;
const response = await fetch(url);
// Returns counts and totals for all modules
```

---

## 📋 FY Format

**Accepts both formats:**
- Long: `2026-27`
- Short: `2627`

**Indian Financial Year:**
- Starts: April 1
- Ends: March 31

---

## 🎯 Use Cases

### 1. Filter Invoices for Current FY
```
GET /api/finance/invoices/?session_key=XXX&financial_year=2026-27
```

### 2. View Last Year's Quotations
```
GET /api/finance/quotations/?session_key=XXX&financial_year=2025-26
```

### 3. Get All-Time Records (No Filter)
```
GET /api/finance/invoices/?session_key=XXX
```

### 4. Dashboard Summary for FY
```
GET /api/finance/financial-years/summary/?session_key=XXX&financial_year=2026-27&module=invoice
```

---

## 💡 Frontend Integration

### HTML Dropdown
```html
<select id="fy-filter" onchange="applyFilter()">
  <option value="">All Years</option>
  <!-- Populated dynamically -->
</select>
```

### JavaScript
```javascript
// Load FYs on page load
async function loadFYs() {
  const res = await fetch('/api/finance/financial-years/?session_key=' + sessionKey);
  const data = await res.json();
  
  const select = document.getElementById('fy-filter');
  data.financial_years.forEach(fy => {
    const opt = new Option(fy.label, fy.value);
    if (fy.value === data.current_financial_year) opt.selected = true;
    select.add(opt);
  });
}

// Apply filter
async function applyFilter() {
  const fy = document.getElementById('fy-filter').value;
  let url = '/api/finance/invoices/?session_key=' + sessionKey;
  if (fy) url += '&financial_year=' + fy;
  
  const res = await fetch(url);
  const data = await res.json();
  updateTable(data.results);
}
```

---

## 📊 Response Examples

### Financial Years List
```json
{
  "financial_years": [
    {
      "value": "2026-27",
      "short": "2627",
      "label": "FY 2026-27",
      "start_date": "2026-04-01",
      "end_date": "2027-03-31"
    }
  ],
  "current_financial_year": "2026-27"
}
```

### FY Summary
```json
{
  "financial_year": "2026-27",
  "company": "BK CONSTRUCTION",
  "summary": {
    "quotations": {
      "count": 45,
      "total_amount": 5000000.00
    },
    "invoices": {
      "count": 20,
      "total_amount": 2500000.00,
      "outstanding_amount": 700000.00
    }
  }
}
```

---

## ✅ Benefits

- **Consistent:** Same FY logic everywhere
- **Simple:** Just add `financial_year` parameter
- **Flexible:** Works with or without filter
- **Indian FY:** April-March support
- **Historical:** View old records
- **Future:** Plan ahead

---

## 🔧 Backend Utils (For Developers)

```python
from finance.financial_year_utils import (
    apply_financial_year_filter,
    get_current_financial_year,
    get_financial_year_dates,
    get_available_financial_years
)

# Apply FY filter to queryset
invoices = apply_financial_year_filter(
    Invoice.objects.filter(company=company),
    'invoice_date',
    '2026-27'
)

# Get FY dates
start_date, end_date = get_financial_year_dates('2026-27')

# Get current FY
current_fy = get_current_financial_year()  # Returns "2026-27"
```

---

## 📝 Files Created

1. `/backend/finance/financial_year_utils.py` - Core utilities
2. `/backend/finance/financial_year_views.py` - API views
3. `/backend/FINANCIAL_YEAR_FILTERING.md` - Full documentation
4. `/backend/FINANCIAL_YEAR_QUICK_REFERENCE.md` - This file

---

## 🎉 Ready to Use!

All endpoints are live and ready. Just add `financial_year` parameter to filter by FY.

**Example:**
```
/api/finance/invoices/?session_key=XXX&financial_year=2026-27
```

---

**Last Updated:** January 2027
