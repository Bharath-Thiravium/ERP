# Financial Year Filtering - Complete Guide

## Overview

The SAP-Python finance module now supports comprehensive **Financial Year (FY) filtering** across all finance documents:
- ✅ **Quotations**
- ✅ **Purchase Orders (PO/WO)**
- ✅ **Proforma Invoices**
- ✅ **Tax Invoices**
- ✅ **Payments**

This allows you to filter and view records based on Indian Financial Year (April 1 to March 31).

---

## API Endpoints

### 1. Get Available Financial Years

**Endpoint:** `GET /api/finance/financial-years/`

**Purpose:** Get list of all available financial years for dropdown selection

**Query Parameters:**
- `session_key` (required): Authentication session key
- `start_year` (optional): Starting year, default 2020
- `future_years` (optional): Number of future years to include, default 2

**Response:**
```json
{
  "financial_years": [
    {
      "value": "2026-27",
      "short": "2627",
      "label": "FY 2026-27",
      "start_date": "2026-04-01",
      "end_date": "2027-03-31"
    },
    {
      "value": "2025-26",
      "short": "2526",
      "label": "FY 2025-26",
      "start_date": "2025-04-01",
      "end_date": "2026-03-31"
    }
  ],
  "current_financial_year": "2026-27"
}
```

**Example Usage:**
```javascript
const response = await fetch('/api/finance/financial-years/?session_key=YOUR_SESSION_KEY');
const data = await response.json();

// Populate dropdown
const fyDropdown = document.getElementById('fy-select');
data.financial_years.forEach(fy => {
  const option = document.createElement('option');
  option.value = fy.value;
  option.text = fy.label;
  if (fy.value === data.current_financial_year) {
    option.selected = true;
  }
  fyDropdown.appendChild(option);
});
```

---

### 2. Get Financial Year Details

**Endpoint:** `GET /api/finance/financial-years/info/`

**Purpose:** Get detailed information about a specific FY including quarters

**Query Parameters:**
- `session_key` (required): Authentication session key
- `financial_year` (required): FY string like "2026-27" or "2627"

**Response:**
```json
{
  "financial_year": "2026-27",
  "start_date": "2026-04-01",
  "end_date": "2027-03-31",
  "is_current": true,
  "quarters": [
    {
      "quarter": "Q1",
      "label": "Q1 (Apr 2026 - Jun 2026)",
      "start_date": "2026-04-01",
      "end_date": "2026-06-30"
    },
    {
      "quarter": "Q2",
      "label": "Q2 (Jul 2026 - Sep 2026)",
      "start_date": "2026-07-01",
      "end_date": "2026-09-30"
    },
    {
      "quarter": "Q3",
      "label": "Q3 (Oct 2026 - Dec 2026)",
      "start_date": "2026-10-01",
      "end_date": "2026-12-31"
    },
    {
      "quarter": "Q4",
      "label": "Q4 (Jan 2027 - Mar 2027)",
      "start_date": "2027-01-01",
      "end_date": "2027-03-31"
    }
  ]
}
```

---

### 3. Get Finance Summary by FY

**Endpoint:** `GET /api/finance/financial-years/summary/`

**Purpose:** Get aggregated statistics for all finance modules by FY

**Query Parameters:**
- `session_key` (required): Authentication session key
- `financial_year` (optional): Filter by specific FY
- `module` (optional): Filter by module (quotation, purchase_order, proforma_invoice, invoice, payment, or 'all')

