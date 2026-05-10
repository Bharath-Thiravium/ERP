# Financial Year Dropdown - Complete Frontend Implementation Guide

## Overview

This guide shows you how to add a Financial Year dropdown to your finance module pages (Invoices, Quotations, POs, etc.) so users can easily switch between years.

---

## Step 1: Add HTML Dropdown

Add this HTML to your page (e.g., invoice list page):

```html
<!-- Financial Year Filter Section -->
<div class="filter-container" style="margin-bottom: 20px; display: flex; align-items: center; gap: 15px;">
  <div class="filter-group">
    <label for="fy-filter" style="font-weight: 600; margin-right: 8px;">
      📅 Financial Year:
    </label>
    <select 
      id="fy-filter" 
      onchange="handleFYChange()" 
      style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; min-width: 180px;"
    >
      <option value="">Loading...</option>
    </select>
  </div>
  
  <div class="filter-info" id="fy-info" style="color: #666; font-size: 14px;">
    <!-- Will show record count -->
  </div>
</div>

<!-- Your existing table/list goes here -->
<div id="invoice-list">
  <!-- Invoice table will be populated here -->
</div>
```

---

## Step 2: Add JavaScript Code

Add this JavaScript to your page (or in a separate JS file):

```javascript
// ============================================================================
// FINANCIAL YEAR DROPDOWN - COMPLETE IMPLEMENTATION
// ============================================================================

// Global variables
let sessionKey = 'YOUR_SESSION_KEY'; // Get this from your auth system
let currentFinancialYear = null;
let availableFinancialYears = [];

// ============================================================================
// STEP 1: Initialize on Page Load
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing Financial Year Filter...');
  loadFinancialYears();
});

// ============================================================================
// STEP 2: Load Available Financial Years
// ============================================================================

async function loadFinancialYears() {
  try {
    const response = await fetch(
      `/api/finance/financial-years/?session_key=${sessionKey}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to load financial years');
    }
    
    const data = await response.json();
    
    // Store data globally
    currentFinancialYear = data.current_financial_year;
    availableFinancialYears = data.financial_years;
    
    // Populate dropdown
    populateFYDropdown(data.financial_years, data.current_financial_year);
    
    // Load data for current FY
    loadInvoices();
    
  } catch (error) {
    console.error('Error loading financial years:', error);
    showError('Failed to load financial years. Please refresh the page.');
  }
}

// ============================================================================
// STEP 3: Populate Dropdown with Options
// ============================================================================

function populateFYDropdown(financialYears, currentFY) {
  const select = document.getElementById('fy-filter');
  
  // Clear existing options
  select.innerHTML = '';
  
  // Add "All Years" option
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.text = '📊 All Years';
  select.appendChild(allOption);
  
  // Add separator
  const separator = document.createElement('option');
  separator.disabled = true;
  separator.text = '──────────────';
  select.appendChild(separator);
  
  // Add each financial year
  financialYears.forEach(fy => {
    const option = document.createElement('option');
    option.value = fy.value;
    option.text = fy.label;
    
    // Mark current FY
    if (fy.value === currentFY) {
      option.text = `${fy.label} (Current)`;
      option.selected = true;
    }
    
    select.appendChild(option);
  });
  
  console.log(`Loaded ${financialYears.length} financial years`);
}

// ============================================================================
// STEP 4: Handle Dropdown Change
// ============================================================================

function handleFYChange() {
  const selectedFY = document.getElementById('fy-filter').value;
  console.log(`Financial Year changed to: ${selectedFY}`);
  
  // Show loading state
  showLoading();
  
  // Load invoices for selected FY
  loadInvoices();
}

// ============================================================================
// STEP 5: Load Invoices Based on Selected FY
// ============================================================================

