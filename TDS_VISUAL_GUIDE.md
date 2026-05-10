# TDS-Only Payment - Visual Guide

## Simple 2-Tab System

```
┌─────────────────────────────────────────────────────────┐
│ Payment Manager                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Payment Tab] [TDS Tab] ← Two separate tabs           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Tab 1: Payment Tab (For Cash/Main Payments)

```
┌─────────────────────────────────────────────────────────┐
│ [Payment] [TDS]                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ New Payment                                             │
│                                                         │
│ Date: [2025-01-15]                                      │
│ Amount Received: [95000]                                │
│ Method: [Bank Transfer ▼]                               │
│ Reference: [UTR123456]                                  │
│ Notes: [Main payment]                                   │
│                                                         │
│ [Record Payment] (Blue)                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Use this tab for:** Recording cash/main payments

---

## Tab 2: TDS Tab (For TDS Payments) ⭐

```
┌─────────────────────────────────────────────────────────┐
│ [Payment] [TDS]                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ TDS Outstanding: ₹5,000                                 │
│                                                         │
│ [+ Add TDS Entry] ← Click this                          │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Date: [2025-01-15]                              │   │
│ │ Amount: [5000] (max ₹5,000)                     │   │
│ │ Challan No.: [BSR123456]                        │   │
│ │ Form 16A No.: [Optional]                        │   │
│ │ ☐ Form 16A already received                     │   │
│ │                                                 │   │
│ │ [Save TDS Entry] [Cancel]                       │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Use this tab for:** Recording TDS payments independently

---

## How to Record TDS Separately

### Step-by-Step

```
1. Open Invoice
   ↓
2. Click "Update Payment"
   ↓
3. Click "TDS" tab (not Payment tab)
   ↓
4. Click "+ Add TDS Entry"
   ↓
5. Fill in:
   - Date: When TDS was paid
   - Amount: TDS amount (e.g., ₹5,000)
   - Challan No.: Government challan number
   ↓
6. Click "Save TDS Entry"
   ↓
7. ✅ Done! TDS recorded independently
```

---

## Real-World Example

### Invoice: ₹1,00,000 (TDS 5% = ₹5,000)

#### Day 1: Customer Pays TDS to Government

```
You:
1. Open invoice
2. Go to TDS tab
3. Add TDS Entry: ₹5,000
4. Challan: BSR123456
5. Save

Result:
✅ TDS recorded
📊 Outstanding: ₹95,000 (waiting for main payment)
```

#### Day 7: Customer Pays Main Amount to You

```
You:
1. Open same invoice
2. Go to Payment tab
3. Record Payment: ₹95,000
4. Reference: Bank Transfer UTR789
5. Save

Result:
✅ Invoice fully paid
📊 Outstanding: ₹0
🎉 Complete!
```

---

## Key Points

### ✅ What You CAN Do

- Record TDS from TDS tab **anytime**
- Record TDS **before** main payment
- Record TDS **without** main payment
- Record multiple TDS entries
- Record main payment later from Payment tab

### ❌ What You DON'T Need

- No checkbox to check
- No dependency on cash payment
- No complicated steps
- No "record payment first" message

---

## Quick Reference

| What | Where | Button |
|------|-------|--------|
| **TDS Payment** | TDS Tab | Orange "Save TDS Entry" |
| **Main Payment** | Payment Tab | Blue "Record Payment" |

---

## That's It!

Simple, straightforward, no complications. Just use the TDS tab to record TDS independently.

**Remember:**
- TDS Tab = For TDS payments (independent)
- Payment Tab = For cash/main payments

---

**Need Help?**
- See: `TDS_SIMPLE_FIX.md` for quick overview
- See: `TDS_ONLY_PAYMENT_FEATURE.md` for detailed guide
