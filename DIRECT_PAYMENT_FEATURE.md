# Direct Customer Payment Feature

## Overview

The Direct Customer Payment feature allows you to record payments from customers that are **not tied to any invoice**. This is useful for various scenarios such as:

- **Memos**: Debit/Credit memos
- **Penalties**: Late payment penalties or other charges
- **Incentives**: Early payment discounts or bonuses
- **Complimentary**: Goodwill payments or adjustments
- **Advances**: General advance payments not linked to specific invoices
- **Other**: Any other miscellaneous payments

## Key Features

### 1. **Invoice-Independent Payments**
- Record payments without requiring an invoice
- Flexible payment purposes
- Direct customer account updates

### 2. **TDS Support**
- Optional TDS deduction on direct payments
- Automatic TDS calculation based on rate
- TDS section tracking (194C, 194J, etc.)
- Net amount calculation

### 3. **Payment Tracking**
- Unique payment numbers (auto-generated)
- Multiple payment methods support
- Transaction reference tracking
- Bank details recording

### 4. **Customer Payment Summary**
- View all payments (invoice + direct) for a customer
- Separate totals for invoice and direct payments
- TDS summary across all payments

## Database Schema

### Payment Model Updates

```python
class Payment(models.Model):
    # New fields added:
    payment_type = CharField(choices=['invoice', 'direct'])
    payment_purpose = CharField(max_length=100, blank=True)
    
    # Existing fields now optional for direct payments:
    invoice = ForeignKey(Invoice, null=True, blank=True)
    proforma_invoice = ForeignKey(ProformaInvoice, null=True, blank=True)
```

## API Endpoints

### 1. Create Direct Payment
**POST** `/api/finance/direct-payments/create/`

**Request Body:**
```json
{
  "customer_id": 123,
  "payment_purpose": "Penalty for late delivery",
  "payment_date": "2025-01-15",
  "amount": 5000.00,
  "payment_method": "bank_transfer",
  "reference_number": "REF123456",
  "transaction_id": "TXN789012",
  "bank_name": "HDFC Bank",
  "tds_applicable": true,
  "tds_rate": 2.0,
  "tds_section": "194C",
  "notes": "Penalty as per contract clause 5.2"
}
```

**Response:**
```json
{
  "message": "Direct payment created successfully",
  "payment_id": 456,
  "payment_number": "PAY-2025-000123",
  "amount": 5000.00,
  "net_amount_received": 4900.00
}
```

### 2. List Direct Payments
**GET** `/api/finance/direct-payments/`

**Query Parameters:**
- `customer_id` (optional): Filter by customer

**Response:**
```json
{
  "payments": [
    {
      "id": 456,
      "payment_number": "PAY-2025-000123",
      "payment_date": "2025-01-15",
      "customer_id": 123,
      "customer_name": "ABC Corporation",
      "customer_code": "CUST-000123",
      "payment_purpose": "Penalty for late delivery",
      "amount": 5000.00,
      "gross_payment_amount": 5000.00,
      "tds_applicable": true,
      "tds_amount": 100.00,
      "tds_rate": 2.0,
      "net_amount_received": 4900.00,
      "payment_method": "bank_transfer",
      "reference_number": "REF123456",
      "status": "completed",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total_count": 1
}
```

### 3. Get Direct Payment Details
**GET** `/api/finance/direct-payments/<payment_id>/`

### 4. Delete Direct Payment
**DELETE** `/api/finance/direct-payments/<payment_id>/delete/`

### 5. Customer Payment Summary
**GET** `/api/finance/customers/<customer_id>/payment-summary/`

**Response:**
```json
{
  "customer_id": 123,
  "customer_name": "ABC Corporation",
  "customer_code": "CUST-000123",
  "invoice_payments_total": 150000.00,
  "invoice_payments_count": 5,
  "direct_payments_total": 10000.00,
  "direct_payments_count": 2,
  "total_payments": 160000.00,
  "total_tds_deducted": 3200.00,
  "total_payments_count": 7
}
```

## Frontend Usage

### Component Location
`frontend/src/pages/services/finance/pages/DirectCustomerPayment.tsx`

### Features
1. **Create Direct Payment Form**
   - Customer selection dropdown
   - Payment purpose input
   - Amount and date fields
   - Payment method selection
   - TDS calculation (automatic)
   - Bank details fields

