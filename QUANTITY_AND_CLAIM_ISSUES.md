# Quantity Field and PO-to-Invoice Issues

## Issue 1: Cannot Delete Default '1' in Quantity Field

**Problem:**
- When entering quantity, the default value '1' cannot be deleted directly
- User must enter another number first, then delete the '1'
- This is annoying UX

**Root Cause:**
- Number input fields with `value={quantity || 1}` always show '1' even when empty
- The `|| 1` fallback prevents empty string

**Solution:**
- Change from: `value={item.quantity || 1}`
- Change to: `value={item.quantity === 0 ? '' : item.quantity}`
- Or use: `value={item.quantity}`
- Allow empty string, then convert to number on blur/submit

**Files to Fix:**
- DirectCreateTaxInvoiceModal.tsx
- DirectCreateProformaInvoiceModal.tsx
- EditInvoiceModal.tsx
- Any other forms with quantity input

---

## Issue 2: PO to Invoice - Percentage Quantity & Claimed Status Display

**Problem:**
- When raising invoice from PO with percentage quantity, it should display as percentage
- When claiming specific line items, they should show "CLAIMED" status in print/download
- Currently not showing this information

**Requirements:**
1. If PO item quantity is percentage-based → Invoice should show percentage
2. If invoice line item is claimed → Print/download should show "CLAIMED" label
3. Need to track claim type per line item

**Database Changes Needed:**
- Add `claim_type` field to invoice_items (values: 'unit', 'percentage')
- Add `is_claimed` boolean field to invoice_items
- Add `claimed_percentage` field to invoice_items

**Frontend Changes:**
- Invoice form: Add claim type selector per line item
- Invoice print/download: Show "CLAIMED" badge for claimed items
- Show percentage symbol when claim_type is 'percentage'

**Backend Changes:**
- Update InvoiceItem model
- Update serializers
- Update PDF generation templates

---

## Action Plan

### Step 1: Fix Quantity Input (Quick Fix)
Search and replace in all invoice/quotation/PO forms:
- Find: `value={item.quantity || 1}`
- Replace: `value={item.quantity || ''}`
- Add: `onBlur` handler to set minimum 0.01 if empty

### Step 2: Database Migration for Claim Tracking
```sql
ALTER TABLE finance_invoice_items 
ADD COLUMN claim_type VARCHAR(20) DEFAULT 'unit',
ADD COLUMN is_claimed BOOLEAN DEFAULT false,
ADD COLUMN claimed_percentage DECIMAL(5,2) DEFAULT 0;
```

### Step 3: Update Models and Serializers
- Add fields to InvoiceItem model
- Update InvoiceItemSerializer

### Step 4: Update Frontend Forms
- Add claim type dropdown per line item
- Add claimed checkbox per line item
- Show percentage input when claim_type is 'percentage'

### Step 5: Update Print/Download Templates
- Add "CLAIMED" badge in PDF templates
- Show percentage symbol when applicable
- Update invoice print view

---

## Priority
1. **HIGH**: Fix quantity input (affects UX immediately)
2. **MEDIUM**: PO to Invoice claim tracking (business requirement)

Would you like me to proceed with these fixes?
