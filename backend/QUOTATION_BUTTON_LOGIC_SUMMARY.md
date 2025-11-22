# Quotation Button State Logic Implementation

## Overview
Implemented business logic to disable buttons on quotations based on the workflow path chosen by the user.

## Business Requirement
From one quotation, only ONE path should be active:
- **Path 1**: Quotation → PO → Invoice (disable "Raise Invoice" on quotation)
- **Path 2**: Quotation → Invoice directly (disable "Create PO" on quotation)

## Implementation Details

### 1. Model Changes (finance/models.py)

#### Existing Fields (already in database):
- `invoice_created`: Boolean field tracking if invoice was created directly from quotation
- `po_created`: Boolean field tracking if PO was created from quotation
- `invoice_created_at`: Timestamp when invoice was created from quotation
- `po_created_at`: Timestamp when PO was created from quotation

#### New Properties Added:
```python
@property
def can_create_po(self):
    """Check if PO can be created from this quotation"""
    # Can create PO only if no invoice has been created directly from quotation
    return not self.invoice_created

@property
def can_raise_invoice_directly(self):
    """Check if invoice can be raised directly from quotation"""
    # Can raise invoice directly only if no PO has been created from quotation
    return not self.po_created
```

### 2. Automatic State Updates

#### PurchaseOrder.save() method:
```python
# Mark quotation as having PO created (only for new POs)
if is_new and self.quotation:
    self.quotation.po_created = True
    self.quotation.po_created_at = timezone.now()
    self.quotation.save(update_fields=['po_created', 'po_created_at'])
```

#### Invoice.save() method:
```python
# Mark quotation as having invoice created (only for new invoices created directly from quotation)
if is_new and self.quotation and not self.purchase_order:
    self.quotation.invoice_created = True
    self.quotation.invoice_created_at = timezone.now()
    self.quotation.save(update_fields=['invoice_created', 'invoice_created_at'])
```

### 3. Serializer Updates (finance/serializers.py)

#### QuotationListSerializer:
```python
can_create_po = serializers.ReadOnlyField()
can_raise_invoice_directly = serializers.ReadOnlyField()

fields = [
    # ... existing fields ...
    'can_create_po', 'can_raise_invoice_directly', 'po_created', 'invoice_created'
]
```

#### QuotationDetailSerializer:
```python
can_create_po = serializers.ReadOnlyField()
can_raise_invoice_directly = serializers.ReadOnlyField()

read_only_fields = [
    # ... existing fields ...
    'can_create_po', 'can_raise_invoice_directly'
]
```

## API Response Format

### Quotation List/Detail Response:
```json
{
    "id": 1,
    "quotation_number": "QUO-2025-000001",
    "customer_name": "Customer Name",
    "total_amount": "1000.00",
    "po_created": false,
    "invoice_created": false,
    "can_create_po": true,
    "can_raise_invoice_directly": true,
    // ... other fields
}
```

## Frontend Integration

### Button State Logic:
```javascript
// Create PO Button
const canCreatePO = quotation.can_create_po;
<button disabled={!canCreatePO}>Create PO</button>

// Raise Invoice Button  
const canRaiseInvoice = quotation.can_raise_invoice_directly;
<button disabled={!canRaiseInvoice}>Raise Invoice</button>
```

### User Experience:
1. **Initial State**: Both buttons enabled
2. **After creating PO**: "Raise Invoice" button disabled, user must go to PO to create invoices
3. **After creating direct invoice**: "Create PO" button disabled, user continues with invoice workflow

## Workflow States

### State 1: New Quotation
- `po_created`: false
- `invoice_created`: false
- `can_create_po`: true ✅
- `can_raise_invoice_directly`: true ✅
- **UI**: Both buttons enabled

### State 2: PO Created from Quotation
- `po_created`: true
- `invoice_created`: false
- `can_create_po`: true ✅
- `can_raise_invoice_directly`: false ❌
- **UI**: Only "Create PO" enabled, "Raise Invoice" disabled

### State 3: Invoice Created Directly from Quotation
- `po_created`: false
- `invoice_created`: true
- `can_create_po`: false ❌
- `can_raise_invoice_directly`: true ✅
- **UI**: Only "Raise Invoice" enabled, "Create PO" disabled

## Testing

### Test Results:
```
📋 Testing Quotation: EXMTS-QT-2025-26-005
   Customer: ilayaraja
   Total Amount: ₹1180.00

🔍 Initial State:
   po_created: False
   invoice_created: False
   can_create_po: True
   can_raise_invoice_directly: True

✅ Business Logic Test:
   ✓ Both buttons should be ENABLED
   ✓ User can choose either path

🎯 Expected Frontend Behavior:
   Create PO Button: ENABLED
   Raise Invoice Button: ENABLED
```

## Benefits

1. **Prevents Confusion**: Users can't accidentally create both PO and direct invoice from same quotation
2. **Clear Workflow**: Once a path is chosen, the system guides the user through that specific workflow
3. **Data Integrity**: Ensures consistent business logic across the application
4. **Better UX**: Clear visual indication of available actions

## Migration Status
✅ **No migration required** - All necessary fields already exist in the database.

## Files Modified
1. `/backend/finance/models.py` - Added properties and save method updates
2. `/backend/finance/serializers.py` - Updated serializers to include button state fields
3. `/backend/test_quotation_buttons.py` - Test script to verify implementation

## Next Steps for Frontend
1. Update quotation list/detail components to use `can_create_po` and `can_raise_invoice_directly` fields
2. Disable buttons based on these boolean values
3. Show appropriate tooltips/messages when buttons are disabled
4. Test the complete workflow from quotation to invoice creation