# Reports Module Implementation Summary

## Overview
A dedicated Reports module has been created to extract and filter financial documents (Quotations, PO/WO, Proforma Invoices, and Invoices) with advanced filtering capabilities.

## Backend Implementation

### 1. Models
- No new models created - uses existing finance models (Quotation, PurchaseOrder, ProformaInvoice, Invoice)

### 2. Serializers (`backend/reports/serializers.py`)
Created specialized serializers for report data:
- `QuotationReportSerializer` - Quotation report data with customer info
- `PurchaseOrderReportSerializer` - PO/WO report data with customer info
- `ProformaInvoiceReportSerializer` - Proforma invoice report data
- `InvoiceReportSerializer` - Invoice report data

### 3. Views (`backend/reports/views.py`)
Created ViewSets with filtering capabilities:
- `QuotationReportViewSet` - Read-only viewset with filters
- `PurchaseOrderReportViewSet` - Read-only viewset with filters
- `ProformaInvoiceReportViewSet` - Read-only viewset with filters
- `InvoiceReportViewSet` - Read-only viewset with filters

Each ViewSet includes:
- Date range filtering (start_date, end_date)
- Status filtering
- Customer search (name or code)
- Full-text search
- Ordering capabilities
- Summary endpoint with aggregated data

### 4. URLs (`backend/reports/urls.py`)
Registered endpoints:
- `/api/reports/quotations/` - Quotation reports
- `/api/reports/purchase-orders/` - PO/WO reports
- `/api/reports/proforma-invoices/` - Proforma invoice reports
- `/api/reports/invoices/` - Invoice reports

Each endpoint supports:
- `GET /` - List with filters
- `GET /{id}/` - Detail view
- `GET /summary/` - Summary statistics

## Frontend Implementation

### 1. Reports Page (`frontend/src/pages/Reports.tsx`)
Created a comprehensive reports page with:
- Tab-based navigation for different report types
- Summary cards showing:
  - Total count
  - Total amount
  - Total paid (for invoices/proforma)
  - Outstanding amount (for invoices/proforma)
- Advanced filters:
  - Date range (start date, end date)
  - Status filtering
  - Customer search
  - Full-text search
- Data table with:
  - Document number
  - Date
  - Customer name
  - Status (with color coding)
  - Amount
  - Paid/Outstanding (for invoices/proforma)
- CSV export functionality

### 2. Navigation Integration
- Added "Reports" menu item in Finance Dashboard sidebar
- Icon: FileBarChart
- Description: "Extract and filter financial documents"
- Clicking navigates to `/reports` route

### 3. Router Configuration (`frontend/src/lib/router.tsx`)
- Added `/reports` route with service user authentication
- Lazy-loaded Reports page component

## Features

### Filtering Capabilities
1. **Date Range**: Filter by document date (quotation_date, po_date, proforma_date, invoice_date)
2. **Status**: Filter by document status or payment status
3. **Customer**: Search by customer name or customer code
4. **Search**: Full-text search across document numbers and references

### Report Types
1. **Quotations Report**
   - Status: draft, sent, confirmed, approved, accepted, rejected, expired, converted
   - Shows quotation value and status breakdown

2. **Purchase Orders / Work Orders Report**
   - Status: active, partially_completed, completed
   - Shows PO value and completion status

3. **Proforma Invoices Report**
   - Payment Status: unpaid, partially_paid, paid, overdue
   - Shows total amount, paid amount, and outstanding amount

4. **Invoices Report**
   - Payment Status: unpaid, partially_paid, paid, overdue
   - Shows total amount, paid amount, and outstanding amount

### Export Functionality
- CSV export for all report types
- Includes all filtered data
- Filename format: `{report-type}-report-{date}.csv`

## API Endpoints

### Quotations
```
GET /api/reports/quotations/?start_date=2024-01-01&end_date=2024-12-31&status=sent
GET /api/reports/quotations/summary/?start_date=2024-01-01&end_date=2024-12-31
```

### Purchase Orders
```
GET /api/reports/purchase-orders/?start_date=2024-01-01&end_date=2024-12-31&status=active
GET /api/reports/purchase-orders/summary/?start_date=2024-01-01&end_date=2024-12-31
```

### Proforma Invoices
```
GET /api/reports/proforma-invoices/?start_date=2024-01-01&end_date=2024-12-31&payment_status=unpaid
GET /api/reports/proforma-invoices/summary/?start_date=2024-01-01&end_date=2024-12-31
```

### Invoices
```
GET /api/reports/invoices/?start_date=2024-01-01&end_date=2024-12-31&payment_status=paid
GET /api/reports/invoices/summary/?start_date=2024-01-01&end_date=2024-12-31
```

## Security
- All endpoints require authentication (`IsAuthenticated`)
- Company-level isolation (`IsCompanyServiceUser`)
- Users can only access their company's data

## Usage

1. Navigate to Finance Dashboard
2. Click on "Reports" in the sidebar
3. Select report type (Quotations, PO/WO, Proforma Invoices, or Invoices)
4. Apply filters as needed
5. View summary statistics
6. Export to CSV if needed

## Files Modified/Created

### Backend
- ✅ `backend/reports/serializers.py` - Created
- ✅ `backend/reports/views.py` - Created
- ✅ `backend/reports/urls.py` - Updated

### Frontend
- ✅ `frontend/src/pages/Reports.tsx` - Created
- ✅ `frontend/src/lib/router.tsx` - Updated (added Reports route)
- ✅ `frontend/src/pages/services/finance/pages/Dashboard.tsx` - Updated (added Reports menu item)

## Next Steps (Optional Enhancements)

1. Add PDF export functionality
2. Add scheduled reports (email reports daily/weekly/monthly)
3. Add custom report templates
4. Add chart visualizations
5. Add comparison reports (period over period)
6. Add drill-down capabilities
7. Add saved filter presets
8. Add report sharing functionality

## Testing

To test the Reports module:

1. Start the backend server
2. Start the frontend server
3. Login as a service user (Finance)
4. Navigate to Reports from the sidebar
5. Test different filters and report types
6. Verify data accuracy
7. Test CSV export functionality

## Dependencies

No new dependencies required. Uses existing:
- Django REST Framework
- django-filter
- React
- lucide-react (icons)
- Existing API client
