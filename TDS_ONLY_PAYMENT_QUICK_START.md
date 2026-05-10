# TDS-Only Payment - Quick Start Guide

## 🚀 Start Using TDS-Only Payments Now!

### What You Can Do Now

✅ Record TDS payments **before** the main payment  
✅ Record TDS payments **separately** from the main payment  
✅ Record TDS payments **together** with the main payment  

---

## 📋 How to Use (3 Simple Steps)

### Option 1: TDS Paid in Advance

**Step 1: Record TDS Payment**
1. Open invoice → Click "Update Payment"
2. ☑ Check "TDS-Only Payment" checkbox
3. Enter TDS amount (e.g., ₹5,000)
4. Enter reference (e.g., TDS Challan #12345)
5. Click orange "Record TDS Payment" button
6. ✅ Done! Outstanding shows ₹95,000

**Step 2: Record Main Payment (Later)**
1. Open same invoice → Click "Update Payment"
2. ☐ Uncheck "TDS-Only Payment" checkbox
3. Enter amount (e.g., ₹95,000)
4. Enter reference (e.g., Bank Transfer #67890)
5. Click blue "Record Payment" button
6. ✅ Done! Invoice fully paid

---

### Option 2: Combined Payment (Traditional)

**Single Step:**
1. Open invoice → Click "Update Payment"
2. ☐ Leave "TDS-Only Payment" unchecked
3. Enter full amount (e.g., ₹1,00,000)
4. System auto-calculates TDS
5. Click blue "Record Payment" button
6. ✅ Done! Invoice fully paid in one go

---

## 🎯 Visual Guide

### Finding the TDS-Only Checkbox

```
┌─────────────────────────────────────┐
│ Payment Manager                     │
├─────────────────────────────────────┤
│ New Payment                         │
│                                     │
│ ☐ TDS-Only Payment  ← CHECK THIS!  │
│   (Customer pays TDS separately)    │
│                                     │
│ Date: [________]                    │
│ TDS Amount: [________]              │
│ Method: [Bank Transfer ▼]           │
│ Reference: [________]               │
│                                     │
│ [Record TDS Payment] ← ORANGE!      │
└─────────────────────────────────────┘
```

---

## 🔍 Quick Comparison

| What You Want | Checkbox | Amount Field | Button Color |
|---------------|----------|--------------|--------------|
| **TDS Only** | ☑ Checked | TDS Amount | 🟠 Orange |
| **Main Payment** | ☐ Unchecked | Amount Received | 🔵 Blue |
| **Combined** | ☐ Unchecked | Full Amount | 🔵 Blue |

---

## ⚡ Common Scenarios

### Scenario A: Customer Pays TDS First
```
Day 1: ☑ TDS-Only → ₹5,000 → Orange button
Day 7: ☐ Regular → ₹95,000 → Blue button
Result: ✅ Invoice paid
```

### Scenario B: Customer Pays Everything Together
```
Day 1: ☐ Regular → ₹1,00,000 → Blue button
Result: ✅ Invoice paid (TDS auto-calculated)
```

### Scenario C: Customer Pays TDS Separately Same Day
```
Payment 1: ☑ TDS-Only → ₹5,000 → Orange button
Payment 2: ☐ Regular → ₹95,000 → Blue button
Result: ✅ Invoice paid
```

---

## ❓ FAQ

**Q: Can I record TDS before the main payment?**  
A: ✅ Yes! Check the "TDS-Only Payment" checkbox.

**Q: Will the old way still work?**  
A: ✅ Yes! Leave the checkbox unchecked for traditional combined payments.

**Q: What if I make a mistake?**  
A: You can delete the payment and record it again.

**Q: How do I know it's TDS-only mode?**  
A: The button turns orange and says "Record TDS Payment".

**Q: Can I record multiple TDS payments?**  
A: ✅ Yes! Record as many as needed until TDS is fully paid.

---

## 🎨 Color Guide

| Color | Meaning |
|-------|---------|
| 🟠 Orange Button | TDS-Only Payment |
| 🔵 Blue Button | Regular Payment |
| 🟢 Green Badge | Fully Paid |
| 🟡 Yellow Badge | Partially Paid |
| 🔴 Red Badge | Unpaid |

---

## 📱 Mobile Users

The feature works the same on mobile:
1. Tap invoice
2. Tap "Update Payment"
3. Check/uncheck TDS-Only checkbox
4. Fill in details
5. Tap the button (orange or blue)

---

## 🆘 Need Help?

### Quick Checks
- ✅ Is TDS configured on the invoice? (Check TDS Config panel)
- ✅ Is the checkbox visible? (Only shows if TDS is applicable)
- ✅ Is the amount within limits? (Check max amount shown)
- ✅ Is the button orange? (Means TDS-only mode is active)

### Still Stuck?
See detailed documentation:
- `TDS_ONLY_PAYMENT_FEATURE.md` - Full guide
- `TDS_ONLY_PAYMENT_QUICK_REFERENCE.md` - Quick reference
- `TDS_ONLY_PAYMENT_FLOW_DIAGRAM.md` - Visual diagrams

---

## ✨ Pro Tips

1. **Use TDS-Only for advance payments**: When customer pays TDS before main payment
2. **Use Regular for combined**: When customer pays everything together
3. **Check the button color**: Orange = TDS-only, Blue = Regular
4. **Add clear references**: Use challan numbers for TDS, UTR for bank transfers
5. **Track in payment history**: All payments show up with clear labels

---

## 🎉 You're Ready!

That's it! You can now record TDS payments separately and in advance. The system handles all the calculations automatically.

**Remember:**
- ☑ Checkbox = TDS-Only (Orange button)
- ☐ No checkbox = Regular (Blue button)

Happy recording! 🚀

---

**Quick Links:**
- Full Documentation: `TDS_ONLY_PAYMENT_FEATURE.md`
- Technical Details: `TDS_ONLY_PAYMENT_COMPLETE_SUMMARY.md`
- Visual Guide: `TDS_ONLY_PAYMENT_FLOW_DIAGRAM.md`
