# 🚀 QUICK DEPLOYMENT GUIDE

## What Was Fixed

1. ✅ **Status Update**: Proforma/Invoice/PO status now updates to 'sent' after email
2. ✅ **Currency Icons**: All $ replaced with ₹ (40 files)

## Deploy in 3 Steps

### Step 1: Restart Backend
```bash
cd /var/www/SAP-Python/backend
source venv/bin/activate
sudo systemctl restart gunicorn
# OR if using dev server:
# pkill -f "python manage.py runserver" && python manage.py runserver 0.0.0.0:8000 &
```

### Step 2: Rebuild Frontend (if needed)
```bash
cd /var/www/SAP-Python/frontend
pnpm build
# OR if using dev server, just refresh browser
```

### Step 3: Test
1. Go to Finance → Proforma Invoices
2. Click "Send Email" on PRO-26-008
3. Enter email and send
4. ✅ Status should change from 'draft' to 'sent'

## Verification

Run this to verify all changes are in place:
```bash
cd /var/www/SAP-Python
echo "Backend email_utils usage:" && grep -c "from .email_utils import send" backend/finance/viewsets.py
echo "Status update calls:" && grep -c "save(update_fields=\['status'\])" backend/finance/viewsets.py
echo "Currency icons:" && grep -c "IndianRupee" frontend/src/pages/services/finance/components/ProformaInvoiceList.tsx
```

Expected output:
- Backend email_utils usage: 3
- Status update calls: 3
- Currency icons: 2 (or more)

## Files Modified

**Backend (1 file):**
- `/backend/finance/viewsets.py`

**Frontend (40 files):**
- All DollarSign → IndianRupee

## No Database Changes
No migrations needed. Just restart services!

---

**Ready to deploy!** 🎉