**Response:**
```json
{
  "financial_year": "2026-27",
  "company": "BK CONSTRUCTION",
  "summary": {
    "quotations": {
      "count": 45,
      "total_amount": 5000000.00,
      "by_status": {
        "draft": 5,
        "sent": 20,
        "approved": 18,
        "rejected": 2
      }
    },
    "purchase_orders": {
      "count": 30,
      "total_amount": 4500000.00,
      "by_status": {
        "draft": 2,
        "active": 15,
        "confirmed": 10,
        "completed": 3
      }
    },
    "proforma_invoices": {
      "count": 25,
      "total_amount": 3000000.00,
      "paid_amount": 2000000.00,
      "outstanding_amount": 1000000.00,
      "by_payment_status": {
        "unpaid": 5,
        "partially_paid": 10,
        "paid": 10
      }
    },
    "invoices": {
      "count": 20,
      "total_amount": 2500000.00,
      "paid_amount": 1800000.00,
      "outstanding_amount": 700000.00,
      "by_payment_status": {
        "unpaid": 3,
        "partially_paid": 7,
        "paid": 8,
        "overdue": 2
      }
    },
    "payments": {
      "count": 50,
      "total_amount": 3800000.00,
      "by_method": {
        "cash": 5,
        "bank_transfer": 30,
        "cheque": 10,
        "upi": 5,
        "card": 0
      }
    }
  }
}
```

---

## Default Behavior

**IMPORTANT:** By default, all list endpoints now show **ONLY current financial year** data.

To view data from other years:
- **Specific FY:** Add `financial_year=2025-26` parameter
- **All Years:** Add `financial_year=all` parameter

### Examples:

```bash
# Default - Shows current FY (2026-27) only
GET /api/finance/invoices/?session_key=XXX

# Show specific FY
GET /api/finance/invoices/?session_key=XXX&financial_year=2025-26

# Show ALL years (historical data)
GET /api/finance/invoices/?session_key=XXX&financial_year=all
```

---

All existing list endpoints now support `financial_year` query parameter:

### Quotations
```
GET /api/finance/quotations/?session_key=XXX&financial_year=2026-27
```

### Purchase Orders
```
GET /api/finance/purchase-orders/?session_key=XXX&financial_year=2026-27
```

### Proforma Invoices
```
GET /api/finance/proforma-invoices/?session_key=XXX&financial_year=2026-27
```

### Tax Invoices
```
GET /api/finance/invoices/?session_key=XXX&financial_year=2026-27
```

### Payments
```
GET /api/finance/payments/?session_key=XXX&financial_year=2026-27
```

---

## Frontend Implementation Guide

### Step 1: Add FY Dropdown to UI

```html
<div class="filter-section">
  <label for="fy-filter">Financial Year:</label>
  <select id="fy-filter" onchange="applyFYFilter()">
    <option value="">All Years</option>
    <!-- Options populated dynamically -->
  </select>
</div>
```

### Step 2: Load Financial Years on Page Load

```javascript
async function loadFinancialYears() {
  try {
    const response = await fetch(
      `/api/finance/financial-years/?session_key=${sessionKey}`
    );
    const data = await response.json();
    
    const fySelect = document.getElementById('fy-filter');
    
    // Add "All Years" option
    fySelect.innerHTML = '<option value="">All Years</option>';
    
    // Add FY options
    data.financial_years.forEach(fy => {
      const option = document.createElement('option');
      option.value = fy.value;
      option.text = fy.label;
      
      // Select current FY by default
      if (fy.value === data.current_financial_year) {
        option.selected = true;
      }
      
      fySelect.appendChild(option);
    });
    
    // Load data for current FY
    applyFYFilter();
    
  } catch (error) {
    console.error('Error loading financial years:', error);
  }
}

// Call on page load
document.addEventListener('DOMContentLoaded', loadFinancialYears);
```

### Step 3: Apply Filter When Selection Changes

```javascript
async function applyFYFilter() {
  const selectedFY = document.getElementById('fy-filter').value;
  
  // Build URL with FY filter
  let url = `/api/finance/invoices/?session_key=${sessionKey}`;
  if (selectedFY) {
    url += `&financial_year=${selectedFY}`;
  }
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // Update your table/list with filtered data
    updateInvoiceTable(data.results);
    
  } catch (error) {
    console.error('Error applying FY filter:', error);
  }
}
```

### Step 4: Show FY Summary Dashboard

