# Where is the Direct Payment Button? - Visual Guide

## Location: Invoice List & Proforma Invoice List

The **Direct Payment** button appears in the **Actions** column of both Invoice and Proforma Invoice lists.

## Visual Location

### Invoice List
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Invoice #  │ Customer    │ Description │ Amount  │ Status  │ Actions         │
├──────────────────────────────────────────────────────────────────────────────┤
│ INV-001    │ ABC Corp    │ 3 items     │ ₹5,000  │ Unpaid  │ [₹] [💵] [👁]  │
│ 2025-01-15 │ CUST-001    │ Due: Jan 30 │         │         │ [📧] [📥] [✏️] │
│            │ Project A   │             │         │         │ [❌]            │
└──────────────────────────────────────────────────────────────────────────────┘
                                                        ↑
                                              Direct Payment Button
                                              (Purple $ icon)
```

### Proforma Invoice List
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Proforma # │ Customer    │ Amount  │ Status  │ Date       │ Actions         │
├──────────────────────────────────────────────────────────────────────────────┤
│ PI-001     │ XYZ Ltd     │ ₹10,000 │ Unpaid  │ 2025-01-15 │ [₹] [💵] [📥]  │
│ 3 items    │ CUST-002    │         │         │            │ [📧] [❌]       │
└──────────────────────────────────────────────────────────────────────────────┘
                                                        ↑
                                              Direct Payment Button
                                              (Purple $ icon)
```

## Button Appearance

### Color & Icon
- **Color**: Purple (`text-purple-600`)
- **Icon**: DollarSign ($)
- **Position**: Second button in Actions column (after green ₹ button)

### Button States

#### 1. Unpaid Invoice/Proforma
```
Actions: [₹] [💵] [👁] [📧] [📥] [✏️] [❌]
         ↑    ↑
      Update  Direct
      Payment Payment
```

#### 2. Partially Paid Invoice
```
Actions: [₹] [💵] [👁] [📧] [📥]
         ↑    ↑
      Update  Direct
      Payment Payment
```

#### 3. Fully Paid Invoice (NO Direct Payment button)
```
Actions: [👁] [📥]
```

#### 4. Rejected Invoice (NO Direct Payment button)
```
Actions: [👁] [➕]
```

## How to Find It

### Step 1: Navigate to Finance Module
```
Dashboard → Finance → Invoices
                  OR
Dashboard → Finance → Proforma Invoices
```

### Step 2: Look at Actions Column
The Actions column is the **rightmost column** in the table.

### Step 3: Identify the Purple $ Button
- It's the **second button** from the left
- Has a **purple color** (different from green ₹)
- Shows **$ icon** (DollarSign)

## Hover Tooltips

When you hover over the buttons, you'll see:

| Button | Tooltip |
|--------|---------|
| 🟢 ₹ | "Update Payment (Invoice-based)" |
| 🟣 $ | "Direct Payment (No Invoice)" |

## What Happens When You Click

### Click Direct Payment Button ($)
1. Modal opens with title "Direct Customer Payment"
2. Customer name is pre-filled
3. Form shows:
   - Payment Purpose field
   - Amount field
   - Payment Method dropdown
   - TDS options
   - Bank details
   - Notes

### Example Modal
```
┌────────────────────────────────────────────────────┐
│  💵 Direct Customer Payment                    ✕   │
│     Customer: ABC Corporation (ID: 123)            │
├────────────────────────────────────────────────────┤
│  ℹ️ Direct Payment: Record payments without an    │
│     invoice - for memos, penalties, incentives     │
├────────────────────────────────────────────────────┤
│  Payment Purpose: [                            ]   │
│  Payment Date:    [2025-01-15]                     │
│  Amount:          [                            ]   │
│  Payment Method:  [Bank Transfer ▼]                │
│                                                    │
│  ☐ TDS Applicable                                 │
│                                                    │
│                    [Cancel] [💵 Create Payment]   │
└────────────────────────────────────────────────────┘
```

## Troubleshooting

### "I don't see the Direct Payment button"

**Check these:**

1. ✅ **Are you on the right page?**
   - Must be on Invoice List or Proforma Invoice List
   - Not on Invoice Detail view

2. ✅ **Is the invoice/proforma in the right state?**
   - Button appears for: Unpaid, Partially Paid
   - Button DOES NOT appear for: Fully Paid, Rejected

3. ✅ **Check the Actions column**
   - Scroll right if table is wide
   - Look for purple $ icon

4. ✅ **Browser zoom level**
   - If zoomed in too much, buttons might be cut off
   - Try zooming out (Ctrl + -)

5. ✅ **Clear browser cache**
   ```bash
   Ctrl + Shift + R (Windows/Linux)
   Cmd + Shift + R (Mac)
   ```

### "Button is there but not working"

**Try these:**

1. Check browser console for errors (F12)
2. Verify you're logged in (session not expired)
3. Refresh the page
4. Check if backend is running:
   ```bash
   curl http://localhost:8004/api/finance/direct-payments/
   ```

## Screenshots Reference

### Full Invoice List View
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 🔍 Search: [                                    ] [Filter ▼] [Refresh] [Clear]      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  Invoice #     │ Customer      │ Description │ Amount    │ Status   │ Actions      │
│  ─────────────────────────────────────────────────────────────────────────────────  │
│  INV-2025-001  │ ABC Corp      │ 3 items     │ ₹5,000    │ Unpaid   │ ₹ $ 👁 📧   │
│  2025-01-15    │ CUST-001      │ Due: Jan 30 │ Out: 5000 │          │ 📥 ✏️ ❌    │
│                │ Project Alpha │             │           │          │              │
│  ─────────────────────────────────────────────────────────────────────────────────  │
│  INV-2025-002  │ XYZ Limited   │ 5 items     │ ₹15,000   │ Partial  │ ₹ $ 👁 📧   │
│  2025-01-14    │ CUST-002      │ Due: Jan 28 │ Out: 7500 │          │ 📥          │
│                │ Site B        │             │           │          │              │
│  ─────────────────────────────────────────────────────────────────────────────────  │
│  INV-2025-003  │ DEF Inc       │ 2 items     │ ₹8,000    │ Paid     │ 👁 📥       │
│  2025-01-13    │ CUST-003      │ Due: Jan 27 │ Out: 0    │          │              │
│                │               │             │           │          │              │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                                              ↑
                                                    Direct Payment Button
                                                    (Purple $ - second button)
```

## Quick Access Path

```
Login → Dashboard → Finance → Invoices → Actions Column → Purple $ Button
                                    OR
Login → Dashboard → Finance → Proforma Invoices → Actions Column → Purple $ Button
```

## Summary

**Location**: Actions column (rightmost) in Invoice/Proforma Invoice lists  
**Appearance**: Purple $ icon, second button after green ₹  
**Visibility**: Shows for Unpaid and Partially Paid invoices only  
**Function**: Opens modal to create direct customer payment without invoice  

---

**Still can't find it?** 
- Make sure you've run the setup: `./setup_direct_payment.sh`
- Restart services: `./restart_services.sh`
- Clear browser cache and refresh