2. **Payment History Table**
   - View all direct payments
   - Filter by customer
   - Delete payments
   - Status badges

3. **TDS Auto-calculation**
   - Enable TDS checkbox
   - Enter TDS rate
   - Automatic calculation of TDS amount and net amount

### Integration Steps

1. **Add to Finance Menu:**
```typescript
// In your finance routes/menu
{
  path: '/finance/direct-payments',
  component: DirectCustomerPayment,
  label: 'Direct Payments',
  icon: DollarSign
}
```

2. **Add to Customer Detail Page:**
```typescript
// Show payment summary in customer detail
<CustomerPaymentSummary customerId={customer.id} />
```

## Use Cases

### Use Case 1: Late Payment Penalty
```
Customer: ABC Corp
Purpose: Late payment penalty
Amount: ₹5,000
TDS: Not applicable
Method: Bank Transfer
```

### Use Case 2: Early Payment Incentive
```
Customer: XYZ Ltd
Purpose: Early payment discount
Amount: ₹10,000
TDS: 2% (₹200)
Net Received: ₹9,800
Method: NEFT
```

### Use Case 3: Complimentary Credit
```
Customer: DEF Industries
Purpose: Goodwill credit for service issue
Amount: ₹3,000
TDS: Not applicable
Method: Adjustment
```

### Use Case 4: Memo Payment
```
Customer: GHI Enterprises
Purpose: Debit memo for damaged goods
Amount: ₹15,000
TDS: 1% (₹150)
Net Received: ₹14,850
Method: Cheque
```

## Setup Instructions

### 1. Run Setup Script
```bash
cd /var/www/SAP-Python
./setup_direct_payment.sh
```

### 2. Manual Setup (Alternative)
```bash
cd backend
source venv/bin/activate
python manage.py makemigrations finance
python manage.py migrate finance
```

### 3. Restart Services
```bash
./restart_services.sh
```

## Testing

### Test Direct Payment Creation
```bash
curl -X POST http://localhost:8004/api/finance/direct-payments/create/ \
  -H "Authorization: Bearer YOUR_SESSION_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "payment_purpose": "Test Payment",
    "payment_date": "2025-01-15",
    "amount": 1000.00,
    "payment_method": "bank_transfer"
  }'
```

### Test Payment List
```bash
curl -X GET http://localhost:8004/api/finance/direct-payments/ \
  -H "Authorization: Bearer YOUR_SESSION_KEY"
```

### Test Customer Summary
```bash
curl -X GET http://localhost:8004/api/finance/customers/1/payment-summary/ \
  -H "Authorization: Bearer YOUR_SESSION_KEY"
```

## Benefits

1. **Flexibility**: Record any type of payment without invoice constraints
2. **Compliance**: Full TDS support with section tracking
3. **Transparency**: Clear payment purpose and tracking
4. **Efficiency**: Quick payment recording without invoice creation
5. **Reporting**: Comprehensive customer payment summaries

## Migration Details

**Migration File:** `backend/finance/migrations/0037_add_direct_customer_payment.py`

**Changes:**
- Added `payment_type` field to Payment model
- Added `payment_purpose` field to Payment model
- Made `invoice` and `proforma_invoice` fields optional
- Updated model constraints and help text

## Backward Compatibility

- All existing payments automatically have `payment_type='invoice'`
- No changes to existing invoice payment workflow
- Direct payments are completely separate from invoice payments
- No impact on existing reports or analytics

## Future Enhancements

1. **Payment Categories**: Predefined categories for common purposes
2. **Approval Workflow**: Multi-level approval for direct payments
3. **Bulk Import**: Import multiple direct payments from CSV
4. **Payment Templates**: Save common payment configurations
5. **Advanced Reporting**: Dedicated reports for direct payments
6. **Customer Portal**: Allow customers to view their direct payments

## Support

For issues or questions:
1. Check the logs: `backend/logs/`
2. Review API responses for error details
3. Verify database migration status
4. Check session authentication

## Security Notes

- All endpoints require valid session authentication
- Payments are company-scoped (multi-tenant safe)
- Audit trail maintained with created_by field
- Deletion requires confirmation
- TDS calculations are server-side validated