```javascript
async function showFYSummary() {
  const selectedFY = document.getElementById('fy-filter').value;
  
  let url = `/api/finance/financial-years/summary/?session_key=${sessionKey}`;
  if (selectedFY) {
    url += `&financial_year=${selectedFY}`;
  }
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // Display summary cards
    document.getElementById('total-quotations').textContent = 
      data.summary.quotations.count;
    document.getElementById('total-quotation-amount').textContent = 
      `₹${formatCurrency(data.summary.quotations.total_amount)}`;
    
    document.getElementById('total-invoices').textContent = 
      data.summary.invoices.count;
    document.getElementById('total-invoice-amount').textContent = 
      `₹${formatCurrency(data.summary.invoices.total_amount)}`;
    
    document.getElementById('outstanding-amount').textContent = 
      `₹${formatCurrency(data.summary.invoices.outstanding_amount)}`;
    
  } catch (error) {
    console.error('Error loading FY summary:', error);
  }
}
```

---

## Backend Implementation (For Developers)

### Using Financial Year Utils in Views

```python
from finance.financial_year_utils import (
    apply_financial_year_filter,
    get_current_financial_year,
    get_financial_year_dates
)

def my_custom_view(request):
    # Get FY from query params
    financial_year = request.query_params.get('financial_year')
    
    # Get queryset
    invoices = Invoice.objects.filter(company=company)
    
    # Apply FY filter
    if financial_year:
        invoices = apply_financial_year_filter(
            invoices, 
            'invoice_date',  # Date field name
            financial_year
        )
    
    # Continue with your logic...
```

### Manual FY Filtering

```python
from finance.financial_year_utils import get_financial_year_dates

def filter_by_fy(request):
    financial_year = request.query_params.get('financial_year', '2026-27')
    
    # Get FY date range
    start_date, end_date = get_financial_year_dates(financial_year)
    
    # Apply filter
    invoices = Invoice.objects.filter(
        company=company,
        invoice_date__gte=start_date,
        invoice_date__lte=end_date
    )
```

---

## Benefits

✅ **Consistent Filtering:** Same FY logic across all modules  
✅ **Indian FY Support:** April 1 to March 31  
✅ **Easy Integration:** Simple query parameter  
✅ **Historical Data:** View old FY records  
✅ **Future Planning:** Include future FYs  
✅ **Quarter Support:** Q1, Q2, Q3, Q4 breakdown  
✅ **Summary Dashboard:** Aggregated FY statistics  

---

## Examples

### Filter Invoices for FY 2026-27
```
GET /api/finance/invoices/?session_key=XXX&financial_year=2026-27
```

### Filter Payments for FY 2025-26
```
GET /api/finance/payments/?session_key=XXX&financial_year=2025-26
```

### Get All Quotations (No FY Filter)
```
GET /api/finance/quotations/?session_key=XXX
```

### Get Current FY Summary
```
GET /api/finance/financial-years/summary/?session_key=XXX&financial_year=2026-27
```

---

## Testing

### Test FY Filter
```bash
# Get available FYs
curl "http://localhost:8004/api/finance/financial-years/?session_key=YOUR_KEY"

# Filter invoices by FY
curl "http://localhost:8004/api/finance/invoices/?session_key=YOUR_KEY&financial_year=2026-27"

# Get FY summary
curl "http://localhost:8004/api/finance/financial-years/summary/?session_key=YOUR_KEY&financial_year=2026-27"
```

---

## Notes

- **FY Format:** Accepts both "2026-27" and "2627" formats
- **Default Behavior:** Without FY filter, shows all records
- **Current FY:** Automatically detected based on current date
- **Date Range:** FY runs from April 1 to March 31 (Indian FY)
- **Backward Compatible:** Existing code works without changes

---

## Support

For issues or questions:
1. Check API response for error messages
2. Verify session_key is valid
3. Ensure financial_year format is correct ("2026-27" or "2627")
4. Check date fields exist in the model

---

**Last Updated:** January 2027  
**Version:** 1.0.0