async function loadInvoices() {
  try {
    const selectedFY = document.getElementById('fy-filter').value;
    
    // Build URL with FY parameter
    let url = `/api/finance/invoices/?session_key=${sessionKey}`;
    
    // Add FY parameter
    if (selectedFY === 'all') {
      url += '&financial_year=all';
    } else if (selectedFY) {
      url += `&financial_year=${selectedFY}`;
    }
    // If no selection, it defaults to current FY on backend
    
    console.log(`Loading invoices from: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to load invoices');
    }
    
    const data = await response.json();
    
    console.log(`Loaded ${data.count || data.results.length} invoices`);
    
    // Update the table
    updateInvoiceTable(data.results);
    
    // Update info display
    updateFYInfo(selectedFY, data.count || data.results.length);
    
    // Hide loading state
    hideLoading();
    
  } catch (error) {
    console.error('Error loading invoices:', error);
    showError('Failed to load invoices. Please try again.');
    hideLoading();
  }
}

// ============================================================================
// STEP 6: Update Invoice Table
// ============================================================================

function updateInvoiceTable(invoices) {
  const tableBody = document.getElementById('invoice-table-body');
  
  if (!tableBody) {
    console.error('Invoice table body not found');
    return;
  }
  
  // Clear existing rows
  tableBody.innerHTML = '';
  
  if (invoices.length === 0) {
    // Show empty state
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #999;">
          <div style="font-size: 48px; margin-bottom: 10px;">📭</div>
          <div style="font-size: 16px;">No invoices found for this period</div>
        </td>
      </tr>
    `;
    return;
  }
  
  // Add invoice rows
  invoices.forEach(invoice => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(invoice.invoice_number)}</td>
      <td>${formatDate(invoice.invoice_date)}</td>
      <td>${escapeHtml(invoice.customer_name || invoice.customer?.name || '-')}</td>
      <td style="text-align: right;">₹${formatCurrency(invoice.total_amount)}</td>
      <td style="text-align: right;">₹${formatCurrency(invoice.paid_amount)}</td>
      <td style="text-align: right;">₹${formatCurrency(invoice.outstanding_amount)}</td>
      <td>
        <span class="status-badge status-${invoice.payment_status}">
          ${formatStatus(invoice.payment_status)}
        </span>
      </td>
      <td>
        <button onclick="viewInvoice(${invoice.id})" class="btn-view">View</button>
        <button onclick="downloadPDF(${invoice.id})" class="btn-pdf">PDF</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

// ============================================================================
// STEP 7: Update Info Display
// ============================================================================

function updateFYInfo(selectedFY, count) {
  const infoDiv = document.getElementById('fy-info');
  
  if (!infoDiv) return;
  
  let fyLabel = 'Current FY';
  
  if (selectedFY === 'all') {
    fyLabel = 'All Years';
  } else if (selectedFY) {
    const fy = availableFinancialYears.find(f => f.value === selectedFY);
    fyLabel = fy ? fy.label : selectedFY;
  }
  
  infoDiv.innerHTML = `
    <strong>${count}</strong> invoice${count !== 1 ? 's' : ''} found in <strong>${fyLabel}</strong>
  `;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showLoading() {
  const list = document.getElementById('invoice-list');
  if (list) {
    list.style.opacity = '0.5';
    list.style.pointerEvents = 'none';
  }
}

function hideLoading() {
  const list = document.getElementById('invoice-list');
  if (list) {
    list.style.opacity = '1';
    list.style.pointerEvents = 'auto';
  }
}

function showError(message) {
  alert(message); // Replace with your preferred notification system
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
}

function formatCurrency(amount) {
  if (!amount) return '0.00';
  return parseFloat(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatStatus(status) {
  const statusMap = {
    'unpaid': 'Unpaid',
    'partially_paid': 'Partially Paid',
    'paid': 'Paid',
    'overdue': 'Overdue'
  };
  return statusMap[status] || status;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// ACTION FUNCTIONS (Customize these based on your app)
// ============================================================================

function viewInvoice(invoiceId) {
  // Navigate to invoice detail page
  window.location.href = `/invoices/${invoiceId}`;
}

function downloadPDF(invoiceId) {
  // Download invoice PDF
  window.open(
    `/api/finance/invoices/${invoiceId}/pdf/?session_key=${sessionKey}`,
    '_blank'
  );
}

// ============================================================================
// EXPORT FOR USE IN OTHER MODULES
// ============================================================================

// You can reuse this for other modules (Quotations, POs, etc.)
window.FinanceYearFilter = {
  loadFinancialYears,
  handleFYChange,
  loadInvoices,
  updateInvoiceTable
};
```

---

## Step 3: Add CSS Styles

Add these styles to your CSS file:

```css
/* Financial Year Filter Styles */
.filter-container {
  background: #f8f9fa;
  padding: 15px 20px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  margin-bottom: 20px;
}

.filter-group {
  display: flex;
  align-items: center;
}

.filter-group label {
  font-weight: 600;
  color: #333;
  margin-right: 10px;
}

#fy-filter {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 200px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: border-color 0.3s;
}

#fy-filter:hover {
  border-color: #007bff;
}

#fy-filter:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.filter-info {
  color: #666;
  font-size: 14px;
  padding: 8px 12px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

/* Status Badge Styles */
.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-unpaid {
  background: #fee;
  color: #c00;
}

.status-partially_paid {
  background: #fff3cd;
  color: #856404;
}

.status-paid {
  background: #d4edda;
  color: #155724;
}

.status-overdue {
  background: #f8d7da;
  color: #721c24;
}

/* Button Styles */
.btn-view, .btn-pdf {
  padding: 6px 12px;
  margin: 0 4px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s;
}

.btn-view {
  background: #007bff;
  color: white;
}

.btn-view:hover {
  background: #0056b3;
}

.btn-pdf {
  background: #28a745;
  color: white;
}

.btn-pdf:hover {
  background: #218838;
}
```

---

## Step 4: Update Your HTML Table

Make sure your invoice table has the correct structure:

```html
<table class="invoice-table">
  <thead>
    <tr>
      <th>Invoice No.</th>
      <th>Date</th>
      <th>Customer</th>
      <th style="text-align: right;">Total</th>
      <th style="text-align: right;">Paid</th>
      <th style="text-align: right;">Outstanding</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody id="invoice-table-body">
    <!-- Rows will be populated by JavaScript -->
  </tbody>
</table>
```

---

## Step 5: Adapt for Other Modules

To use this for **Quotations**, **Purchase Orders**, or **Proforma Invoices**, just change the API endpoint:

```javascript
// For Quotations
let url = `/api/finance/quotations/?session_key=${sessionKey}`;

// For Purchase Orders
let url = `/api/finance/purchase-orders/?session_key=${sessionKey}`;

// For Proforma Invoices
let url = `/api/finance/proforma-invoices/?session_key=${sessionKey}`;

// For Payments
let url = `/api/finance/payments/?session_key=${sessionKey}`;
```

---

## Complete Example Page

Here's a complete HTML page example:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoices - Financial Year Filter</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <h1>📄 Invoices</h1>
    
    <!-- Financial Year Filter -->
    <div class="filter-container">
      <div class="filter-group">
        <label for="fy-filter">📅 Financial Year:</label>
        <select id="fy-filter" onchange="handleFYChange()">
          <option value="">Loading...</option>
        </select>
      </div>
      <div class="filter-info" id="fy-info"></div>
    </div>
    
    <!-- Invoice Table -->
    <div id="invoice-list">
      <table class="invoice-table">
        <thead>
          <tr>
            <th>Invoice No.</th>
            <th>Date</th>
            <th>Customer</th>
            <th style="text-align: right;">Total</th>
            <th style="text-align: right;">Paid</th>
            <th style="text-align: right;">Outstanding</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="invoice-table-body">
          <tr>
            <td colspan="8" style="text-align: center; padding: 40px;">
              Loading invoices...
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  
  <script src="fy-filter.js"></script>
</body>
</html>
```

---

## Testing

1. **Open your page** in the browser
2. **Check console** for logs: "Initializing Financial Year Filter..."
3. **Dropdown should populate** with FY options
4. **Current FY selected** by default
5. **Change dropdown** to see different years
6. **Select "All Years"** to see all historical data

---

## Troubleshooting

### Dropdown shows "Loading..." forever
- Check browser console for errors
- Verify `sessionKey` is correct
- Check API endpoint is accessible

### No invoices showing
- Check if invoices exist for selected FY
- Try selecting "All Years" to see if any data exists
- Check browser console for API errors

### Dropdown not changing data
- Verify `handleFYChange()` function is called
- Check console logs for API URL
- Verify API response in Network tab

---

## 🎉 Done!

Your users can now easily switch between financial years using the dropdown! The implementation is:

✅ **User-friendly** - Simple dropdown interface  
✅ **Fast** - Loads only selected FY data  
✅ **Flexible** - Can view any FY or all years  
✅ **Reusable** - Works for all finance modules  

---

**Need help?** Check the browser console for detailed logs!
