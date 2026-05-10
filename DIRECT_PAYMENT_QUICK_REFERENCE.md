# Direct Customer Payment - Quick Reference

## 🚀 Quick Start

```bash
# Setup (one-time)
cd /var/www/SAP-Python
./setup_direct_payment.sh
./restart_services.sh
```

## 📋 Common Use Cases

| Purpose | Example | TDS? |
|---------|---------|------|
| **Penalty** | Late delivery penalty | Optional |
| **Incentive** | Early payment discount | Yes (2%) |
| **Memo** | Debit/Credit memo | Optional |
| **Complimentary** | Goodwill credit | No |
| **Advance** | General advance | Optional |

## 🔌 API Quick Reference

### Create Payment
```bash
POST /api/finance/direct-payments/create/
{
  "customer_id": 123,
  "payment_purpose": "Penalty",
  "payment_date": "2025-01-15",
  "amount": 5000,
  "payment_method": "bank_transfer",
  "tds_applicable": true,
  "tds_rate": 2.0
}
```

### List Payments
```bash
GET /api/finance/direct-payments/
GET /api/finance/direct-payments/?customer_id=123
```

### Customer Summary
```bash
GET /api/finance/customers/123/payment-summary/
```

## 💻 Frontend Component

**Location:** `frontend/src/pages/services/finance/pages/DirectCustomerPayment.tsx`

**Features:**
- ✅ Create direct payments
- ✅ Auto TDS calculation
- ✅ Customer filtering
- ✅ Payment history
- ✅ Delete payments

## 🎯 Payment Methods

- `bank_transfer` - Bank Transfer
- `cash` - Cash
- `cheque` - Cheque
- `upi` - UPI
- `rtgs` - RTGS
- `neft` - NEFT
- `imps` - IMPS
- `other` - Other

## 📊 TDS Sections

Common TDS sections for direct payments:
- `194C` - Contractors (1-2%)
- `194J` - Professional services (10%)
- `194H` - Commission (5%)
- `194I` - Rent (10%)

## 🔍 Key Differences

| Feature | Invoice Payment | Direct Payment |
|---------|----------------|----------------|
| **Invoice Required** | ✅ Yes | ❌ No |
| **Purpose** | Fixed (invoice) | Flexible |
| **TDS Support** | ✅ Yes | ✅ Yes |
| **Payment Number** | Auto | Auto |
| **Customer Link** | ✅ Yes | ✅ Yes |

## ⚡ Quick Tips

1. **TDS Auto-calculation**: Enable TDS checkbox and enter rate - amount calculates automatically
2. **Payment Purpose**: Be specific (e.g., "Penalty for late delivery as per clause 5.2")
3. **Reference Numbers**: Always add bank reference for tracking
4. **Customer Summary**: View combined invoice + direct payments per customer
5. **Deletion**: Only delete if payment was recorded in error

## 🛠️ Troubleshooting

**Migration Error?**
```bash
cd backend
source venv/bin/activate
python manage.py migrate finance --fake 0037
python manage.py migrate finance
```

**API Not Working?**
- Check session key is valid
- Verify customer_id exists
- Ensure amount is positive number

**Frontend Not Loading?**
- Check API_BASE_URL in .env
- Verify component is imported in routes
- Check browser console for errors

## 📞 Support

- **Full Docs**: `DIRECT_PAYMENT_FEATURE.md`
- **Implementation**: `DIRECT_PAYMENT_IMPLEMENTATION.md`
- **Backend**: `backend/finance/direct_payment_views.py`
- **Frontend**: `frontend/src/pages/services/finance/pages/DirectCustomerPayment.tsx`

## ✅ Testing Checklist

- [ ] Create payment via UI
- [ ] Verify TDS calculation
- [ ] Check payment appears in list
- [ ] Filter by customer works
- [ ] Customer summary shows payment
- [ ] Delete payment works
- [ ] Payment number auto-generated

---

**Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Production Ready ✅
